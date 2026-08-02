ARG PG_VERSION=latest

FROM bitnami/postgresql:${PG_VERSION} AS build

USER root

ARG PGVECTOR_VERSION=0.8.1

RUN install_packages gcc make git binutils glibc-devel linux-api-headers

RUN git clone --depth 1 --branch "v${PGVECTOR_VERSION}" \
      https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && make -C /tmp/pgvector PG_CONFIG=/opt/bitnami/postgresql/bin/pg_config \
    && make -C /tmp/pgvector PG_CONFIG=/opt/bitnami/postgresql/bin/pg_config install

FROM bitnami/postgresql:${PG_VERSION}

USER root

COPY --from=build /opt/bitnami/postgresql/lib/vector.so /opt/bitnami/postgresql/lib/vector.so
COPY --from=build /opt/bitnami/postgresql/share/extension/vector* /opt/bitnami/postgresql/share/extension/

USER 1001
