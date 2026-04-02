import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const rewards = [
  { title: "ส่วนลด 50 บาท", required_points: 50, image_url: null },
  { title: "ส่วนลด 100 บาท", required_points: 100, image_url: null },
  { title: "ฟรีสินค้าขนาดทดลอง", required_points: 150, image_url: null },
  { title: "ส่วนลด 300 บาท", required_points: 250, image_url: null },
  { title: "ฟรีสินค้า 1 ชิ้น (มูลค่า 500 บาท)", required_points: 500, image_url: null },
  { title: "Gift Set พิเศษ", required_points: 800, image_url: null },
  { title: "VIP Package สุดพิเศษ", required_points: 1500, image_url: null },
];

async function main() {
  console.log("🌱 Seeding rewards...");

  for (const reward of rewards) {
    await prisma.reward.upsert({
      where: { id: reward.title }, // won't match, so always creates
      update: {},
      create: reward,
    });
  }

  // Use createMany for simplicity
  const existing = await prisma.reward.count();
  if (existing === 0) {
    await prisma.reward.createMany({ data: rewards });
    console.log(`✅ Created ${rewards.length} rewards`);
  } else {
    console.log(`ℹ️  ${existing} rewards already exist. Inserting missing ones...`);
    for (const reward of rewards) {
      const found = await prisma.reward.findFirst({ where: { title: reward.title } });
      if (!found) {
        await prisma.reward.create({ data: reward });
        console.log(`  + ${reward.title}`);
      }
    }
  }

  console.log("✅ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
