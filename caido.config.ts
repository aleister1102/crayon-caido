import { defineConfig } from "@caido-community/dev";

export default defineConfig({
  id: "crayon",
  name: "Crayon Colorizer",
  description: "Colorizes requests with JSON/XML/HTML and status-aware rules, plus batch/context menu actions.",
  version: "1.0.0",
  author: {
    name: "insomnia1102",
    email: "marucube35@gmail.com",
    url: "https://github.com/aleister1102/crayon-caido",
  },
  plugins: [
    {
      kind: "frontend",
      id: "crayon-frontend",
      name: "Crayon Context Menu",
      root: "./src/frontend",
      backend: {
        id: "crayon-backend",
      },
    },
    {
      kind: "backend",
      id: "crayon-backend",
      name: "Crayon Colorizer Backend",
      root: "./src/backend",
    },
  ],
});
