import { NextResponse } from "next/server";
import { isPaymentInfrastructureConfigured } from "@/server/security/reportAccess";
import { isDurableStorageConfigured } from "@/server/storage/paymentStore";

export const dynamic = "force-dynamic";
export function GET() {
  const environment = process.env.DODO_ENVIRONMENT?.trim() === "live_mode" ? "live_mode" : "test_mode";
  const checkoutEnabled = isPaymentInfrastructureConfigured();
  // Safe readiness checks only: never return credential values.
  // On test mode, help the owner distinguish missing database setup from a missing Dodo key/product.
  const setup = environment === "test_mode" ? {
    dodoConfigured: Boolean(process.env.DODO_PAYMENTS_API_KEY?.trim() && process.env.DODO_PRODUCT_ID?.trim()),
    durableStorageConfigured: isDurableStorageConfigured(),
  } : undefined;
  return NextResponse.json({
    checkoutEnabled,
    environment,
    ...(setup ? { setup } : {}),
  }, { headers: { "Cache-Control": "no-store" } });
}
