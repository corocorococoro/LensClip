import type { LibraryViewMode } from '@/types/models';

interface ViewModeSwitcherProps {
    currentMode: LibraryViewMode;
    onModeChange: (mode: LibraryViewMode) => void;
}

const VIEW_MODES = [
    { id: 'date' as const, label: '日付', path: 'M6 2v3M18 2v3M3 9h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z' },
    { id: 'category' as const, label: 'カテゴリ', path: 'M20 12 12 20l-9-9V4h7l10 8ZM7.5 7.5h.01' },
    { id: 'map' as const, label: '地図', path: 'm3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15' },
];

export default function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
    return (
        <div className="grid w-full grid-cols-3 rounded-xl bg-brand-sand-soft p-1" role="group" aria-label="表示モード">
            {VIEW_MODES.map((mode) => {
                const selected = currentMode === mode.id;
                return (
                    <button
                        key={mode.id}
                        type="button"
                        onClick={() => onModeChange(mode.id)}
                        aria-pressed={selected}
                        className={`flex min-h-10 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition ${selected ? 'bg-white text-brand-primary-dark shadow-sm' : 'text-brand-muted hover:text-brand-ink'}`}
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={mode.path} /></svg>
                        {mode.label}
                    </button>
                );
            })}
        </div>
    );
}
