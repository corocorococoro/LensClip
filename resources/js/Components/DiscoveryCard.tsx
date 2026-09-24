import { ObservationCard } from './ObservationCard';
import UploadCard from './UploadCard';
import type { CategoryDefinition } from '@/types/models';
import type { Discovery } from '@/lib/discoveries';
import { uploadLabel } from '@/lib/uploadPresentation';

export default function DiscoveryCard({ entry, categories = [], size = 'md' }: { entry: Discovery; categories?: CategoryDefinition[]; size?: 'sm' | 'md' }) {
    return entry.observation ? <ObservationCard observation={entry.observation} categories={categories} size={size}
        statusLabel={entry.upload?.message ? uploadLabel(entry.upload) : undefined} />
        : entry.upload ? <UploadCard item={entry.upload} /> : null;
}
