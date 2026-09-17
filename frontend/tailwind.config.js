/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        soft: "0 20px 45px -15px rgba(0,0,0,0.55)",
        glow: "0 0 0 3px rgba(99,102,241,0.35)",
      },
    },
  },
  plugins: [],
};
