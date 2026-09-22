export const calls: { posts: Array<{ url: string; data: FormData; options: any }>; visits: string[] } = {
    posts: [], visits: [],
};
export const router = {
    visit: (url: string) => calls.visits.push(url),
    post: (url: string, data: FormData, options: any) => calls.posts.push({ url, data, options }),
};
export function Head() { return null; }
