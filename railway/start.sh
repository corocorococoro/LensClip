#!/bin/bash

# Ensure storage directory exists for Volume mounting
mkdir -p /app/storage/app/public/observations

# Write GCP service account credentials from env var to file
if [ -n "$GOOGLE_CREDENTIALS_JSON" ]; then
    echo "Writing GCP service account credentials..."
    echo "$GOOGLE_CREDENTIALS_JSON" > /app/service-account.json
    export GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json
fi

# Run database migrations
# We use --force because it's a production-like environment
echo "Running migrations..."
php artisan migrate --force || true

# Create storage link
echo "Creating storage link..."
php artisan storage:link || true

# Start Queue Worker in the background
echo "Starting queue worker..."
php artisan queue:work --tries=3 --timeout=90 &

# Start Web Server
echo "Starting web server on port $PORT..."
php artisan serve --host=0.0.0.0 --port=$PORT
