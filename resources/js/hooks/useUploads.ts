import { useSyncExternalStore } from 'react';
import { getServerUploads, getUploads, subscribeUploads } from '@/uploadQueue';

export function useUploads() {
    return useSyncExternalStore(subscribeUploads, getUploads, getServerUploads);
}
