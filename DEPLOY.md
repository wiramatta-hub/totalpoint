# คู่มือ Deploy ระบบ Total Point ขึ้น Production

## ภาพรวม Architecture Online

```
LINE Mini App (LIFF)          Admin Portal
app.your-domain.com    →    admin.your-domain.com
        ↓                            ↓
      Vercel                      Vercel
        └──────── API Calls ────────┘
                      ↓
              Supabase PostgreSQL
                      ↓
              Cloudflare R2 (รูปสลิป)
```

---

## บริการที่ต้องสมัคร (ฟรีทั้งหมด)

| บริการ | ใช้สำหรับ | Tier ฟรี |
|---|---|---|
| [Supabase](https://supabase.com) | PostgreSQL Database | 500MB, เพียงพอ |
| [Vercel](https://vercel.com) | Host ทั้ง 2 apps | Unlimited hobby |
| [Cloudflare R2](https://cloudflare.com) | เก็บรูปสลิป | 10GB/เดือน |
| [GitHub](https://github.com) | Code repository | Unlimited |
| [LINE Developers](https://developers.line.biz) | LINE Login + LIFF | ฟรี |

---

## ขั้นตอนที่ 1: Push โค้ดขึ้น GitHub

```bash
cd "/Users/songs/Documents/total point"

# Initialize git
git init
git add .
git commit -m "initial commit"

# สร้าง repo ใหม่ที่ github.com แล้ว copy URL มา
git remote add origin https://github.com/YOUR_USERNAME/total-point.git
git branch -M main
git push -u origin main
```

---

## ขั้นตอนที่ 2: ตั้งค่า Supabase (Database)

1. ไปที่ https://supabase.com → **Start your project**
2. สร้าง Organization ใหม่ → สร้าง Project ใหม่
   - Project name: `total-point`
   - Database Password: (จดไว้ในที่ปลอดภัย)
   - Region: **Southeast Asia (Singapore)**
3. รอ ~2 นาที ให้ project พร้อม
4. ไปที่ **Settings → Database → Connection string → URI**
5. คัดลอก connection string (ใส่ password ที่ตั้งไว้):
   ```
   postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
6. เก็บ URL นี้ไว้ใช้ในขั้นตอน Vercel

---

## ขั้นตอนที่ 3: ตั้งค่า Cloudflare R2 (File Storage)

1. ไปที่ https://dash.cloudflare.com → เลือก account → **R2 Object Storage**
2. คลิก **Create bucket**
   - Bucket name: `total-point-uploads`
   - Region: Asia Pacific
3. ไปที่ **R2 → Manage R2 API tokens** → **Create API token**
   - Permissions: **Object Read & Write**
   - จด: Account ID, Access Key ID, Secret Access Key
4. ตั้ง Custom Domain (ไม่บังคับ แต่แนะนำ):
   - bucket → **Settings → Custom domain** → ใส่ domain เช่น `cdn.your-domain.com`

---

## ขั้นตอนที่ 4: ตั้งค่า LINE Developers

### 4.1 สร้าง LINE Login Channel (สำหรับ LIFF)

1. ไปที่ https://developers.line.biz/console/
2. สร้าง Provider ใหม่ (ถ้ายังไม่มี)
3. สร้าง Channel → **LINE Login**
   - App type: **Web app**
4. บันทึก:
   - **Channel ID** (LINE_LOGIN_CHANNEL_ID)
   - **Channel Secret** (LINE_LOGIN_CHANNEL_SECRET)
5. ไปที่ **LIFF tab** → **Add** → ตั้งค่า:
   - Size: **Full**
   - Endpoint URL: `https://your-liff-app.vercel.app` (ใส่ชั่วคราวก่อน แก้ได้หลัง deploy)
   - Scope: **profile**, **openid**
   - Bot link feature: **Aggressive** (เชื่อม LINE OA)
6. บันทึก **LIFF ID** (NEXT_PUBLIC_LIFF_ID) — รูปแบบ: `1234567890-XXXXXXXX`

### 4.2 สร้าง Messaging API Channel (สำหรับ push notification)

1. สร้าง Channel → **Messaging API**
2. ไปที่ **Messaging API tab** → **Issue** Channel access token (long-lived)
3. บันทึก:
   - **Channel ID** (LINE_CHANNEL_ID)
   - **Channel secret** (LINE_CHANNEL_SECRET)
   - **Channel access token** (LINE_CHANNEL_ACCESS_TOKEN)

---

## ขั้นตอนที่ 5: Deploy Admin App ขึ้น Vercel

1. ไปที่ https://vercel.com → **Add New Project**
2. Import GitHub repo `total-point`
3. ตั้งค่า:
   - **Root Directory**: `apps/admin`
   - Framework: Next.js (auto-detect)
4. เพิ่ม **Environment Variables** ทั้งหมดนี้:

```
DATABASE_URL          = postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
NEXTAUTH_SECRET       = (สร้างด้วย: openssl rand -base64 32)
NEXTAUTH_URL          = https://your-admin-app.vercel.app

LINE_CHANNEL_ID       = (จาก Messaging API)
LINE_CHANNEL_SECRET   = (จาก Messaging API)
LINE_CHANNEL_ACCESS_TOKEN = (จาก Messaging API)
LINE_LOGIN_CHANNEL_ID = (จาก LINE Login)
LINE_LOGIN_CHANNEL_SECRET = (จาก LINE Login)

STORAGE_PROVIDER      = r2
R2_ACCOUNT_ID         = (จาก Cloudflare)
R2_ACCESS_KEY_ID      = (จาก Cloudflare R2)
R2_SECRET_ACCESS_KEY  = (จาก Cloudflare R2)
R2_BUCKET             = total-point-uploads
R2_PUBLIC_URL         = https://cdn.your-domain.com  (หรือ https://pub-xxx.r2.dev)

GOOGLE_VISION_API_KEY = (ถ้ามี — ไว้สำหรับ OCR อัตโนมัติ)
LIFF_URL              = https://your-liff-app.vercel.app  (แก้ทีหลัง)
API_URL               = https://your-admin-app.vercel.app
```

5. คลิก **Deploy**
6. หลัง deploy สำเร็จ — บันทึก URL ของ admin app

---

## ขั้นตอนที่ 6: อัป Database Schema

หลังจาก deploy admin app ครั้งแรก ต้องสร้าง table ในฐานข้อมูล:

```bash
# ใน local machine — ชี้ไปที่ Supabase production DB
cd "/Users/songs/Documents/total point"

# ตั้งค่า DATABASE_URL ชั่วคราวใน terminal
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres"

# Push schema
pnpm db:push

# Seed ข้อมูลเริ่มต้น (tier + admin user + rewards)
pnpm db:seed
```

**Admin credentials เริ่มต้น:** `admin@totalpoint.com` / `Admin@1234`  
⚠️ เปลี่ยน password ทันทีหลัง login ครั้งแรก

---

## ขั้นตอนที่ 7: Deploy LIFF App ขึ้น Vercel

1. ไปที่ Vercel → **Add New Project** (อีกครั้ง)
2. Import repo เดิม `total-point`
3. ตั้งค่า:
   - **Root Directory**: `apps/liff`
4. เพิ่ม Environment Variables:

```
NEXT_PUBLIC_LIFF_ID   = (LIFF ID จาก LINE Developers)
NEXT_PUBLIC_API_URL   = https://your-admin-app.vercel.app
```

5. คลิก **Deploy**
6. บันทึก LIFF app URL เช่น `https://total-point-liff.vercel.app`

---

## ขั้นตอนที่ 8: อัปเดต LINE Developers ด้วย URL จริง

1. ไปที่ LINE Developers Console → LINE Login Channel → LIFF tab
2. แก้ **Endpoint URL** เป็น: `https://total-point-liff.vercel.app`
3. ไปที่ Vercel Admin project → **Settings → Environment Variables**
4. อัปเดต `LIFF_URL` = `https://total-point-liff.vercel.app`
5. Redeploy admin app

---

## ขั้นตอนที่ 9: ทดสอบระบบ

### ทดสอบ Admin Portal
1. เปิด `https://your-admin-app.vercel.app`
2. Login ด้วย `admin@totalpoint.com` / `Admin@1234`
3. ตรวจสอบ Dashboard โหลดได้ปกติ

### ทดสอบ LINE Mini App
1. เปิด LINE → Scan QR Code จาก LIFF  
   URL สำหรับทดสอบ: `https://liff.line.me/[LIFF_ID]`
2. Login ด้วย LINE account
3. ทดสอบส่งออเดอร์ / อัปโหลดสลิป

---

## การตั้งค่า Domain ของตัวเอง (Optional)

ถ้ามี domain เช่น `totalpoint.th`:

| Subdomain | ชี้ไปที่ |
|---|---|
| `admin.totalpoint.th` | Vercel admin project |
| `app.totalpoint.th` | Vercel liff project |
| `cdn.totalpoint.th` | Cloudflare R2 bucket |

ตั้งค่าใน Vercel: **Project Settings → Domains → Add**

---

## Google Vision API (OCR อัตโนมัติ)

ถ้าต้องการให้ระบบอ่านสลิปอัตโนมัติ:

1. ไปที่ https://console.cloud.google.com
2. สร้าง Project ใหม่ → **Enable API → Cloud Vision API**
3. **Credentials → Create Credentials → API Key**
4. ใส่ใน Vercel admin: `GOOGLE_VISION_API_KEY = AIza...`

---

## สรุป URL ที่ต้องเก็บ

```
Admin Portal:   https://your-admin-app.vercel.app
LIFF App:       https://liff.line.me/[LIFF_ID]
Database:       Supabase Dashboard → [project]
Storage:        Cloudflare R2 Dashboard
```
