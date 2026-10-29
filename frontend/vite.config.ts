import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const target = process.env.VITE_PROXY_TARGET ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target, changeOrigin: true },
      "/actuator": { target, changeOrigin: true },
      "/swagger-ui": { target, changeOrigin: true },
      "/v3/api-docs": { target, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
