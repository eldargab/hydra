#!/bin/sh

create() {
    npx createdbjs --user="${DB_USER}" --password="${DB_PASS}" --host="${DB_HOST}" --port="${DB_PORT}" "${DB_NAME}"
}

drop() {
  npx dropdbjs --user="${DB_USER}" --password="${DB_PASS}" --host="${DB_HOST}" --port="${DB_PORT}" "${DB_NAME}"
}

migrate() {
  node lib/indexer/run.js migrate
}

case $1 in
create)
  create
  ;;
drop)
  drop
  ;;
migrate)
  migrate
  ;;
bootstrap)
  create && migrate
  ;;
*)
  echo "unknown command $1"
  exit 1
  ;;
esac