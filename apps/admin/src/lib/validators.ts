import { z } from "zod";

export const campaignSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อแคมเปญ"),
  nameTh: z.string().min(1, "กรุณาระบุชื่อแคมเปญภาษาไทย"),
  description: z.string().optional(),
  type: z.enum(["PURCHASE", "BOOTH", "ACTIVITY", "BIRTHDAY"]),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "ENDED"]).default("DRAFT"),
  startDate: z.string().datetime({ offset: true }),
  endDate: z.string().datetime({ offset: true }),
  pointsPerBaht: z.number().min(0).default(1),
  minPurchaseAmount: z.number().min(0).default(0),
  maxPointsPerOrder: z.number().int().positive().nullable().optional(),
  maxOrdersPerDay: z.number().int().positive().nullable().optional(),
  pointMultiplier: z.number().min(0.1).max(100).default(1),
  channels: z
    .array(z.enum(["SHOPEE", "TIKTOK", "LAZADA", "BOOTH", "HOMMALL", "MANUAL"]))
    .min(1, "เลือกช่องทางอย่างน้อย 1 ช่องทาง"),
  isBoothEvent: z.boolean().default(false),
  boothEventCode: z.string().optional().nullable(),
  boothBonusPoints: z.number().int().min(0).default(0),
  hasLottery: z.boolean().default(false),
  lotteryPurchasePerTicket: z.number().positive().nullable().optional(),
  rules: z.record(z.unknown()).optional().nullable(),
});

export const rewardSchema = z.object({
  name: z.string().min(1),
  nameTh: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["PHYSICAL", "COUPON", "HOMMALL_COUPON", "PRIVILEGE", "LOTTERY_TICKET"]),
  pointsCost: z.number().int().min(1),
  stock: z.number().int().positive().nullable().optional(),
  maxPerMember: z.number().int().positive().nullable().optional(),
  maxPerDay: z.number().int().positive().nullable().optional(),
  expiryDays: z.number().int().positive().nullable().optional(),
  couponPrefix: z.string().optional().nullable(),
  couponValue: z.number().positive().nullable().optional(),
  couponType: z.enum(["PERCENT", "FIXED"]).nullable().optional(),
  hommallCouponValue: z.number().positive().nullable().optional(),
  hommallCouponType: z.enum(["PERCENT", "FIXED"]).nullable().optional(),
  isActive: z.boolean().default(true),
});

export const orderSubmitSchema = z.object({
  campaignId: z.string().optional(),
  channel: z.enum(["SHOPEE", "TIKTOK", "LAZADA", "BOOTH", "HOMMALL", "MANUAL"]),
  orderNumber: z.string().min(1, "กรุณาระบุเลขคำสั่งซื้อ"),
  purchaseAmount: z.number().positive("ยอดซื้อต้องมากกว่า 0"),
  purchaseDate: z.string().datetime({ offset: true }).optional(),
  boothSessionId: z.string().optional(),
});

export const verificationActionSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().optional(),
  pointsOverride: z.number().int().min(0).optional(), // manual override
});

export const adminAdjustPointsSchema = z.object({
  memberId: z.string().min(1),
  points: z.number().int().refine((n) => n !== 0, "คะแนนต้องไม่เป็น 0"),
  reason: z.string().min(1, "กรุณาระบุเหตุผล"),
});

export const memberRegisterSchema = z.object({
  lineUserId: z.string().min(1),
  lineDisplayName: z.string().optional(),
  linePictureUrl: z.string().url().optional(),
  phone: z.string().regex(/^0\d{8,9}$/, "เบอร์โทรไม่ถูกต้อง").optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthDate: z.string().optional(),
});

export type CampaignInput = z.infer<typeof campaignSchema>;
export type RewardInput = z.infer<typeof rewardSchema>;
export type OrderSubmitInput = z.infer<typeof orderSubmitSchema>;
export type VerificationActionInput = z.infer<typeof verificationActionSchema>;
export type MemberRegisterInput = z.infer<typeof memberRegisterSchema>;
