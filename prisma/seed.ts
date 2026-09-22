import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding demo data…");

  const passwordHash = await bcrypt.hash("password123", 10);

  const [alex, priya, sam, jordan] = await Promise.all(
    [
      { name: "Alex Rivera", email: "alex@demo.com" },
      { name: "Priya Nair", email: "priya@demo.com" },
      { name: "Sam Okafor", email: "sam@demo.com" },
      { name: "Jordan Lee", email: "jordan@demo.com" },
    ].map((u) =>
      prisma.user.upsert({
        where: { email: u.email },
        update: {},
        create: { ...u, passwordHash },
      })
    )
  );

  const group = await prisma.group.create({
    data: {
      name: "Goa Trip",
      emoji: "🏖️",
      members: {
        create: [
          { userId: alex.id, role: "owner" },
          { userId: priya.id, role: "member" },
          { userId: sam.id, role: "member" },
          { userId: jordan.id, role: "member" },
        ],
      },
    },
  });

  // A deliberate mini debt-cycle: Alex -> Priya -> Sam -> Jordan -> Alex,
  // plus one more expense, so the "before" graph looks genuinely tangled
  // and the simplification is visibly worth it.
  await prisma.expense.create({
    data: {
      description: "Flights (Alex booked for everyone)",
      amountCents: 24000,
      category: "travel",
      groupId: group.id,
      paidById: alex.id,
      shares: {
        create: [
          { userId: alex.id, shareCents: 6000 },
          { userId: priya.id, shareCents: 6000 },
          { userId: sam.id, shareCents: 6000 },
          { userId: jordan.id, shareCents: 6000 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: "Beach resort (Priya's card)",
      amountCents: 18000,
      category: "lodging",
      groupId: group.id,
      paidById: priya.id,
      shares: {
        create: [
          { userId: alex.id, shareCents: 4500 },
          { userId: priya.id, shareCents: 4500 },
          { userId: sam.id, shareCents: 4500 },
          { userId: jordan.id, shareCents: 4500 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: "Scuba diving (Sam paid)",
      amountCents: 9000,
      category: "activities",
      groupId: group.id,
      paidById: sam.id,
      shares: {
        create: [
          { userId: priya.id, shareCents: 4500 },
          { userId: sam.id, shareCents: 4500 },
        ],
      },
    },
  });

  await prisma.expense.create({
    data: {
      description: "Late-night tacos (Jordan)",
      amountCents: 1600,
      category: "food",
      groupId: group.id,
      paidById: jordan.id,
      shares: {
        create: [
          { userId: alex.id, shareCents: 800 },
          { userId: jordan.id, shareCents: 800 },
        ],
      },
    },
  });

  console.log("Done. Demo login: alex@demo.com / password123 (or priya@ / sam@ / jordan@demo.com)");
  console.log(`Group id: ${group.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
