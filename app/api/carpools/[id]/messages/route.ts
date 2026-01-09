import { NextRequest, NextResponse } from "next/server";
import { getMessagesByCarpoolId, addMessage } from "@/lib/mockCarpools";

// GET /api/carpools/[id]/messages - Get messages for a carpool
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const messages = getMessagesByCarpoolId(id);

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

// POST /api/carpools/[id]/messages - Send a message in a carpool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { userId, content } = body;

    if (!userId || !content) {
      return NextResponse.json(
        { error: "userId and content are required" },
        { status: 400 }
      );
    }

    if (content.trim().length === 0) {
      return NextResponse.json(
        { error: "Message content cannot be empty" },
        { status: 400 }
      );
    }

    const message = addMessage(id, userId, content);

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

