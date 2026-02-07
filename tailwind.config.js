import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // LensClip ブランドカラー（パステルピンク × ベビーブルー）
                brand: {
                    pink: '#F5B8C1',
                    rose: '#E8A0AB',
                    sky: '#8ECFE0',
                    cream: '#FDE8EC',
                    blush: '#F8D1D7',
                    dark: '#2D2D2D',
                    muted: '#8E8E8E',
                },
            },
            animation: {
                'bounce-short': 'bounce 0.5s ease-in-out',
            },
        },
    },

    plugins: [forms],
};
