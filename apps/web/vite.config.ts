import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Dedicated Corrix port — avoids clashing with other Vite apps on 5173
    port: 5288,
    strictPort: true,
    host: true,
  },
});
