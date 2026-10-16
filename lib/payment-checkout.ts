export interface PendingCheckout { reportId: string; orderId: string; sessionId: string }
const accessKey = (id: string) => `sl_report_access_v1:${id}`;
const pendingKey = (id: string) => `sl_pending_checkout_v1:${id}`;

export function rememberReportAccess(reportId: string, token: string) {
  window.localStorage.setItem(accessKey(reportId), token);
}
export function readReportToken(reportId: string): string | null {
  try { return window.localStorage.getItem(accessKey(reportId)); } catch { return null; }
}
export function readPendingCheckout(reportId: string): PendingCheckout | null {
  try {
    const value = JSON.parse(window.localStorage.getItem(pendingKey(reportId)) || "null");
    return value?.reportId === reportId && typeof value.orderId === "string" ? value : null;
  } catch { return null; }
}
export function clearPendingCheckout(reportId: string) {
  try { window.localStorage.removeItem(pendingKey(reportId)); } catch { /* Verification remains recoverable from the return URL. */ }
}

export async function paymentJson(url: string, init?: RequestInit) {
  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", signal: init?.signal || AbortSignal.timeout(20000) });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      // Preserve user-initiated cancellation; don't turn it into a payment failure.
      if (init?.signal?.aborted) throw error;
      throw new Error("Payment server took too long to respond. Please retry; no charge has been confirmed.");
    }
    throw new Error("Unable to reach the payment server. Check your connection and retry.");
  }

  // Older deployments or an upstream 500/404 can return HTML, not JSON.
  // Keep the actual HTTP failure visible instead of showing a misleading generic message.
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage =
      typeof data?.error === "string" && data.error.trim()
        ? data.error.trim()
        : typeof data?.message === "string" && data.message.trim()
          ? data.message.trim()
          : null;
    if (providerMessage) throw new Error(providerMessage);
    if (response.status === 404) {
      throw new Error("Payment API is missing on this deployment (HTTP 404). Deploy the latest StrangerLens backend.");
    }
    if (response.status === 502 || response.status === 504) {
      throw new Error(`Payment provider is not responding (HTTP ${response.status}). Please retry shortly.`);
    }
    throw new Error(`Payment server returned HTTP ${response.status}. Check the deployment's payment configuration and server logs.`);
  }
  if (!data || typeof data !== "object") {
    throw new Error("Payment server returned an invalid response. Make sure the latest StrangerLens payment backend is deployed.");
  }
  return data;
}

export async function startReportCheckout(reportId: string, reportToken?: string) {
  const token = reportToken || readReportToken(reportId);
  if (!token) throw new Error("Report session is missing. Please run a new website check.");
  // Save proof of ownership before navigation. Without working browser storage,
  // the anonymous customer cannot safely recover this report after checkout.
  try { rememberReportAccess(reportId, token); }
  catch { throw new Error("Please allow browser storage before opening checkout so your report access can be saved."); }
  const data = await paymentJson("/api/payments/checkout", {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ reportId }),
  });
  if (data.alreadyPaid === true) return { alreadyPaid: true as const };
  const url = new URL(data.checkoutUrl || "", window.location.origin);
  if (url.protocol !== "https:" || !["checkout.dodopayments.com", "test.checkout.dodopayments.com"].includes(url.hostname) ||
      typeof data.orderId !== "string" || typeof data.sessionId !== "string" || data.reportId !== reportId) {
    throw new Error("Payment provider did not return a valid checkout session.");
  }
  window.localStorage.setItem(pendingKey(reportId), JSON.stringify({ reportId, orderId: data.orderId, sessionId: data.sessionId }));
  return { alreadyPaid: false as const, checkoutUrl: url.toString() };
}
