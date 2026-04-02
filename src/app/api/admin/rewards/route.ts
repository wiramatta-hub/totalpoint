import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/admin/rewards — create a new reward
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, required_points, image_url } = body as {
      title: string;
      required_points: number;
      image_url?: string;
    };

    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!required_points || typeof required_points !== "number" || required_points < 1) {
      return NextResponse.json({ error: "required_points must be a positive number" }, { status: 400 });
    }

    const reward = await prisma.reward.create({
      data: {
        title: title.trim(),
        required_points,
        image_url: image_url ?? null,
      },
    });

    return NextResponse.json({ reward }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/rewards]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
