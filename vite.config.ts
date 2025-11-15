import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), tailwindcss()],
  // Habilitar sourcemaps para mejorar trazas de error en consola
  build: {
    sourcemap: true,
  },
  css: {
    devSourcemap: true,
  },
});
