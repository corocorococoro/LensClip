import { createElement, type ReactNode } from 'react';
export const calls: { posts: Array<{ url: string; data: FormData; options: any }>; visits: string[]; reloads: number; reloadOptions: any[]; cancellations: number } = {
    posts: [], visits: [], reloads: 0, reloadOptions: [], cancellations: 0,
};
const listeners = new Map<string, Set<(event: any) => void>>();
let currentPath = '/observations/upload-pending';
export const router = {
    get: (url: string) => router.visit(url),
    reload: (options?: any) => {
        calls.reloads++; calls.reloadOptions.push(options);
        options?.onCancelToken?.({ cancel: () => { calls.cancellations++; options?.onFinish?.(); } });
        if ((window as any).holdReload) return;
        window.dispatchEvent(new Event('test:reload')); options?.onSuccess?.(); options?.onFinish?.();
    },
    visit: (url: string) => {
        calls.visits.push(url); currentPath = url;
        window.dispatchEvent(new CustomEvent('test:navigate', { detail: url }));
    },
    post: (url: string, data: FormData, options: any) => calls.posts.push({ url, data, options }),
    on: (name: string, listener: (event: any) => void) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(listener);
        return () => listeners.get(name)!.delete(listener);
    },
};
export function emitRouterEvent(name: string, event: any) { listeners.get(name)?.forEach(listener => listener(event)); }
export function usePage() { return { props: { auth: { user: { id: 1, name: 'Test', role: 'user' } }, ziggy: { location: currentPath } } }; }
export function Head() { return null; }
export function Link({ href, children, ...props }: { href: string; children?: ReactNode; [key: string]: any }) {
    return createElement('a', { href, ...props, onClick: (event: MouseEvent) => { event.preventDefault(); router.visit(href); } }, children);
}
