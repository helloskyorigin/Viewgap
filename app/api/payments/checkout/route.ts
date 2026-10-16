import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { dodoRequest, getDodoConfig, PaymentError } from "@/server/payments/dodo";
import { getServerReport, hasReportAccess, extractEntitlementTokenFromHeaders, isPaymentInfrastructureConfigured, verifyServerEntitlement } from "@/server/security/reportAccess";
import { type CheckoutOrder, withCheckoutLock, getRecentOrder, saveOrder, indexOrder, limitPaymentRequests } from "@/server/payments/orders";
import { paymentFailure } from "@/server/payments/http";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body?.reportId !== "string" || !/^[a-f0-9-]{36}$/.test(body.reportId)) throw new PaymentError(400, "Run a website check before opening checkout.");
    if (!isPaymentInfrastructureConfigured()) throw new PaymentError(503, "Checkout is temporarily unavailable. Please try again later.");
    const config = getDodoConfig();
    const report = await getServerReport(body.reportId);
    const token = extractEntitlementTokenFromHeaders(req.headers);
    if (!report || !hasReportAccess(report, token)) throw new PaymentError(403, "This report session is unavailable. Please run a new check.");
    await limitPaymentRequests(report.reportId, "checkout", 10);
    if ((await verifyServerEntitlement(report.reportId, token)).authorized) return NextResponse.json({ alreadyPaid: true });

    return await withCheckoutLock(config.environment, report.reportId, async () => {
      const recent = await getRecentOrder(config.environment, report.reportId);
      if (recent?.checkoutUrl && recent.sessionId && recent.productId === config.productId &&
          Date.now() - recent.createdAt < 30 * 60 * 1000 && !["succeeded", "failed", "cancelled", "refunded", "revoked"].includes(recent.status || "")) {
        return NextResponse.json({ checkoutUrl: recent.checkoutUrl, sessionId: recent.sessionId, orderId: recent.orderId, reportId: report.reportId, environment: config.environment });
      }
      const order: CheckoutOrder = { orderId: randomUUID(), reportId: report.reportId, environment: config.environment, productId: config.productId, createdAt: Date.now() };
      await saveOrder(order); // Must persist the binding BEFORE creating a payable session.
      const returnUrl = new URL("/", process.env.NEXT_PUBLIC_APP_URL?.trim() || req.nextUrl.origin);
      if (!["http:", "https:"].includes(returnUrl.protocol)) throw new PaymentError(503, "Checkout return address is not configured correctly.");
      returnUrl.searchParams.set("checkout", "return");
      returnUrl.searchParams.set("reportId", report.reportId);
      returnUrl.searchParams.set("orderId", order.orderId);
      const data = await dodoRequest<{ checkout_url: string | null; session_id: string }>("/checkouts", {
        method: "POST",
        body: JSON.stringify({ product_cart: [{ product_id: config.productId, quantity: 1 }], metadata: { reportId: report.reportId, orderId: order.orderId }, return_url: returnUrl.toString() }),
      });
      let checkoutUrl: URL;
      try { checkoutUrl = new URL(data.checkout_url || ""); } catch { throw new PaymentError(502, "Payment provider did not return a valid checkout URL."); }
      const expectedHost = config.environment === "test_mode" ? "test.checkout.dodopayments.com" : "checkout.dodopayments.com";
      if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== expectedHost || !/^cks_[a-zA-Z0-9_-]+$/.test(data.session_id)) throw new PaymentError(502, "Payment provider returned an invalid checkout session.");
      await saveOrder({ ...order, sessionId: data.session_id, checkoutUrl: checkoutUrl.toString() });
      await indexOrder(order);
      return NextResponse.json({ checkoutUrl: checkoutUrl.toString(), sessionId: data.session_id, orderId: order.orderId, reportId: report.reportId, environment: config.environment });
    });
  } catch (error) { return paymentFailure(error); }
}
