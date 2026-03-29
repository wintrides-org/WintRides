import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/drivers/:id/reviews - public review list + rating summary for a driver.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driverId } = await params;
    // Driver whose public review profile is being viewed.

    // Fetch summary + recent visible reviews in parallel for faster response.
    const [driverInfo, reviews] = await Promise.all([
      prisma.driverInfo.findUnique({
        where: { userId: driverId },
        select: { averageRating: true, ratingCount: true },
      }),
      prisma.driverReview.findMany({
        where: {
          driverId,
          // Only show reviews flagged as visible.
          isVisible: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          stars: true,
          reviewText: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        summary: {
          averageRating: driverInfo?.averageRating ?? 0,
          ratingCount: driverInfo?.ratingCount ?? 0,
        },
        reviews,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching driver reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch driver reviews." },
      { status: 500 }
    );
  }
}
