# Total Point – LINE Mini App Loyalty System

ระบบสะสมแต้มผ่าน LINE Mini App สำหรับลูกค้าที่ซื้อสินค้าผ่าน Shopee, TikTok Shop, Lazada, งานออกบูธ และ Hommall

---

## สถาปัตยกรรม

```
total point/
├── apps/
│   ├── admin/          # Admin portal (Next.js 14) – port 3000
│   └── liff/           # LINE Mini App (Next.js 14) – port 3001
├── packages/
│   └── database/       # Prisma schema + seed
├── docker-compose.yml  # PostgreSQL + Redis + Adminer
└── .env.example
```

---

## ต้องการ

- Node.js ≥ 20
- pnpm ≥ 9
- Docker Desktop (สำหรับ PostgreSQL + Redis)
- LINE Developer Account

---

## ขั้นตอนติดตั้ง

### 1. ติดตั้ง dependencies

```bash
corepack enable
pnpm install
```

### 2. ตั้งค่า environment variables

```bash
cp .env.example .env
```

แก้ไขค่าใน `.env`:

| Variable | คำอธิบาย |
|---|---|
| `DATABASE_URL` | PostgreSQL URL (default: ใช้ Docker ด้านล่าง) |
| `NEXTAUTH_SECRET` | Secret สุ่ม 32+ ตัวอักษร |
| `LINE_CHANNEL_ACCESS_TOKEN` | Token จาก LINE OA Messaging API |
| `LINE_CHANNEL_SECRET` | Secret จาก LINE Messaging API |
| `LINE_LOGIN_CHANNEL_ID` | Channel ID สำหรับ LINE Login |
| `LINE_LOGIN_CHANNEL_SECRET` | Channel Secret สำหรับ LINE Login |
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID จาก LINE Developers Console |
| `GOOGLE_VISION_API_KEY` | (Optional) สำหรับ OCR อัตโนมัติ |

### 3. เริ่ม Docker (database)

```bash
docker-compose up -d
```

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Adminer UI: `http://localhost:8080`

### 4. ตั้งค่าฐานข้อมูล

```bash
pnpm db:push     # สร้าง schema
pnpm db:seed     # seed ข้อมูลเริ่มต้น (tier + admin user + rewards)
```

**Admin credentials เริ่มต้น:**
- Email: `admin@totalpoint.com`
- Password: `Admin@1234`

### 5. รัน dev server

```bash
pnpm dev
```

- Admin: http://localhost:3000
- LIFF: http://localhost:3001

---

## การตั้งค่า LINE Developers

### LINE Login Channel (สำหรับ LIFF)

1. ไปที่ https://developers.line.biz/console/
2. สร้าง **LINE Login** channel ใหม่
3. เพิ่ม LIFF app:
   - Endpoint URL: `https://your-domain.com` (หรือ ngrok URL สำหรับ dev)
   - Scope: `profile openid`
4. คัดลอก **LIFF ID** → ใส่ใน `NEXT_PUBLIC_LIFF_ID`

### Messaging API Channel (สำหรับ push notification)

1. สร้าง **Messaging API** channel ใหม่
2. Issue **Channel access token** (long-lived)
3. คัดลอก Channel access token + Channel secret → ใส่ใน `.env`

---

## สำหรับ development กับ ngrok

```bash
# Terminal 1
ngrok http 3001

# ใช้ URL จาก ngrok เป็น LIFF Endpoint URL
# เช่น https://abc123.ngrok.io
```

---

## โครงสร้างฐานข้อมูล

| Table | คำอธิบาย |
|---|---|
| `MemberTier` | ระดับสมาชิก (Member/Silver/Gold/Platinum) |
| `Member` | ข้อมูลสมาชิก LINE |
| `Campaign` | แคมเปญสะสมแต้ม |
| `Reward` | ของรางวัล |
| `OrderSubmission` | ออเดอร์ที่ส่งมาตรวจสอบ |
| `PointLedger` | บัญชีแต้ม (append-only) |
| `Redemption` | การแลกของรางวัล |
| `LotteryConfig` | ใบโปรยลุ้นโชค |
| `BoothSession` | Session งานออกบูธ |
| `AdminUser` | ผู้ดูแลระบบ |
| `AuditLog` | Log การกระทำ |
| `HommallSync` | Sync ข้อมูล Hommall |
| `SystemConfig` | ค่าตั้งระบบ |

---

## Prisma commands

```bash
pnpm db:push        # push schema ไปยัง database
pnpm db:migrate     # สร้าง migration file
pnpm db:studio      # เปิด Prisma Studio UI
pnpm db:seed        # seed ข้อมูลเริ่มต้น
```

---

## Deploy

### Vercel (Recommended)

```bash
# Admin app
vercel --cwd apps/admin

# LIFF app  
vercel --cwd apps/liff
```

ตั้งค่า environment variables ใน Vercel Dashboard ให้ครบ

### Docker

```bash
pnpm build
```

---

## คุณสมบัติหลัก

- **สะสมแต้ม** จากออเดอร์ Shopee / TikTok Shop / Lazada / Hommall
- **อัปโหลดสลิป** พร้อม OCR อัตโนมัติ (Google Vision API)
- **งานออกบูธ** สะสมแต้มด้วย Booth Event Code
- **ระบบ Tier** 4 ระดับ พร้อม multiplier คะแนน
- **Birthday Reward** คะแนนพิเศษวันเกิด
- **Admin Dashboard** พร้อม Chart สถิติ real-time
- **แคมเปญ** กำหนดเงื่อนไขการสะสมแต้มได้ยืดหยุ่น
- **Hommall Integration** แลกคูปอง Hommall ด้วยแต้ม
