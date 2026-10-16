import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { session_id } = await req.json();

    if (!session_id) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    // Call Dodo Payments Checkout Sessions API to verify session status
    const response = await fetch(`https://api.dodopayments.com/v1/checkout/sessions/${session_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to verify payment session" }, { status: response.status });
    }

    const data = await response.json();
    
    // Verify status (assuming Dodo returns status)
    if (data.status === "completed") {
      return NextResponse.json({ success: true, verified: true });
    } else {
      return NextResponse.json({ success: true, verified: false });
    }
  } catch (error) {
    console.error("Verification route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
