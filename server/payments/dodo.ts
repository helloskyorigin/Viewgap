/** Secret configuration stays on the server. Environment selects the API host. */
export function getDodoConfig() {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY?.trim();
  const productId = process.env.DODO_PRODUCT_ID?.trim();
  const environment = process.env.DODO_ENVIRONMENT?.trim() || "test_mode";
  if (!apiKey || !productId) {
    throw new Error("Payment configuration: DODO_PAYMENTS_API_KEY and DODO_PRODUCT_ID are required.");
  }
  if (environment !== "test_mode" && environment !== "live_mode") {
    throw new Error("Payment configuration: DODO_ENVIRONMENT must be test_mode or live_mode.");
  }
  return {
    apiKey,
    productId,
    baseUrl: environment === "live_mode"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com",
  };
}
