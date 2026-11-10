FROM nousresearch/hermes-agent:latest@sha256:276d44685c65c0cb2a25f190b63c65c8906f9dc76486fb1c05ae71b5826bda08

USER root

ARG KUBECTL_VERSION=v1.30.3

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        csvkit \
        jq \
        ocrmypdf \
        pandoc \
        poppler-utils \
        python3-openpyxl \
        p7zip-full \
        unzip \
        vim \
        yq \
        zip \
        tesseract-ocr-rus \
        libreoffice-writer \
        libreoffice-calc \
        python3-docx \
        python3-pypdf \
        python3-reportlab \
        fonts-dejavu-core \
        fonts-liberation \
        fonts-crosextra-carlito \
        fonts-crosextra-caladea \
        fontconfig \
        tzdata \
    && curl -fsSLo /usr/local/bin/kubectl \
        "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/$(dpkg --print-architecture)/kubectl" \
    && chmod 0755 /usr/local/bin/kubectl \
    && kubectl version --client \
    && csvcut --version \
    && jq --version \
    && ocrmypdf --version \
    && pandoc --version \
    && pdftotext -v \
    && /usr/bin/python3 -c 'import docx, openpyxl, pypdf, reportlab' \
    && tesseract --list-langs \
    && libreoffice --headless --version \
    && fc-match Carlito \
    && fc-match Caladea \
    && 7z | head -n 1 \
    && unzip -v \
    && yq --version \
    && zip -v \
    && rm -rf /var/lib/apt/lists/*

USER hermes
