import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../app/api/payments/checkout/route";
import { requestCheckoutUrl } from "../lib/payment-checkout";

async function main() {
  const savedEnv = { ...process.env };
  const originalFetch = globalThis.fetch;
  const request = (body: unknown) => new NextRequest("https://strangerlens.example/api/payments/checkout", {
    method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" },
  });
  let calls = 0;
  try {
    delete process.env.DODO_PAYMENTS_API_KEY;
    delete process.env.DODO_PRODUCT_ID;
    delete process.env.NEXT_PUBLIC_APP_URL;
    globalThis.fetch = async () => { calls++; throw new Error("Unexpected provider call"); };
    assert.equal((await POST(request({ reportId: 123 }))).status, 400);
    assert.equal((await POST(request({ reportId: "report-1" }))).status, 503);
    assert.equal(calls, 0);
    process.env.DODO_PAYMENTS_API_KEY = "test-key";
    process.env.DODO_PRODUCT_ID = "pdt_test";
    process.env.DODO_ENVIRONMENT = "invalid";
    assert.equal((await POST(request({ reportId: "report-1" }))).status, 503);
    assert.equal(calls, 0);

    for (const mode of ["test_mode", "live_mode"]) {
      process.env.DODO_ENVIRONMENT = mode;
      globalThis.fetch = async (url, init) => {
        assert.equal(url, `https://${mode === "test_mode" ? "test" : "live"}.dodopayments.com/checkouts`);
        assert.equal(init?.method, "POST");
        assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer test-key");
        const payload = JSON.parse(init?.body as string);
        assert.deepEqual(payload.product_cart, [{ product_id: "pdt_test", quantity: 1 }]);
        assert.deepEqual(payload.metadata, { reportId: "report-1" });
        assert.equal(payload.return_url, "https://strangerlens.example/?reportId=report-1");
        assert.equal(payload.success_url, undefined);
        assert.equal(payload.environment, undefined);
        return Response.json({ checkout_url: "https://test.checkout.dodopayments.com/session/cks_test" });
      };
      const response = await POST(request({ reportId: "report-1" }));
      assert.equal(response.status, 200);
      assert.equal((await response.json()).checkoutUrl, "https://test.checkout.dodopayments.com/session/cks_test");
    }
    globalThis.fetch = async () => new Response("<html>Unauthorized</html>", { status: 401 });
    const failed = await POST(request({ reportId: "report-1" }));
    assert.equal(failed.status, 502);
    assert.match((await failed.json()).error, /authentication failed/);
    globalThis.fetch = async () => Response.json({});
    assert.equal((await POST(request({ reportId: "report-1" }))).status, 502);
    globalThis.fetch = async () => { throw new Error("Connection refused"); };
    assert.equal((await POST(request({ reportId: "report-1" }))).status, 502);

    globalThis.fetch = async () => Response.json({ error: "Check test/live mode" }, { status: 502 });
    await assert.rejects(() => requestCheckoutUrl("report-1"), /Check test\/live mode/);
    globalThis.fetch = async () => Response.json({});
    await assert.rejects(() => requestCheckoutUrl("report-1"), /Could not start checkout/);
    globalThis.fetch = async () => Response.json({ checkoutUrl: "https://test.checkout.dodopayments.com/session/cks_test" });
    assert.equal(await requestCheckoutUrl("report-1"), "https://test.checkout.dodopayments.com/session/cks_test");
    console.log("PASS: Dodo checkout configuration, test/live API contract, return URL, provider failures, and client error handling.");
  } finally {
    globalThis.fetch = originalFetch;
    process.env = savedEnv;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
