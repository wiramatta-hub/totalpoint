import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // -------------------------------------------------------
  // MEMBER TIERS
  // -------------------------------------------------------
  const tiers = await Promise.all([
    prisma.memberTier.upsert({
      where: { id: "tier_member" },
      update: {},
      create: {
        id: "tier_member",
        name: "Member",
        nameTh: "สมาชิก",
        minLifetimePoints: 0,
        pointMultiplier: 1.0,
        birthdayBonusPoints: 50,
        benefits: ["สะสมคะแนนจากการซื้อสินค้า", "แลกของรางวัล"],
        color: "#6B7280",
        sortOrder: 1,
        isDefault: true,
      },
    }),
    prisma.memberTier.upsert({
      where: { id: "tier_silver" },
      update: {},
      create: {
        id: "tier_silver",
        name: "Silver",
        nameTh: "เงิน",
        minLifetimePoints: 1000,
        pointMultiplier: 1.2,
        birthdayBonusPoints: 100,
        benefits: [
          "คะแนนเพิ่ม 20%",
          "โบนัสวันเกิด 100 คะแนน",
          "สิทธิ์ชิงโชคพิเศษ",
        ],
        color: "#9CA3AF",
        sortOrder: 2,
      },
    }),
    prisma.memberTier.upsert({
      where: { id: "tier_gold" },
      update: {},
      create: {
        id: "tier_gold",
        name: "Gold",
        nameTh: "ทอง",
        minLifetimePoints: 5000,
        pointMultiplier: 1.5,
        birthdayBonusPoints: 200,
        benefits: [
          "คะแนนเพิ่ม 50%",
          "โบนัสวันเกิด 200 คะแนน",
          "สิทธิ์ชิงโชค x2",
          "ของขวัญพิเศษ",
        ],
        color: "#F59E0B",
        sortOrder: 3,
      },
    }),
    prisma.memberTier.upsert({
      where: { id: "tier_platinum" },
      update: {},
      create: {
        id: "tier_platinum",
        name: "Platinum",
        nameTh: "แพลตตินัม",
        minLifetimePoints: 15000,
        pointMultiplier: 2.0,
        birthdayBonusPoints: 500,
        benefits: [
          "คะแนนเพิ่ม 100%",
          "โบนัสวันเกิด 500 คะแนน",
          "สิทธิ์ชิงโชค x3",
          "ของขวัญพิเศษ VIP",
          "บริการลูกค้าพิเศษ",
        ],
        color: "#8B5CF6",
        sortOrder: 4,
      },
    }),
  ]);
  console.log(`✅ Created ${tiers.length} member tiers`);

  // -------------------------------------------------------
  // ADMIN USER
  // -------------------------------------------------------
  const hashedPassword = await bcrypt.hash("Admin@1234", 12);
  const admin = await prisma.adminUser.upsert({
    where: { email: "admin@totalpoint.com" },
    update: {},
    create: {
      email: "admin@totalpoint.com",
      name: "Super Admin",
      password: hashedPassword,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // -------------------------------------------------------
  // SAMPLE REWARDS
  // -------------------------------------------------------
  const rewards = await Promise.all([
    prisma.reward.upsert({
      where: { id: "reward_voucher_50" },
      update: {},
      create: {
        id: "reward_voucher_50",
        name: "Discount Voucher 50 THB",
        nameTh: "คูปองส่วนลด 50 บาท",
        description: "ใช้ส่วนลด 50 บาทสำหรับการสั่งซื้อครั้งต่อไป",
        type: "COUPON",
        pointsCost: 500,
        stock: null,
        maxPerMember: 5,
        couponValue: 50,
        couponType: "FIXED",
        expiryDays: 30,
      },
    }),
    prisma.reward.upsert({
      where: { id: "reward_voucher_100" },
      update: {},
      create: {
        id: "reward_voucher_100",
        name: "Discount Voucher 100 THB",
        nameTh: "คูปองส่วนลด 100 บาท",
        description: "ใช้ส่วนลด 100 บาทสำหรับการสั่งซื้อครั้งต่อไป",
        type: "COUPON",
        pointsCost: 1000,
        stock: null,
        maxPerMember: 3,
        couponValue: 100,
        couponType: "FIXED",
        expiryDays: 30,
      },
    }),
    prisma.reward.upsert({
      where: { id: "reward_hommall_100" },
      update: {},
      create: {
        id: "reward_hommall_100",
        name: "Hommall Coupon 100 THB",
        nameTh: "คูปอง Hommall 100 บาท",
        description: "ใช้ส่วนลด 100 บาทใน Hommall",
        type: "HOMMALL_COUPON",
        pointsCost: 1200,
        stock: 100,
        maxPerMember: 2,
        hommallCouponValue: 100,
        hommallCouponType: "FIXED",
        expiryDays: 60,
      },
    }),
  ]);
  console.log(`✅ Created ${rewards.length} rewards`);

  // -------------------------------------------------------
  // SYSTEM CONFIG
  // -------------------------------------------------------
  await prisma.systemConfig.upsert({
    where: { key: "DEFAULT_TIER_ID" },
    update: {},
    create: {
      key: "DEFAULT_TIER_ID",
      value: { value: "tier_member" },
      description: "Default tier ID for new members",
    },
  });
  await prisma.systemConfig.upsert({
    where: { key: "POINTS_PER_BAHT" },
    update: {},
    create: {
      key: "POINTS_PER_BAHT",
      value: { value: 1 },
      description: "Base points earned per 1 THB",
    },
  });
  await prisma.systemConfig.upsert({
    where: { key: "MIN_PURCHASE_AMOUNT" },
    update: {},
    create: {
      key: "MIN_PURCHASE_AMOUNT",
      value: { value: 200 },
      description: "Minimum purchase amount (THB) to earn points",
    },
  });
  console.log("✅ Created system config");

  console.log("🎉 Seeding completed!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
