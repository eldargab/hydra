#!/bin/bash


trap 'on_exit $?' EXIT; on_exit() {
    if [ "$1" != "0" ]; then
        echo "## Processor Logs ##"
        docker logs env_hydra-processor_1 --tail 50

        echo "## Query Node Logs ##"
        docker logs env_query-node_1 --tail 50

        echo "## Indexer Logs ##"
        docker logs env_hydra-indexer_1 --tail 50

        echo "## Indexer API Server ##"
        docker logs env_hydra-indexer-gateway_1 --tail 50
    fi
    docker-compose -f env/e2e-test-compose.yml down
}


docker-compose -f env/e2e-test-compose.yml up -d --build || exit 1


RUNNER="$(docker build . --target builder -q)" || exit 1


function wait-until {
    local attempt_counter=0
    local max_attempts=50
    until $(eval "$1"); do
        if [ ${attempt_counter} -eq ${max_attempts} ];then
            echo "Max attempts reached"
            exit 1
        fi
        printf '.'
        attempt_counter=$(($attempt_counter+1))
        sleep 5
    done
}


echo -n "Waiting for the processor to start grinding"
wait-until "curl -fs http://localhost:3000/metrics/hydra_processor_last_scanned_block > /dev/null"


docker run --rm \
    --network env_default \
    --name hydra-e2e-test-runner \
    -e WS_PROVIDER_URI="ws://node-template:9944" \
    -e PROCESSOR_METRICS_ENDPOINT="http://hydra-processor:3000/metrics" \
    -e PROCESSOR_ENDPOINT_URL="http://query-node:4000/graphql" \
    -e INDEXER_ENDPOINT_URL="http://hydra-indexer-gateway:8080/v1/graphql" \
    "$RUNNER" \
    npx nyc mocha --timeout 70000 --exit --file ./lib/e2e-tests/setup-e2e.js "lib/e2e-tests/*.test.js"