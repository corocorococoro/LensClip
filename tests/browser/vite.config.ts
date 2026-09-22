import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: '@/Layouts/AppLayout', replacement: fileURLToPath(new URL('./AppLayout.tsx', import.meta.url)) },
            { find: '@inertiajs/react', replacement: fileURLToPath(new URL('./inertia.tsx', import.meta.url)) },
            { find: '@', replacement: fileURLToPath(new URL('../../resources/js', import.meta.url)) },
        ],
    },
});
