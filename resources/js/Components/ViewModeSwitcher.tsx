import { useState, useRef, useEffect } from 'react';
import type { LibraryViewMode } from '@/types/models';

interface ViewModeSwitcherProps {
    currentMode: LibraryViewMode;
    onModeChange: (mode: LibraryViewMode) => void;
}

const VIEW_MODES = [
    { id: 'date' as const, label: '日付順で表示', icon: '📅' },
    { id: 'category' as const, label: 'カテゴリ順で表示', icon: '🏷️' },
    { id: 'map' as const, label: '地図で表示', icon: '🗺️' },
];

export default function ViewModeSwitcher({ currentMode, onModeChange }: ViewModeSwitcherProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentModeConfig = VIEW_MODES.find((m) => m.id === currentMode) || VIEW_MODES[0];

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleModeSelect = (mode: LibraryViewMode) => {
        onModeChange(mode);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm border border-brand-beige hover:bg-brand-cream/50 transition-colors"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
            >
                <span className="text-lg" aria-hidden="true">{currentModeConfig.icon}</span>
                <span className="text-sm font-medium text-brand-dark">{currentModeConfig.label}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-brand-beige py-2 z-50"
                    role="listbox"
                >
                    {VIEW_MODES.map((mode) => (
                        <button
                            key={mode.id}
                            onClick={() => handleModeSelect(mode.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-cream/50 transition-colors ${
                                currentMode === mode.id ? 'bg-brand-cream' : ''
                            }`}
                            role="option"
                            aria-selected={currentMode === mode.id}
                        >
                            {currentMode === mode.id && (
                                <svg className="w-5 h-5 text-brand-coral" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                            {currentMode !== mode.id && <span className="w-5" />}
                            <span className="text-xl" aria-hidden="true">{mode.icon}</span>
                            <span className={`text-sm ${currentMode === mode.id ? 'font-semibold text-brand-coral' : 'text-brand-dark'}`}>
                                {mode.label}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
