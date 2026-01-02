import { NextRequest, NextResponse } from "next/server";
import { getCarpoolById, updateCarpool } from "@/lib/mockCarpools";

// GET /api/carpools/[id] - Get a single carpool
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const carpool = getCarpoolById(id);

    if (!carpool) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error fetching carpool:", error);
    return NextResponse.json(
      { error: "Failed to fetch carpool" },
      { status: 500 }
    );
  }
}

// PATCH /api/carpools/[id] - Update a carpool
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const carpool = updateCarpool(id, body);

    if (!carpool) {
      return NextResponse.json(
        { error: "Carpool not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ carpool }, { status: 200 });
  } catch (error) {
    console.error("Error updating carpool:", error);
    return NextResponse.json(
      { error: "Failed to update carpool" },
      { status: 500 }
    );
  }
}

