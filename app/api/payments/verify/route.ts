import { NextRequest, NextResponse } from "next/server";
import { PaymentError } from "@/server/payments/dodo";
import { getOrder, limitPaymentRequests } from "@/server/payments/orders";
import { verifyCheckoutOrder } from "@/server/payments/fulfillment";
import { getServerReport, hasReportAccess, extractEntitlementTokenFromHeaders, isPaymentInfrastructureConfigured } from "@/server/security/reportAccess";
import { paymentFailure } from "@/server/payments/http";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (typeof body?.orderId !== "string" || typeof body?.reportId !== "string") throw new PaymentError(400, "Report and order references are required.");
    if (!isPaymentInfrastructureConfigured()) throw new PaymentError(503, "Payment verification is temporarily unavailable. Please try again later.");
    const [order, report] = await Promise.all([getOrder(body.orderId), getServerReport(body.reportId)]);
    if (!report || !hasReportAccess(report, extractEntitlementTokenFromHeaders(req.headers))) throw new PaymentError(403, "This browser does not have access to that report.");
    if (!order || order.reportId !== report.reportId) throw new PaymentError(404, "Checkout order not found for this report.");
    await limitPaymentRequests(report.reportId, "verify", 30);
    const result = await verifyCheckoutOrder(order);
    return NextResponse.json({ success: true, ...result, reportId: report.reportId }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return paymentFailure(error); }
}
