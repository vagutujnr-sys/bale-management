import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => {
  if (command === "serve") {
    const env = loadEnv(mode, process.cwd(), "");
    process.env["SUPABASE_URL"] ||= env["SUPABASE_URL"] || env["VITE_SUPABASE_URL"];
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||= env["SUPABASE_SERVICE_ROLE_KEY"];
  }

  return {
    css: { transformer: "lightningcss" },
    plugins: [
      tailwindcss(),
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: { files: ["**/server/**"], specifiers: ["server-only"] },
        },
        server: { entry: "server" },
      }),
      ...(command === "build" ? [nitro({ preset: "vercel" })] : []),
      react(),
    ],
    server: { host: "::", port: 8080 },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
  };
});
