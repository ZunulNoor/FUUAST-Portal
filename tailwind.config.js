/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
brand: {
          DEFAULT: '#4A5A2C', // deep olive �?" from the university header
          light: '#7A8F52', // sage �?" lit edge of the header gradient
          dark: '#37451F',
          soft: '#EEF1E6',
        },
        ink: '#1C1C1C', // near-black, from the utility bar
        muted: '#72808B',
        action: {
          DEFAULT: '#1C86C4', // modernized portal blue
          hover: '#166D9F',
        },
        surface: '#F6F6F4', // warm off-white background
        paper: '#FFFFFF',
        line: '#D8D8D3', // borders/dividers
        danger: '#D64545',
        success: '#2F9E44',
        warning: '#E08E2B',
        status: {
          present: '#2F9E44',
          absent: '#D64545',
          late: '#E08E2B',
          leave: '#6B5CA5',
          excused: '#2B8A9E',
        },
      },
      fontFamily: {
        // System stack, not a build-time Google Fonts fetch — renders as San
        // Francisco / Segoe UI / Roboto per OS, avoids fragile network calls
        // during `next build` (relevant on locked-down cPanel/CI environments).
        // Swap in a self-hosted Inter via next/font/local later if desired.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          '"Noto Sans"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
