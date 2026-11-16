// Seeds starter prices and default branding on a brand-new database.
// Safe to run on every deploy: once the settings row exists it does nothing,
// so it never brings back products the owner deleted.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL! }) });

async function main() {
  if (await prisma.settings.findUnique({ where: { id: 1 } })) {
    console.log("Database already set up — skipping seed.");
    return;
  }
  await prisma.settings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      businessName: "Skate Shack",
      tagline: "Sharp edges. Better skating. Quick turnaround on hockey, goalie and figure skates.",
      aboutText:
        "We're a local skate sharpening shop run by skaters, for skaters. Every pair gets a consistent, level edge — and we keep your hollow and profile on file so it's right every time.",
      hours: "Mon–Fri 4–8pm\nSat 9am–2pm",
    },
    update: {},
  });

  if ((await prisma.product.count()) === 0) {
    await prisma.product.createMany({
      data: [
        {
          kind: "SERVICE",
          name: "Standard sharpen",
          description: "Player skates sharpened to your preferred hollow, edges checked for level.",
          priceCents: 1200,
          credits: 1,
          sortOrder: 1,
        },
        {
          kind: "SERVICE",
          name: "Goalie sharpen",
          description: "Goalie blades sharpened and checked for level.",
          priceCents: 1500,
          credits: 1,
          sortOrder: 2,
        },
        {
          kind: "CARD",
          name: "5-sharpen card",
          description: "Five standard sharpens, prepaid.",
          priceCents: 5500,
          credits: 5,
          sortOrder: 1,
        },
        {
          kind: "CARD",
          name: "10-sharpen card",
          description: "Ten standard sharpens, prepaid. Our best value.",
          priceCents: 10000,
          credits: 10,
          sortOrder: 2,
        },
      ],
    });
    console.log("Seeded starter products.");
  }
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
