import '../../resources/css/app.css';
import axios from 'axios';
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Library from '../../resources/js/Pages/Library';
import UploadPending from '../../resources/js/Pages/Observations/UploadPending';
import { readImageGps } from '../../resources/js/lib/imageGps';
import { prepareImageUpload } from '../../resources/js/lib/prepareImageUpload';
import * as queue from '../../resources/js/uploadQueue';
import { initializeUploadSession } from '../../resources/js/uploadSession';
import { calls, emitRouterEvent } from './inertia';

let root: Root | null = null;
const revoked: string[] = [];
const activeUrls = new Set<string>();
const createObjectURL = URL.createObjectURL.bind(URL);
URL.createObjectURL = (object) => { const url = createObjectURL(object); activeUrls.add(url); return url; };
const revokeObjectURL = URL.revokeObjectURL.bind(URL);
URL.revokeObjectURL = (url) => { revoked.push(url); activeUrls.delete(url); revokeObjectURL(url); };
axios.interceptors.request.use(config => {
    if (config.method === 'post' && config.url === '/observations') calls.posts.push({ url: config.url, data: config.data, options: config });
    return config;
});
initializeUploadSession(1);
const libraryProps = { observations: { data: [] }, tags: [], filters: {}, dateGroups: [], pagination: { hasMore: false, nextCursor: null } };
function mount(element: React.ReactNode) {
    root ??= createRoot(document.getElementById('root')!);
    root.render(<StrictMode>{element}</StrictMode>);
}
window.addEventListener('test:navigate', ((event: CustomEvent) => {
    if (event.detail === '/library') mount(<Library {...libraryProps} />);
    else if (event.detail === '/observations/upload-pending') mount(<UploadPending />);
}) as EventListener);
window.addEventListener('test:reload', () => {
    const props = (window as any).nextLibraryProps;
    if (props) mount(<Library {...props} />);
});
Object.assign(window, {
    readImageGps, prepareImageUpload, ...queue, calls, revoked, activeUrls, emitRouterEvent,
    mountUpload(file: File | null, latitude: number | null = null, longitude: number | null = null) {
        if (file) queue.enqueueUpload(file, latitude, longitude);
        mount(<UploadPending />);
    },
    mountLibrary(props: any) { mount(<Library {...props} />); },
    unmountUpload() { root?.unmount(); root = null; },
});
