#!/bin/bash

relative_path() {
  node -p -e "require('path').relative('$1', '$2')"
}

ln-s() {
  rm -f "$2" && ln -s "$(relative_path "$(dirname "$2")" "$1")" "$2"
}

e2e() {
  WS_PROVIDER_URI="ws://localhost:9944" \
  PROCESSOR_METRICS_ENDPOINT="http://localhost:3000/metrics" \
  PROCESSOR_ENDPOINT_URL="http://localhost:4000/graphql" \
  INDEXER_ENDPOINT_URL="http://localhost:8080/v1/graphql" \
  npx nyc mocha --timeout 70000 --exit --file ./lib/e2e-tests/setup-e2e.js "lib/e2e-tests/*.test.js"
}

requested=("$@")
if [ ${#requested[@]} -eq 0  ]; then
  requested=(cli typegen processor)
fi

tests=()
for t in "${requested[@]}"; do
  case $t in
  cli)
    ln-s resources/cli/snapshots/helpers lib/cli/test/helpers/__snapshots__ || exit 1
    tests+=("lib/cli/test/**/*.test.js")
    ;;
  typegen)
    tests+=("lib/typegen/test/*.spec.js")
    ;;
  processor)
    tests+=("lib/processor/test/*.spec.js")
    ;;
  e2e)
    e2e || exit 1
    ;;
  esac
done

npx nyc mocha --forbid-only "${tests[@]}"