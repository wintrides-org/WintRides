import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripeClient";

type ThinEvent = {
  id: string;
  type: string;
};

type ThinEventCapableStripeClient = {
  parseThinEvent?: (payload: string, signature: string, webhookSecret: string) => ThinEvent;
  v2: {
    core: {
      events: {
        retrieve: (id: string) => Promise<{ id: string; type: string }>;
      };
    };
  };
};

/**
 * POST /api/stripe/webhooks
 *
 * Handles thin webhook events for Stripe Connect V2 accounts.
 * Signature verification is mandatory and implemented before processing any event.
 */
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing Stripe signature header." },
        { status: 400 }
      );
    }

    const payload = await request.text();
    const webhookSecret = getStripeWebhookSecret();
    const stripeClient = getStripeClient();

    // Parse and verify a thin event payload using Stripe's thin-event parser.
    // Cast to `any` so this sample stays compatible while SDK typing evolves.
    const thinEventClient = stripeClient as unknown as ThinEventCapableStripeClient;
    if (!thinEventClient.parseThinEvent) {
      return NextResponse.json(
        {
          error:
            "Current Stripe SDK does not expose parseThinEvent. Upgrade Stripe SDK and retry webhook setup.",
        },
        { status: 500 }
      );
    }
    const thinEvent = thinEventClient.parseThinEvent(payload, signature, webhookSecret);

    // Thin payloads omit most business details, so we always retrieve the canonical event object.
    const event = await thinEventClient.v2.core.events.retrieve(thinEvent.id);
    const eventType = event.type;

    // Handle account requirements changes (documents, fields, deadlines, etc.).
    if (eventType === "v2.core.account[requirements].updated") {
      console.log(
        "[Stripe thin event] requirements updated:",
        JSON.stringify(
          {
            eventId: event.id,
            type: event.type,
          },
          null,
          2
        )
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Handle capability changes for recipient configuration.
    if (eventType === "v2.core.account[configuration.recipient].capability_status_updated") {
      console.log(
        "[Stripe thin event] recipient capability status updated:",
        JSON.stringify(
          {
            eventId: event.id,
            type: event.type,
          },
          null,
          2
        )
      );
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Unknown events are acknowledged so Stripe does not retry indefinitely.
    return NextResponse.json(
      { received: true, ignored: true, type: eventType },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
