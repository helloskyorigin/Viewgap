import { NextRequest, NextResponse } from "next/server";
import { getDodoConfig } from "@/server/payments/dodo";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const reportId = body?.reportId;
  if (typeof reportId !== "string" || !reportId.trim()) {
    return NextResponse.json({ error: "Report ID is required" }, { status: 400 });
  }

  try {
    const { apiKey, productId, baseUrl } = getDodoConfig();
    // Results live at / and are restored from sessionStorage, not /results/[id].
    // Redirect parameters are never proof of payment.
    const returnUrl = new URL("/", process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin);
    returnUrl.searchParams.set("reportId", reportId.trim());
    const response = await fetch(`${baseUrl}/checkouts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        metadata: {
          reportId,
        },
        return_url: returnUrl.toString(),
      }),
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("Dodo checkout failed", { status: response.status });
      const error = response.status === 401 || response.status === 403
        ? "Payment provider authentication failed. Check the Dodo API key and test/live mode."
        : response.status === 400 || response.status === 404 || response.status === 422
          ? "Payment provider rejected checkout. Check the product ID and its test/live mode."
          : "Payment provider is temporarily unavailable. Please try again.";
      return NextResponse.json({ error }, { status: 502 });
    }
    if (typeof data?.checkout_url !== "string" || !data.checkout_url.startsWith("https://")) {
      return NextResponse.json({ error: "Payment provider did not return a valid checkout URL." }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl: data.checkout_url });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Payment configuration:")) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("Checkout request failed");
    return NextResponse.json({ error: "Could not connect to the payment provider. Please try again." }, { status: 502 });
  }
}
