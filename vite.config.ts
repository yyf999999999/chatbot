import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // ◀◀ 追加

const repositoryName = "react-todo-app"; // ◀◀ 追加

export default defineConfig({
  plugins: [react()],
  // ▼▼ 追加 ここから ▼▼
  base: process.env.NODE_ENV === "production" ? `/${repositoryName}/` : "/",
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        404: path.resolve(__dirname, "404.html"),
      },
    },
  },
  // ▲▲ 追加 ここまで ▲▲
  server: {
    port: 3000,
    strictPort: false,
    open: true,
  },
});
