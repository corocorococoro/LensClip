#!/bin/bash
set -Eeuo pipefail

mkdir -p /app/storage/app/public/observations /app/storage/app/private/pending

# A failed migration must fail deployment instead of serving against an old schema.
php artisan migrate --force
php artisan storage:link --force

worker_pid=''
web_pid=''
cleanup() {
    trap - EXIT
    [ -z "$worker_pid" ] || kill "$worker_pid" 2>/dev/null || true
    [ -z "$web_pid" ] || kill "$web_pid" 2>/dev/null || true
    wait 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT

php artisan queue:work --tries=3 --timeout=120 &
worker_pid=$!
php artisan serve --host=0.0.0.0 --port="${PORT:?PORT is required}" &
web_pid=$!

# Let the platform restart the service if either essential process stops.
if wait -n "$worker_pid" "$web_pid"; then
    exit 1
else
    exit $?
fi
