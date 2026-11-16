import "dotenv/config";
import { defineConfig } from "prisma/config";

// The Prisma CLI (migrate, seed, studio) uses the DIRECT (non-pooled) connection.
// The running app uses the pooled DATABASE_URL (see src/lib/db.ts).
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
