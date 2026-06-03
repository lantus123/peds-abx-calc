import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages deploys to https://<user>.github.io/<repo>/
// 設成 repo 名稱即可，CI 會用 --base override
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
