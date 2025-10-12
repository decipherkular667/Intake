import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema-sqlite.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:./dev-database.sqlite",
  },
});
