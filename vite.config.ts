import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "./index.html",
        launch: "./public/launch.html",
      },
    },
  },
  define: {
    __VITE_CLIENT_ID__: JSON.stringify(
      process.env.VITE_CLIENT_ID ?? "378c65fa-ca11-452b-96d9-f833a75531d1"
    ),
  },
});
