import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/mockUsers";

const REVIEW_WINDOW_DAYS = 7;

// Reads session token from either cookie or Authorization header.
// This matches existing auth behavior used across your API routes.
function getSessionToken(request: NextRequest): string | null {
  return (
    request.cookies.get("sessionToken")?.value ||
    request.headers.get("authorization")?.replace("Bearer ", "") ||
    null
  );
}

// Calculates whether "now" is still within the allowed review window.
function isWithinReviewWindow(completedAt: Date): boolean {
  const reviewDeadline = new Date(completedAt.getTime() + REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return Date.now() <= reviewDeadline.getTime();
}

function hasPrismaCode(error: unknown, code: string): boolean {
  if (!error || typeof error !== "object") return false;
  return "code" in error && (error as { code?: string }).code === code;
}

// GET /api/reviews?riderId=:id - list reviews written by a rider.
export async function GET(request: NextRequest) {
  try {
    // We intentionally scope this endpoint to rider-owned data only.
    // A rider can fetch only their own submitted reviews.
    const riderId = request.nextUrl.searchParams.get("riderId");
    if (!riderId) {
      return NextResponse.json({ error: "riderId is required." }, { status: 400 });
    }

    const token = getSessionToken(request);
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const session = await getSession(token);
    if (!session || session.userId !== riderId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
    }

    // Return only fields needed by the ride-history page to disable duplicate review forms.
    const reviews = await prisma.driverReview.findMany({
      where: { riderId },
      select: { rideRequestId: true, id: true, stars: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ reviews }, { status: 200 });
  } catch (error) {
    console.error("Error listing rider reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews." }, { status: 500 });
  }
}

// POST /api/reviews - create one review for a completed ride.
export async function POST(request: NextRequest) {
  try {
    // 1) Authenticate request.
    const token = getSessionToken(request);
    if (!token) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const session = await getSession(token);
    if (!session) {
      return NextResponse.json({ error: "Invalid or expired session." }, { status: 401 });
    }

    // 2) Parse and validate request body.
    const body = (await request.json()) as {
      rideRequestId?: string;
      stars?: number;
      reviewText?: string;
    };

    const rideRequestId = body?.rideRequestId?.trim();
    const reviewText = body?.reviewText?.trim() || null;
    const stars = Number(body?.stars);

    if (!rideRequestId) {
      return NextResponse.json({ error: "rideRequestId is required." }, { status: 400 });
    }

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return NextResponse.json({ error: "stars must be an integer between 1 and 5." }, { status: 400 });
    }

    // 3) Load ride and enforce all domain rules:
    //    - only the rider who took the ride can review
    //    - ride must be completed
    //    - ride must have an assigned driver
    //    - review must be within 7 days of completion
    const ride = await prisma.rideRequest.findUnique({
      where: { id: rideRequestId },
      select: {
        id: true,
        requesterId: true,
        acceptedDriverId: true,
        status: true,
        completedAt: true,
      },
    });

    if (!ride) {
      return NextResponse.json({ error: "Ride not found." }, { status: 404 });
    }

    if (ride.requesterId !== session.userId) {
      return NextResponse.json({ error: "Only the ride requester can review this ride." }, { status: 403 });
    }

    if (ride.status !== "COMPLETED" || !ride.completedAt || !ride.acceptedDriverId) {
      return NextResponse.json({ error: "Only completed rides can be reviewed." }, { status: 409 });
    }

    if (!isWithinReviewWindow(ride.completedAt)) {
      return NextResponse.json({ error: "Review window expired (7 days)." }, { status: 409 });
    }

    try {
      // 4) Write review + update driver rating aggregates in one transaction
      //    so the summary always matches raw reviews.
      //    The same transaction also creates a notification for the driver,
      //    which lets the driver dashboard alert feed show the new review.
      const created = await prisma.$transaction(async (tx) => {
        const review = await tx.driverReview.create({
          data: {
            rideRequestId: ride.id,
            riderId: ride.requesterId,
            driverId: ride.acceptedDriverId as string,
            stars,
            reviewText,
            isVisible: true,
          },
        });

        const driverInfo = await tx.driverInfo.findUnique({
          where: { userId: ride.acceptedDriverId as string },
          select: { ratingCount: true, ratingSum: true },
        });

        if (!driverInfo) {
          throw new Error("Driver profile is missing.");
        }

        // Recompute cached aggregates from previous values + new stars.
        const nextRatingCount = driverInfo.ratingCount + 1;
        const nextRatingSum = driverInfo.ratingSum + stars;
        const nextAverageRating = nextRatingCount === 0 ? 0 : nextRatingSum / nextRatingCount;

        await tx.driverInfo.update({
          where: { userId: ride.acceptedDriverId as string },
          data: {
            ratingCount: nextRatingCount,
            ratingSum: nextRatingSum,
            averageRating: nextAverageRating,
          },
        });

        await tx.notification.create({
          data: {
            userId: ride.acceptedDriverId as string,
            type: "REVIEW_RECEIVED",
            message: `A rider left you a ${stars}-star review.`,
            rideRequestId: ride.id,
          },
        });

        return review;
      });

      return NextResponse.json({ review: created }, { status: 201 });
    } catch (error: unknown) {
      // Prisma unique constraint violation for rideRequestId => duplicate review attempt.
      if (hasPrismaCode(error, "P2002")) {
        return NextResponse.json({ error: "This ride already has a review." }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json({ error: "Failed to create review." }, { status: 500 });
  }
}
