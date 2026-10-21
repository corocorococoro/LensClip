#!/bin/sh
set -eu

# Temporary source build while the fixed official PHP Docker image is publishing.
# Release/checksum source: https://github.com/docker-library/php/blob/master/versions.json
# Reuse the official base's configure flags to preserve its extensions and SAPIs.
configure_options="$(php-config --configure-options)"

apk add --no-cache --virtual .php-security-build-deps \
    $PHPIZE_DEPS \
    argon2-dev \
    coreutils \
    curl-dev \
    gnu-libiconv-dev \
    libsodium-dev \
    libxml2-dev \
    linux-headers \
    oniguruma-dev \
    openssl-dev \
    readline-dev \
    sqlite-dev

# Never reuse the unpatched source bundled with the bootstrap image.
docker-php-source delete
curl --fail --show-error --silent --location --retry 3 \
    "$PHP_URL" -o /usr/src/php.tar.xz
printf '%s  %s\n' "$PHP_SHA256" /usr/src/php.tar.xz | sha256sum -c -
docker-php-source extract

# Match the official Alpine recipe: use GNU iconv instead of musl iconv.
rm -f /usr/include/iconv.h
export CFLAGS="$PHP_CFLAGS" CPPFLAGS="$PHP_CPPFLAGS" LDFLAGS="$PHP_LDFLAGS"
cd /usr/src/php
# The quoted flags come only from php-config in the pinned official base image.
eval "./configure $configure_options"
make -j "$(nproc)"
make install
find /usr/local -type f -perm /0111 -exec strip --strip-all '{}' + 2>/dev/null || true
cp php.ini-development php.ini-production "$PHP_INI_DIR/"
cd /
docker-php-source delete

# Keep the rebuilt PHP's runtime libraries when removing compilers and headers.
run_deps="$(
    scanelf --needed --nobanner --format '%n#p' --recursive /usr/local \
        | tr ',' '\n' \
        | sort -u \
        | awk 'system("[ -e /usr/local/lib/" $1 " ]") == 0 { next } { print "so:" $1 }'
)"
apk add --no-cache $run_deps
apk del --no-network .php-security-build-deps

# Verify the executable, not just the image's PHP_VERSION environment variable.
php -r 'printf("Built PHP %s\n", PHP_VERSION); exit(PHP_VERSION === getenv("PHP_VERSION") ? 0 : 1);'
