import { defineConfig } from "vite";

const ENTRY = "Web Design - Gonzalo Costadoni.dc.html";

export default defineConfig({
  root: ".",
  server: {
    open: `/${encodeURI(ENTRY)}`
  },
  build: {
    rollupOptions: {
      input: ENTRY
    }
  }
});
