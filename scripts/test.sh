#!/bin/bash

WS_PROVIDER_URI="ws://localhost:9944" \
PROCESSOR_METRICS_ENDPOINT="http://localhost:3000/metrics" \
PROCESSOR_ENDPOINT_URL="http://localhost:4000/graphql" \
INDEXER_ENDPOINT_URL="http://localhost:8080/v1/graphql" \
npx nyc mocha --timeout 70000 --exit --file ./lib/e2e-tests/setup-e2e.js "lib/e2e-tests/*.test.js"