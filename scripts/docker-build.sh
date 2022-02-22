#!/bin/bash

. scripts/base-images.sh

docker build . \
    --build-arg HASURA="$HYDRA_HASURA_BASE" \
    "$@"
