import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  function getAllowedHosts() {
    const hosts = env.VITE_ALLOWED_HOSTS;
    return hosts ? hosts.split(",").map((host: string) => host.trim()) : [];
  }

  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || "/",
    server: {
      allowedHosts: getAllowedHosts(),
    },
  };
});
