import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f6fe",
          100: "#dbe8fd",
          200: "#bfd7fb",
          300: "#93bdf8",
          400: "#609cf3",
          500: "#3b7ceb",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#0a2540",
          950: "#061528",
        },
        navy: {
          800: "#0F2F57",
          900: "#0A2540",
          950: "#06172B",
        },
      },
    },
  },
  plugins: [],
};
export default config;
