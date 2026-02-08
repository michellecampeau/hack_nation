/**
 * Ensures exactly one Origin person exists.
 * 1. If a person named "Michelle Campeau" exists → set isOrigin = true
 * 2. If no origin exists → create one with name "Michelle Campeau"
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const existingOrigin = await prisma.person.findFirst({
    where: { isOrigin: true },
  });
  if (existingOrigin) {
    console.log("Origin already exists:", existingOrigin.name);
    return;
  }

  const all = await prisma.person.findMany();
  const michelle = all.find((p) =>
    p.name.toLowerCase().includes("michelle campeau")
  );
  if (michelle) {
    await prisma.person.update({
      where: { id: michelle.id },
      data: { isOrigin: true },
    });
    console.log("Set isOrigin = true for existing person:", michelle.name);
    return;
  }

  const created = await prisma.person.create({
    data: {
      name: "Michelle Campeau",
      isOrigin: true,
      relationshipState: "ok",
    },
  });
  console.log("Created Origin person:", created.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
