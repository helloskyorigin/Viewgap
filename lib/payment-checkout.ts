/** Reject API errors before navigation: never redirect to undefined. */
export async function requestCheckoutUrl(reportId: string): Promise<string> {
  const response = await fetch("/api/payments/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reportId }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || typeof data?.checkoutUrl !== "string" || !data.checkoutUrl.startsWith("https://")) {
    throw new Error(data?.error || "Could not start checkout. Please try again.");
  }
  return data.checkoutUrl;
}
