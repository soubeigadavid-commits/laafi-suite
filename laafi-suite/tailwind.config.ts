import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        laafi: {
          bronze: "#96602f",
          gold: "#d9a441",
          dark: "#231a14",
        },
      },
    },
  },
  plugins: [],
};

export default config;
