import * as api from '@actual-app/api';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const apply = process.argv.includes('--apply');
const bankEnabled = process.env.BANK_SYNC_ENABLED === 'true';
const okxEnabled = process.env.OKX_SYNC_ENABLED === 'true';

const accountName = process.env.OKX_ACCOUNT_NAME || 'OKX Portfolio';

interface OKXValuationResponse {
    code?: string;
    data?: { totalBal?: string; ts?: string }[];
}

interface Valuation {
    cad: number;
    cents: number;
}

function env(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing environment variable: ${name}`);
    }

    return value;
}

function number(value: unknown, label: string): number {
    if (
        value == null ||
        String(value).trim() === '' ||
        !Number.isFinite(Number(value))
    ) {
        throw new Error(`Invalid ${label}`);
    }

    return Number(value);
}

async function request<T>(
    url: string,
    headers: Record<string, string> = {},
): Promise<T> {
    const response = await fetch(url, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status} from ${new URL(url).hostname}`);
    }

    return (await response.json()) as T;
}

async function getOKXValuation(): Promise<Valuation> {
    const endpoint = '/api/v5/asset/asset-valuation?ccy=CAD';
    const timestamp = new Date().toISOString();

    const signature = crypto
        .createHmac('sha256', env('OKX_API_SECRET'))
        .update(timestamp + 'GET' + endpoint)
        .digest('base64');

    const result = await request<OKXValuationResponse>(
        'https://www.okx.com' + endpoint,
        {
            'OK-ACCESS-KEY': env('OKX_API_KEY'),
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': env('OKX_API_PASSPHRASE'),
        },
    );

    if (result.code !== '0' || result.data?.length !== 1) {
        throw new Error(`OKX request failed: ${result.code || 'unknown'}`);
    }

    const cad = number(result.data[0].totalBal, 'OKX portfolio valuation');
    const updatedAt = number(result.data[0].ts, 'OKX valuation timestamp');

    if (Math.abs(Date.now() - updatedAt) > 3600000) {
        throw new Error('OKX valuation is stale');
    }

    const cents = Math.round(cad * 100);

    if (!Number.isSafeInteger(cents)) {
        throw new Error('Invalid CAD portfolio valuation');
    }

    return { cad, cents };
}

async function withBudget<T>(callback: () => Promise<T>): Promise<T> {
    const dataDir = fs.mkdtempSync(path.join('/cache', 'actual-'));

    let initialized = false;

    try {
        const auth = process.env.ACTUAL_API_KEY
            ? { sessionToken: process.env.ACTUAL_API_KEY }
            : { password: env('ACTUAL_PASSWORD') };

        await api.init({
            dataDir,
            serverURL: env('ACTUAL_URL'),
            ...auth,
        });

        initialized = true;

        await api.downloadBudget(env('ACTUAL_SYNC_ID'), {
            password: env('ACTUAL_ENCRYPTION_PASSWORD'),
        });

        await api.sync();

        return await callback();
    } finally {
        try {
            if (initialized) {
                await api.shutdown();
            }
        } finally {
            fs.rmSync(dataDir, { recursive: true, force: true });
        }
    }
}

async function syncBanks(): Promise<void> {
    console.log('[BANK] Starting SimpleFIN synchronization');

    if (!apply) {
        console.log('[BANK] Preview mode: synchronization skipped');
        return;
    }

    await withBudget(async () => {
        const result = await api.runBankSync();

        await api.sync();

        console.log('[BANK] Synchronization completed');

        console.log({
            newTransactions: result?.newTransactions?.length,
            matchedTransactions: result?.matchedTransactions?.length,
            updatedAccounts: result?.updatedAccounts?.length,
        });
    });
}

function torontoDate(): string {
    const dateParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());

    const part = (type: Intl.DateTimeFormatPartTypes) =>
        dateParts.find(item => item.type === type)!.value;

    return `${part('year')}-${part('month')}-${part('day')}`;
}

async function syncOKX(): Promise<void> {
    console.log('[OKX] Retrieving portfolio valuation');

    const valuation = await getOKXValuation();

    await withBudget(async () => {
        const accounts = (await api.getAccounts()).filter(
            account => account.name === accountName,
        );

        if (accounts.length > 1) {
            throw new Error('Duplicate OKX accounts');
        }

        let accountId = accounts[0]?.id;

        if (accounts[0] && (!accounts[0].offbudget || accounts[0].closed)) {
            throw new Error('OKX account must be open and off-budget');
        }

        const current = accountId ? await api.getAccountBalance(accountId) : 0;

        if (!Number.isSafeInteger(current)) {
            throw new Error('Invalid current Actual balance');
        }

        const delta = valuation.cents - current;

        console.log('[OKX] Valuation retrieved');

        console.log({
            mode: apply ? 'apply' : 'preview',
            accountExists: Boolean(accountId),
            adjustmentRequired: delta !== 0,
        });

        if (!apply) {
            console.log({
                currentCAD: current / 100,
                targetCAD: valuation.cents / 100,
                adjustmentCAD: delta / 100,
            });

            return;
        }

        if (valuation.cents === 0 && current !== 0) {
            throw new Error('Unexpected zero OKX valuation; manual review required');
        }

        if (!accountId) {
            accountId = await api.createAccount(
                { name: accountName, offbudget: true },
                0,
            );
        }

        if (delta === 0) {
            console.log('[OKX] Portfolio already synchronized');
            await api.sync();
            return;
        }

        const payeeName = 'OKX valuation adjustment';

        const payees = (await api.getPayees()).filter(
            payee => payee.name === payeeName,
        );

        if (payees.length > 1) {
            throw new Error('Duplicate OKX valuation payees');
        }

        const payee = payees[0]?.id || (await api.createPayee({ name: payeeName }));

        await api.addTransactions(accountId, [
            {
                date: torontoDate(),
                amount: delta,
                payee,
                cleared: true,
                notes:
                    'OKX portfolio valuation in CAD. ' +
                    'Net valuation change, not necessarily investment return.',
            },
        ]);

        await api.sync();

        const balance = await api.getAccountBalance(accountId);

        if (balance !== valuation.cents) {
            throw new Error('OKX post-sync balance verification failed');
        }

        console.log('[OKX] Portfolio synchronized successfully');
    });
}

async function main(): Promise<void> {
    const failures: string[] = [];

    console.log(`Starting synchronization: ${new Date().toISOString()}`);

    if (bankEnabled) {
        try {
            await syncBanks();
        } catch (error) {
            failures.push('SimpleFIN');
            console.error('[BANK] Failed:', (error as Error).message);
        }
    }

    if (okxEnabled) {
        try {
            await syncOKX();
        } catch (error) {
            failures.push('OKX');
            console.error('[OKX] Failed:', (error as Error).message);
        }
    }

    if (failures.length) {
        throw new Error(`Synchronization failed: ${failures.join(', ')}`);
    }

    console.log('All enabled synchronization tasks completed');
}

main().catch(error => {
    console.error((error as Error).message);
    process.exitCode = 1;
});
