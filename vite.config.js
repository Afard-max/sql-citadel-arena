import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

export default defineConfig(({ command }) => ({
  plugins: [svelte()],
  base: command === "build" ? "/sql-citadel-arena/" : "/",
  build: {
    target: "es2022",
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
}));
