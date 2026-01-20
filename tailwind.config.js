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
                // LensClip ブランドカラー
                brand: {
                    coral: '#FF6B6B',
                    peach: '#FF9E7D',
                    orange: '#FF823C',
                    cream: '#FFF0E5',
                    beige: '#F5EDD6',
                    dark: '#2D2D2D',
                    muted: '#7D7D7D',
                },
            },
            animation: {
                'bounce-short': 'bounce 0.5s ease-in-out',
            },
        },
    },

    plugins: [forms],
};
