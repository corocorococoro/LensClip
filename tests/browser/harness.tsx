import '../../resources/css/app.css';
import axios from 'axios';
import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Library from '../../resources/js/Pages/Library';
import Show from '../../resources/js/Pages/Observations/Show';
import UploadPending from '../../resources/js/Pages/Observations/UploadPending';
import { readImageGps } from '../../resources/js/lib/imageGps';
import { prepareImageUpload } from '../../resources/js/lib/prepareImageUpload';
import * as queue from '../../resources/js/uploadQueue';
import { initializeUploadSession } from '../../resources/js/uploadSession';
import { calls, emitRouterEvent, setPath, usePage } from './inertia';

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
    const parsed = new URL(event.detail, location.origin);
    if (parsed.pathname === '/library') mount(<Library {...libraryProps} filters={Object.fromEntries(parsed.searchParams)} />);
    else if (parsed.pathname === '/observations/upload-pending') mount(<UploadPending />);
    else if (parsed.pathname.startsWith('/observations/')) {
        const item = queue.getUploads().find(item => item.observation?.id === parsed.pathname.split('/')[2]);
        if (item?.observation) mountObservation(item.observation);
    }
}) as EventListener);
function mountObservation(observation: any) {
    mount(<Show categories={[]} observation={{ summary: '', kid_friendly: '', confidence: null, original_url: null, cropped_url: null, ai_json: null, created_at: '2026-09-24', ...observation }} />);
}
window.addEventListener('test:reload', () => {
    if ((window as any).nextObservation) { mountObservation((window as any).nextObservation); return; }
    const current = usePage().url;
    if (current.startsWith('/observations/') && !current.startsWith('/observations/upload-pending')) {
        const item = queue.getUploads().find(item => item.observation?.id === new URL(current, location.origin).pathname.split('/')[2]);
        if (item?.observation) mountObservation(item.observation);
        return;
    }
    const props = (window as any).nextLibraryProps;
    if (props) mount(<Library {...props} />);
});
Object.assign(window, {
    readImageGps, prepareImageUpload, ...queue, calls, revoked, activeUrls, emitRouterEvent,
    mountUpload(file: File | null, latitude: number | null = null, longitude: number | null = null) {
        const id = file ? queue.enqueueUpload(file, latitude, longitude) : null;
        setPath(`/observations/upload-pending${id ? '?upload=' + id : ''}`);
        mount(<UploadPending />);
    },
    mountLibrary(props: any) { setPath('/library?' + new URLSearchParams({ ...props.filters, view: props.viewMode || 'date' })); mount(<Library {...props} />); },
    mountObservation(observation: any) { setPath(`/observations/${observation.id}`); mountObservation(observation); },
    unmountUpload() { root?.unmount(); root = null; },
});
