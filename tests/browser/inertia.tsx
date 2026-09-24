import { createElement, useState, type ReactNode } from 'react';
export const calls: { posts: Array<{ url: string; data: FormData; options: any }>; visits: string[]; reloads: number; reloadOptions: any[]; cancellations: number } = {
    posts: [], visits: [], reloads: 0, reloadOptions: [], cancellations: 0,
};
const listeners = new Map<string, Set<(event: any) => void>>();
let currentPath = '/observations/upload-pending';
export function setPath(url: string) { currentPath = url; }
export const router = {
    remember: () => {}, restore: () => undefined,
    get: (url: string, data: Record<string, string> = {}) => router.visit(url + '?' + new URLSearchParams(Object.entries(data).filter(([, value]) => value != null)).toString()),
    reload: (options?: any) => {
        calls.reloads++; calls.reloadOptions.push(options);
        options?.onCancelToken?.({ cancel: () => { calls.cancellations++; options?.onFinish?.(); } });
        if ((window as any).holdReload) return;
        window.dispatchEvent(new Event('test:reload')); options?.onSuccess?.(); options?.onFinish?.();
    },
    visit: (url: string, options?: any) => {
        calls.visits.push(url);
        if ((window as any).holdVisit) { options?.onFinish?.(); return; }
        currentPath = url;
        window.dispatchEvent(new CustomEvent('test:navigate', { detail: url }));
        options?.onSuccess?.(); options?.onFinish?.();
    },
    post: (url: string, data: FormData, options: any) => calls.posts.push({ url, data, options }),
    patch: () => {}, delete: () => {},
    on: (name: string, listener: (event: any) => void) => {
        if (!listeners.has(name)) listeners.set(name, new Set());
        listeners.get(name)!.add(listener);
        return () => listeners.get(name)!.delete(listener);
    },
};
export function emitRouterEvent(name: string, event: any) { listeners.get(name)?.forEach(listener => listener(event)); }
export function usePage() { return { url: currentPath, props: { auth: { user: { id: 1, name: 'Test', role: 'user' } }, ziggy: { location: currentPath } } }; }
export function useRemember<T>(initial: T, _key?: string) { return useState(initial); }
export function Head() { return null; }
export function Link({ href, children, onClick, replace: _replace, ...props }: { href: string; children?: ReactNode; [key: string]: any }) {
    return createElement('a', { href, ...props, onClick: (event: any) => { onClick?.(event); if (!event.defaultPrevented) { event.preventDefault(); router.visit(href); } } }, children);
}
