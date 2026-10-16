import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { reportId } = await req.json();

    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
    }

    // Call Dodo Payments Checkout Sessions API
    const response = await fetch("https://api.dodopayments.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DODO_PAYMENTS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_id: process.env.DODO_PRODUCT_ID,
        environment: process.env.DODO_ENVIRONMENT || "test_mode",
        quantity: 1,
        metadata: {
          reportId,
        },
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/results/${reportId}?status=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/results/${reportId}?status=cancelled`,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Dodo API Error:", errorData);
      return NextResponse.json({ error: "Failed to create checkout session" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ checkoutUrl: data.checkout_url });
  } catch (error) {
    console.error("Checkout route error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
