# Bimos K3s Images

Vendored container images for the Bimos k3s environment.

## Images

| Image | Package | Purpose |
| --- | --- | --- |
| Hermes | `ghcr.io/deezzir/hermes` | Hermes Agent with Kubernetes, PDF, OCR, document conversion, spreadsheet, CSV, and archive tools. |

`kubectl` availability does not grant Kubernetes access. Grant the deployment only the required permissions through its ServiceAccount and RBAC bindings.

## Publishing

GitHub Actions publishes each changed image directory on pushes to `main` for `linux/amd64` and `linux/arm64`. Published images receive:

- `ghcr.io/deezzir/<image>:latest`
- `ghcr.io/deezzir/<image>:sha-<commit>`

Run the `Build And Push Images` workflow manually to publish `all` catalog images or a specific image name.

## Dependency Updates

Renovate tracks Docker base-image digests and creates review-only pull requests. It never automerges. Merging an update rebuilds the affected image.
