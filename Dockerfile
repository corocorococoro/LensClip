# Bootstrap only: the fixed Docker tags are not yet available on Docker Hub.
# Rebuild PHP from its verified official release before installing the app.
FROM php:8.4.26-cli-alpine3.23

ENV PHP_VERSION=8.4.27 \
    PHP_URL=https://www.php.net/distributions/php-8.4.27.tar.xz \
    PHP_ASC_URL=https://www.php.net/distributions/php-8.4.27.tar.xz.asc \
    PHP_SHA256=dcf93923b0e38e0d5252b25b796520b5a47761a08b3488b6d0b5d1115764d3f0

# Install system dependencies
RUN apk add --no-cache \
    bash \
    curl \
    libpng-dev \
    libwebp-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libzip-dev \
    icu-dev \
    oniguruma-dev \
    nodejs \
    npm

# Fix CVE-2026-109618 and CVE-2026-109619 even before Docker Hub publishes tags.
COPY railway/build-php.sh /usr/local/bin/lensclip-build-php
RUN sh /usr/local/bin/lensclip-build-php && rm /usr/local/bin/lensclip-build-php

# Install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j$(nproc) \
    gd \
    intl \
    zip \
    bcmath \
    exif \
    pdo_mysql \
    pcntl \
    opcache

# Configure PHP for larger uploads and memory usage
RUN echo "upload_max_filesize = 20M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 20M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini

# Defense in depth: LensClip uses its own upload progress, not PHP sessions.
# This is not a substitute for the patched PHP runtime above.
RUN echo "session.upload_progress.enabled = 0" > /usr/local/etc/php/conf.d/security.ini

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /app

# Copy application files
COPY . .

# Install PHP dependencies
RUN composer validate --strict \
    && composer install --no-interaction --no-dev --optimize-autoloader \
    && composer check-platform-reqs --no-dev

# Install the exact locked Node dependencies, build assets, then remove build-only modules.
RUN npm ci && npm run build && rm -rf node_modules

# Fix permissions
RUN chown -R www-data:www-data /app/storage /app/bootstrap/cache

# Expose port
EXPOSE 8080

# The Start Command in Railway UI will override this, 
# but we provide it here as a default for documentation.
CMD ["bash", "railway/start.sh"]
