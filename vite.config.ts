import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      ignored: [
        "**/artifacts/**",
        "**/docs/**",
        "**/test-results/**",
        "**/assets/source/**",
      ],
    },
  },
  build: {
    outDir: "dist/client",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: (id) => (id.includes("/three/") ? "three" : undefined),
      },
    },
  },
});
