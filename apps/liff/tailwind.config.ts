import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        line: { green: "#06C755", dark: "#00B900" },
      },
      fontFamily: {
        sans: ["Noto Sans Thai", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
