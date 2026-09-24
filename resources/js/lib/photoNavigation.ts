import { router } from '@inertiajs/react';

/** Only app collection routes may be used as a photo's return destination. */
export function photoReturnUrl(url: string): string {
    const parsed = new URL(url, 'https://lensclip.invalid');
    const candidate = parsed.pathname === '/library' || parsed.pathname === '/dashboard'
        ? parsed.pathname + parsed.search : parsed.searchParams.get('return_to');
    return candidate && /^\/(library|dashboard)(\?[^#]*)?$/.test(candidate) ? candidate : '/library';
}

let origin: { destination: string; returnTo: string } | null = null;

export function photoHref(path: string, from: string) {
    return `${path}${path.includes('?') ? '&' : '?'}return_to=${encodeURIComponent(photoReturnUrl(from))}`;
}

export function rememberPhotoOrigin(destination: string, from: string) {
    const path = new URL(from, 'https://lensclip.invalid').pathname;
    if (path === '/library' || path === '/dashboard') {
        // Capture at the click, before the router's debounced scroll listener runs.
        router.remember({ url: from, top: window.scrollY }, 'photo-origin-scroll');
    }
    if (path === '/library' || path === '/dashboard' || origin) {
        origin = { destination, returnTo: photoReturnUrl(from) };
    }
}

export function canReturnThroughHistory(current: string) {
    return origin?.destination === current && origin.returnTo === photoReturnUrl(current);
}
