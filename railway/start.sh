#!/bin/bash

# Ensure storage directory exists for Volume mounting
mkdir -p /app/storage/app/public/observations

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
