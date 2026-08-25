FROM nousresearch/hermes-agent:latest@sha256:5c76f1310c02d0f4c8fd516931556d05cbe1a3e41a93584ae0864df631cf8fe7

USER root

ARG KUBECTL_VERSION=v1.30.3

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        csvkit \
        ocrmypdf \
        pandoc \
        poppler-utils \
        python3-openpyxl \
        p7zip-full \
        unzip \
        vim \
        zip \
    && curl -fsSLo /usr/local/bin/kubectl \
        "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/$(dpkg --print-architecture)/kubectl" \
    && chmod 0755 /usr/local/bin/kubectl \
    && kubectl version --client \
    && csvcut --version \
    && ocrmypdf --version \
    && pandoc --version \
    && pdftotext -v \
    && /usr/bin/python3 -c 'import openpyxl' \
    && 7z | head -n 1 \
    && unzip -v \
    && zip -v \
    && rm -rf /var/lib/apt/lists/*

USER hermes
