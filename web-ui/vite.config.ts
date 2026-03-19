import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:18789",
      "/ws": {
        target: "ws://localhost:18789",
        ws: true,
      },
    },
  },
  root: ".",
  publicDir: "public",
});
