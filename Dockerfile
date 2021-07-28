FROM node:14 AS node


FROM node AS builder
WORKDIR /hydra
ADD package.json .
ADD package-lock.json .
RUN npm ci
ADD src src
ADD tsconfig.json .
RUN npx tsc
ADD resources resources
ADD packing.json .
RUN npx upakovka


FROM node AS indexer
WORKDIR /hydra-indexer
COPY --from=builder /hydra/packages/@subsquid/hydra-indexer/package.json .
RUN npm i
COPY --from=builder /hydra/packages/@subsquid/hydra-indexer/lib lib
ADD scripts/indexer-db.sh /hydra/scripts/
CMD ["npm", "start"]


FROM node AS indexer-status-service
WORKDIR /hydra-indexer-status-service
COPY --from=builder /hydra/packages/@subsquid/hydra-indexer-status-service/package.json .
RUN npm i
COPY --from=builder /hydra/packages/@subsquid/hydra-indexer-status-service/lib lib
CMD ["node", "lib/indexer-status-service.js"]


FROM node AS test
WORKDIR /hydra
COPY --from=builder /hydra/packages/@subsquid/hydra-common/package.json packages/hydra-common/
COPY --from=builder /hydra/packages/@subsquid/hydra-cli/package.json packages/hydra-cli/
COPY --from=builder /hydra/packages/@subsquid/hydra-typegen/package.json packages/hydra-typegen/
COPY --from=builder /hydra/packages/@subsquid/hydra-processor/package.json packages/hydra-proccessor/
RUN echo '{\
    "name": "hydra", \
    "private": true, \
    "workspaces": {\
      "packages": ["packages/*", "packages/hydra-test/mappings"], \
      "nohoist": ["**/hydra-typegen", "**/hydra-typegen/**"]\
    }\
}' > package.json
RUN yarn
COPY --from=builder /hydra/packages/@subsquid/hydra-cli packages/hydra-cli
RUN yarn workspace @subsquid/hydra-cli link
RUN hydra-cli scaffold --dir packages/hydra-test --name hydra-test --silent
COPY --from=builder /hydra/packages/@subsquid/hydra-typegen packages/hydra-typegen
ADD resources/e2e-tests/fixtures packages/hydra-test/
RUN yarn workspace hydra-test codegen
COPY --from=builder /hydra/packages/@subsquid/hydra-common packages/hydra-common
COPY --from=builder /hydra/packages/@subsquid/hydra-processor packages/hydra-proccessor
RUN yarn
WORKDIR /hydra/packages/hydra-test
RUN yarn workspace query-node compile


FROM fedormelexin/graphql-engine-arm64:v2.0.3.cli-migrations-v3 AS indexer-gateway
RUN apt-get -y update \
    && apt-get install -y curl ca-certificates gnupg lsb-release \
    && curl https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
    && echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list \
    && apt-get -y update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-12 postgresql-client-12 \
    && apt-get purge -y curl lsb-release gnupg \
    && apt-get -y autoremove \
    && apt-get -y clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/share/doc/ \
    && rm -rf /usr/share/man/ \
    && rm -rf /usr/share/locale/
RUN mv /bin/docker-entrypoint.sh /bin/hasura-entrypoint.sh
ADD indexer-gateway/metadata /hasura-metadata/
ADD indexer-gateway/docker-entrypoint.sh .
ENTRYPOINT [ "/docker-entrypoint.sh" ]
EXPOSE 8080