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
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      typography: {
        gray: {
          css: {
            "--tw-prose-body": "rgb(55, 65, 81)",
            "--tw-prose-headings": "rgb(17, 24, 39)",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
