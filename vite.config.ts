import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// GitHub Pages serves this repo from /luxlashandbeauty/, not the domain root — but local
// dev must stay at "/" so the existing preview/dev workflow is untouched.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/luxlashandbeauty/" : "/",
  server: {
    open: true,
    port: 3001,
  },
}));
