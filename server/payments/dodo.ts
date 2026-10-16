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
    environment: environment as "test_mode" | "live_mode",
    apiKey,
    productId,
    baseUrl: environment === "live_mode"
      ? "https://live.dodopayments.com"
      : "https://test.dodopayments.com",
  };
}

export class PaymentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function dodoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const config = getDodoConfig();
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json", ...init?.headers },
      signal: AbortSignal.timeout(15000), cache: "no-store",
    });
  } catch { throw new PaymentError(502, "Could not connect to the payment provider. Please try again."); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // Only log the HTTP status and a short, non-sensitive provider error code.
    // Dodo responses may include customer data or error details, so never log
    // or forward arbitrary response text to the browser.
    const code = typeof data?.code === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(data.code)
      ? data.code : undefined;
    console.error("Dodo API rejected request", { status: response.status, ...(code ? { code } : {}) });
    if (response.status === 401 || response.status === 403) {
      throw new PaymentError(502, "Dodo authentication failed. Check that the configured API key belongs to the selected test/live environment.");
    }
    if ([400, 404, 422].includes(response.status)) {
      throw new PaymentError(502, "Dodo rejected the checkout. Confirm that your $5 product ID and API key are both from the same Dodo test/live environment and that the product is active.");
    }
    throw new PaymentError(502, "Dodo could not create the checkout session. Please try again or contact support.");
  }
  if (!data) throw new PaymentError(502, "Payment provider returned an invalid response. Please try again.");
  return data as T;
}
