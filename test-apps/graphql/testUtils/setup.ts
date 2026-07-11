import { afterAll } from "vite-plus/test";

afterAll(async () => {
  const { db } = await import("db");
  await db.$disconnect();
});
