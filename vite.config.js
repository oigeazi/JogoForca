import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const secureMode = mode === "secure";

  return {
    plugins: [react(), secureMode && basicSsl()].filter(Boolean),
    base: "/JogoForca/",
    server: {
      host: "0.0.0.0",
      strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      strictPort: true,
    },
  };
});
