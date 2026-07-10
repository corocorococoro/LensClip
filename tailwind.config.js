import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Figtree', 'Noto Sans JP', ...defaultTheme.fontFamily.sans],
            },
            colors: {
                // LensClip: 写真を主役にする、温かいニュートラル + 発見のターコイズ
                brand: {
                    turquoise: '#30D5C8',
                    primary: '#159E96',
                    'primary-dark': '#0F766E',
                    'primary-soft': '#E8F8F5',
                    cream: '#FFFDD0',
                    'cream-soft': '#FFFDF0',
                    sand: '#C2B280',
                    'sand-soft': '#F4F0E4',
                    coral: '#E9685E',
                    'coral-soft': '#FFF0ED',
                    ink: '#3D342C',
                    muted: '#766B62',
                    line: '#E9E4DD',
                    canvas: '#FCFBF8',
                    // 既存クラスを新しい意味体系へ接続する互換エイリアス
                    pink: '#159E96',
                    rose: '#159E96',
                    sky: '#30D5C8',
                    blush: '#E9E4DD',
                    dark: '#3D342C',
                },
            },
            boxShadow: {
                surface: '0 1px 2px rgba(61, 52, 44, 0.04), 0 10px 30px rgba(61, 52, 44, 0.06)',
                lift: '0 16px 40px rgba(61, 52, 44, 0.12)',
            },
            animation: {
                'bounce-short': 'bounce 0.5s ease-in-out',
                'soft-pulse': 'pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
        },
    },

    plugins: [forms],
};
