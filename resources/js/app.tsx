import '../css/app.css';
import './bootstrap';
import { initializeUploadSession } from '@/uploadSession';

import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot, hydrateRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.tsx`,
            import.meta.glob('./Pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        if (import.meta.env.SSR) {
            hydrateRoot(el, <App {...props} />);
            return;
        }

        const auth = props.initialPage.props.auth as { user?: { id: number } } | undefined;
        initializeUploadSession(auth?.user?.id ?? null);
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#159E96',
    },
});
