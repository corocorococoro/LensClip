import type { CategoryDefinition, ObservationSummary } from '@/types/models';

interface CategoryCardProps {
    category: CategoryDefinition;
    count: number;
    observations: ObservationSummary[];
    isActive?: boolean;
    onClick?: () => void;
}

export default function CategoryCard({ category, count, observations, isActive, onClick }: CategoryCardProps) {
    // Get first 3 thumbnails for preview
    const previews = observations.slice(0, 3);

    return (
        <button
            onClick={onClick}
            className={`relative w-full aspect-[4/5] rounded-2xl overflow-hidden text-left transition-all hover:scale-[1.02] hover:shadow-lg ${
                isActive ? 'ring-4 ring-brand-coral ring-offset-2' : ''
            }`}
            style={{
                background: `linear-gradient(135deg, ${category.color}40 0%, ${category.color}20 100%)`,
            }}
        >
            {/* Gradient overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: `radial-gradient(circle at bottom right, ${category.color}30, transparent 70%)`,
                }}
            />

            {/* Content */}
            <div className="relative h-full p-4 flex flex-col">
                {/* Category name */}
                <h3 className="text-lg font-bold text-gray-800 leading-tight mb-1">
                    {category.name.split('と').map((part, i, arr) => (
                        <span key={i}>
                            {part}
                            {i < arr.length - 1 && <br />}
                            {i < arr.length - 1 && 'と'}
                        </span>
                    ))}
                </h3>

                {/* Count */}
                <p className="text-sm text-gray-600">
                    {count}単語
                </p>

                {/* Preview images */}
                {previews.length > 0 && (
                    <div className="mt-auto flex -space-x-2">
                        {previews.map((obs) => (
                            <div
                                key={obs.id}
                                className="w-12 h-12 rounded-lg border-2 border-white shadow-sm overflow-hidden bg-white"
                            >
                                {obs.thumb_url ? (
                                    <img
                                        src={obs.thumb_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-100" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </button>
    );
}
