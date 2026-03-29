import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMemberFromRequest } from "@/lib/line";
import { createHash } from "crypto";
import { calculatePoints, awardPoints } from "@/lib/points";
import { uploadFile } from "@/lib/storage";
import { PointTransactionType } from "@prisma/client";

/**
 * POST /api/orders/receipt
 * Upload receipt/slip image for points
 */
export async function POST(req: NextRequest) {
  try {
    const memberPayload = await getMemberFromRequest(req);
    if (!memberPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;
    const channel = (formData.get("channel") as string) ?? "MANUAL";
    const campaignId = formData.get("campaignId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "ไฟล์ต้องเป็นรูปภาพ JPG, PNG หรือ WebP เท่านั้น" },
        { status: 400 }
      );
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "ไฟล์มีขนาดใหญ่เกิน 10 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");

    // Check duplicate receipt
    const dupCheck = await prisma.orderSubmission.findUnique({
      where: { receiptHash: hash },
    });
    if (dupCheck) {
      return NextResponse.json(
        { error: "ใบเสร็จนี้ถูกส่งแล้ว" },
        { status: 409 }
      );
    }

    // Upload file to cloud storage (S3 / R2 / local)
    const ext = file.name.split(".").pop() ?? "jpg";
    const storageKey = `receipts/${memberPayload.memberId}/${Date.now()}.${ext}`;
    const receiptUrl = await uploadFile(buffer, storageKey, file.type);

    // Get member info
    const member = await prisma.member.findUnique({
      where: { id: memberPayload.memberId },
      include: { tier: true },
    });
    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Try OCR (Google Vision or mock)
    let ocrResult = null;
    let ocrConfidence = 0;
    let parsedAmount: number | null = null;

    const googleVisionKey = process.env.GOOGLE_VISION_API_KEY;
    if (googleVisionKey) {
      try {
        const ocrResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requests: [
                {
                  image: { content: buffer.toString("base64") },
                  features: [{ type: "TEXT_DETECTION" }],
                },
              ],
            }),
          }
        );
        if (ocrResponse.ok) {
          const ocrData = await ocrResponse.json();
          const rawText =
            ocrData.responses?.[0]?.fullTextAnnotation?.text ?? "";
          ocrResult = { rawText };
          ocrConfidence = 0.9;

          // Basic amount extraction
          const amountMatch = rawText.match(/(?:ยอดรวม|รวม|Total|TOTAL)[^\d]*(\d[\d,]+)/i);
          if (amountMatch) {
            parsedAmount = parseFloat(amountMatch[1].replace(/,/g, ""));
          }
        }
      } catch (ocrError) {
        console.warn("OCR failed:", ocrError);
      }
    }

    // Get active campaign
    const campaign = campaignId
      ? await prisma.campaign.findFirst({
          where: {
            id: campaignId,
            status: "ACTIVE",
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        })
      : await prisma.campaign.findFirst({
          where: {
            status: "ACTIVE",
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
            channels: { has: channel as "SHOPEE" | "TIKTOK" | "LAZADA" | "BOOTH" | "HOMMALL" | "MANUAL" },
          },
          orderBy: { pointsPerBaht: "desc" },
        });

    const confidenceThreshold = parseFloat(
      process.env.OCR_CONFIDENCE_THRESHOLD ?? "0.85"
    );
    const isAutoApprove =
      ocrConfidence >= confidenceThreshold && parsedAmount !== null;

    const { points, lotteryTickets } = isAutoApprove
      ? calculatePoints({
          purchaseAmount: parsedAmount!,
          channel: channel as "SHOPEE" | "TIKTOK" | "LAZADA" | "BOOTH" | "HOMMALL" | "MANUAL",
          campaign,
          tier: member.tier,
        })
      : { points: 0, lotteryTickets: 0 };

    const submission = await prisma.orderSubmission.create({
      data: {
        memberId: member.id,
        campaignId: campaign?.id,
        channel: channel as "SHOPEE" | "TIKTOK" | "LAZADA" | "BOOTH" | "HOMMALL" | "MANUAL",
        purchaseAmount: parsedAmount ?? undefined,
        receiptUrl,
        receiptHash: hash,
        receiptMimeType: file.type,
        ocrResult: ocrResult ?? undefined,
        ocrConfidence,
        ocrProcessedAt: ocrResult ? new Date() : undefined,
        status: isAutoApprove ? "APPROVED" : "PENDING",
        pointsEarned: isAutoApprove ? points : undefined,
        lotteryTickets: isAutoApprove ? lotteryTickets : undefined,
        ...(isAutoApprove
          ? {
              reviewedAt: new Date(),
              reviewNote: `Auto-approved (OCR confidence: ${(ocrConfidence * 100).toFixed(0)}%)`,
            }
          : {}),
      },
    });

    if (isAutoApprove && points > 0) {
      await awardPoints({
        memberId: member.id,
        points,
        type: PointTransactionType.EARN_PURCHASE,
        description: `ซื้อสินค้า ${parsedAmount ? `฿${parsedAmount}` : ""} (ตรวจสอบอัตโนมัติ)`,
        referenceId: submission.id,
        referenceType: "OrderSubmission",
        orderSubmissionId: submission.id,
      });
    }

    return NextResponse.json({
      submission: {
        id: submission.id,
        status: submission.status,
        pointsEarned: submission.pointsEarned,
        lotteryTickets: submission.lotteryTickets,
        requiresReview: !isAutoApprove,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/receipt error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
