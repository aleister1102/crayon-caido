import { defineConfig } from "@caido-community/dev";
import vue from "@vitejs/plugin-vue";
import path from "path";

const id = "crayon";

export default defineConfig({
  id,
  name: "Crayon Colorizer",
  description: "Colorizes requests with JSON/XML/HTML and status-aware rules, plus batch/context menu actions.",
  version: "1.0.6",
  author: {
    name: "insomnia1102",
    email: "marucube35@gmail.com",
    url: "https://github.com/aleister1102/crayon-caido",
  },
  plugins: [
    {
      kind: "backend",
      id: "crayon-backend",
      name: "Crayon Colorizer Backend",
      root: "./src/backend",
    },
    {
      kind: "frontend",
      id: "crayon-frontend",
      name: "Crayon Context Menu",
      root: "./src/frontend",
      backend: {
        id: "crayon-backend",
      },
      vite: {
        plugins: [vue()],
        build: {
          rollupOptions: {
            external: ["@caido/frontend-sdk", "vue"],
          },
        },
        resolve: {
          alias: [
            {
              find: "@",
              replacement: path.resolve(__dirname, "src/frontend/src"),
            },
          ],
        },
      },
    },
  ],
});
