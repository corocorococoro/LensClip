import type { ObservationSummary } from '@/types/models';
import type { UploadItem } from '@/uploadQueue';
import { savedUploadSummary } from './uploadPresentation';

export interface Discovery { key: string; createdAt: string; observation?: ObservationSummary; upload?: UploadItem }

/** One card per photo, including the interval before the refreshed list arrives. */
export function mergeDiscoveries(observations: ObservationSummary[], uploads: UploadItem[]): Discovery[] {
    const remaining = new Map(observations.map(item => [item.id, item]));
    const entries: Discovery[] = uploads.map(upload => {
        const summary = savedUploadSummary(upload);
        const saved = summary && remaining.get(summary.id);
        if (summary) remaining.delete(summary.id);
        return { key: upload.id, createdAt: upload.createdAt,
            observation: summary ? { ...summary, ...saved, created_at: upload.createdAt } : undefined, upload };
    });
    remaining.forEach(observation => entries.push({ key: observation.id, createdAt: observation.created_at ?? '', observation }));
    return entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.key.localeCompare(a.key));
}
