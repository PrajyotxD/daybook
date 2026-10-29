import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // loadEnv reads frontend/.env (and .env.local) so the proxy target can be changed
  // without exporting shell variables. Shell env still wins if set.
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.VITE_PROXY_TARGET || "http://localhost:8080";

  return {
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
  };
});
