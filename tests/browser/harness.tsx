import { StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import Library from '../../resources/js/Pages/Library';
import UploadPending from '../../resources/js/Pages/Observations/UploadPending';
import { readImageGps } from '../../resources/js/lib/imageGps';
import { prepareImageUpload } from '../../resources/js/lib/prepareImageUpload';
import { setPendingUpload, getPendingUpload } from '../../resources/js/uploadPendingStore';
import { calls } from './inertia';

let root: Root | null = null;
const revoked: string[] = [];
const activeUrls = new Set<string>();
const createObjectURL = URL.createObjectURL.bind(URL);
URL.createObjectURL = (object) => { const url = createObjectURL(object); activeUrls.add(url); return url; };
const revokeObjectURL = URL.revokeObjectURL.bind(URL);
URL.revokeObjectURL = (url) => { revoked.push(url); activeUrls.delete(url); revokeObjectURL(url); };
Object.assign(window, {
    readImageGps, prepareImageUpload, setPendingUpload, getPendingUpload, calls, revoked, activeUrls,
    mountUpload(file: File, latitude: number | null = null, longitude: number | null = null) {
        if (file) setPendingUpload(file, latitude, longitude);
        root = createRoot(document.getElementById('root')!);
        root.render(<StrictMode><UploadPending /></StrictMode>);
    },
    mountLibrary(props: any) {
        root = createRoot(document.getElementById('root')!);
        root.render(<StrictMode><Library {...props} /></StrictMode>);
    },
    unmountUpload() { root?.unmount(); root = null; },
});
