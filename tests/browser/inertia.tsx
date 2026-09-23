import { createElement, type ReactNode } from 'react';
export const calls: { posts: Array<{ url: string; data: FormData; options: any }>; visits: string[] } = {
    posts: [], visits: [],
};
export const router = {
    get: (url: string) => calls.visits.push(url),
    reload: () => {},
    visit: (url: string) => calls.visits.push(url),
    post: (url: string, data: FormData, options: any) => calls.posts.push({ url, data, options }),
};
export function Head() { return null; }

export function Link({ href, children, ...props }: { href: string; children?: ReactNode; [key: string]: any }) {
    return createElement('a', { href, ...props }, children);
}
