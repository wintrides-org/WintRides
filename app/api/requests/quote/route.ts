import { NextRequest, NextResponse } from "next/server";
import {
  buildEstimates,
  buildQuote,
  type QuoteInput,
} from "@/lib/requestValidation";

// POST /api/requests/quote - validate input and return estimates without persisting.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuoteInput;
    const { data, errors } = buildQuote(body);

    if (errors || !data) {
      return NextResponse.json(
        { error: "Invalid request", details: errors },
        { status: 400 }
      );
    }

    const estimates = buildEstimates(data.partySize);

    return NextResponse.json(
      {
        quote: {
          request: data,
          estimates,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error generating request quote:", error);
    return NextResponse.json(
      { error: "Failed to generate quote" },
      { status: 500 }
    );
  }
}
