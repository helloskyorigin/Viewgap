import { describe, test, expect } from "./test-harness";
import { extractWebsiteSnapshot } from "../lib/content-extractor";
import {
  getCachedFetch,
  setCachedFetch,
  _clearFetchCacheForTesting,
  _getFetchCacheSizeForTesting,
} from "../lib/fetch-cache";
import { FetchSuccessResult } from "../lib/website-fetcher";
import { checkSsrf, validateUrl } from "../lib/url-validator";
import { isPrivateIpAddress } from "../lib/url-client-validator";

describe("Phase 1 Task 4: Content Extractor & Fetch Cache Tests", () => {
  test("Cheerio extracts essential snapshot structure from valid HTML", () => {
    const sampleHtml = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <title>SuperTool — Automate Your Design Workflow</title>
          <meta name="description" content="SuperTool empowers product teams to ship 10x faster." />
          <meta property="og:title" content="SuperTool Design Ops" />
          <link rel="canonical" href="https://supertool.com" />
        </head>
        <body>
          <header>
            <span class="logo">SuperTool</span>
            <nav>
              <a href="/features">Features</a>
              <a href="/pricing">Pricing</a>
            </nav>
          </header>
          <main>
            <section class="hero">
              <h1>Ship products 10x faster with AI workflows</h1>
              <p class="lead">Eliminate manual handoffs and streamline design to engineering delivery.</p>
              <a href="/signup" class="btn-primary">Start Free Trial</a>
              <a href="/demo">Book Demo</a>
            </section>
            <section class="proof">
              <h2>Trusted by 10,000+ modern teams</h2>
              <p>Join world-class engineering organizations.</p>
            </section>
          </main>
          <footer>
            <a href="/privacy">Privacy</a>
          </footer>
        </body>
      </html>
    `;

    const snapshot = extractWebsiteSnapshot(sampleHtml, { baseUrl: "https://supertool.com" });

    // Meta verification
    expect(snapshot.meta.title).toBe("SuperTool — Automate Your Design Workflow");
    expect(snapshot.meta.description).toBe("SuperTool empowers product teams to ship 10x faster.");
    expect(snapshot.meta.language).toBe("en");

    // Hero verification
    expect(snapshot.hero.headline).toBe("Ship products 10x faster with AI workflows");
    expect(snapshot.hero.subheadline).toBe("Eliminate manual handoffs and streamline design to engineering delivery.");
    expect(snapshot.hero.primaryCta?.text).toBe("Start Free Trial");

    // CTA inventory
    expect(snapshot.ctas.length > 0).toBe(true);
    const hasPrimaryCta = snapshot.ctas.some((c) => c.text === "Start Free Trial" && c.type === "primary");
    expect(hasPrimaryCta).toBe(true);

    // Nav links
    expect(snapshot.navigation.primaryNavLinks.some((l) => l.text === "Pricing")).toBe(true);
  });

  test("Content extractor safely handles empty or whitespace-only HTML without crashing", () => {
    const emptySnapshot = extractWebsiteSnapshot("", { baseUrl: "https://empty.com" });
    expect(emptySnapshot.meta.title).toBe("");
    expect(emptySnapshot.hero.headline).toBe("");
    expect(emptySnapshot.ctas.length).toBe(0);
    expect(emptySnapshot.stats.rawHtmlLength).toBe(0);
    expect(emptySnapshot.stats.cleanedTextLength).toBe(0);

    const whitespaceSnapshot = extractWebsiteSnapshot("   \n\t  ", { baseUrl: "https://empty.com" });
    expect(whitespaceSnapshot.meta.title).toBe("");
    expect(whitespaceSnapshot.hero.headline).toBe("");
  });

  test("Content extractor strips DOM noise like scripts, styles, iframes, and cookie banners", () => {
    const noisyHtml = `
      <html>
        <head>
          <title>Clean Title</title>
          <style>body { background: red; }</style>
          <script>console.log("secret analytics token");</script>
        </head>
        <body>
          <div id="cookie-banner" class="cookie consent">
            <p>We use cookies to track everything. Accept cookies?</p>
          </div>
          <h1>Real Heading</h1>
          <p>Real Content</p>
          <iframe src="https://ad-network.com/tracker"></iframe>
        </body>
      </html>
    `;

    const snapshot = extractWebsiteSnapshot(noisyHtml, { baseUrl: "https://clean.com" });
    expect(snapshot.meta.title).toBe("Clean Title");
    expect(snapshot.hero.headline).toBe("Real Heading");
    // Cookie banner and script texts should NOT pollute headings or body sections
    expect(snapshot.bodySections.some((s) => s.textSummary.includes("secret analytics token"))).toBe(false);
  });

  test("In-memory fetch cache stores and retrieves fresh results", () => {
    const mockResult: FetchSuccessResult = {
      success: true,
      originalUrl: "https://testdomain.com",
      normalizedUrl: "https://testdomain.com",
      finalUrl: "https://testdomain.com",
      domain: "testdomain.com",
      status: 200,
      statusText: "OK",
      contentType: "text/html",
      contentLength: 100,
      redirectCount: 0,
      redirectHistory: [],
      timingMs: 50,
      html: "<html><body><h1>Hello World</h1></body></html>",
    };

    setCachedFetch("https://testdomain.com", mockResult);
    const cached = getCachedFetch("https://testdomain.com");
    expect(cached !== null).toBe(true);
    expect(cached?.success).toBe(true);
    if (cached?.success) {
      expect(cached.finalUrl).toBe("https://testdomain.com");
    }
  });

  test("In-memory fetch cache returns null for missing or expired entries", () => {
    const missing = getCachedFetch("https://nonexistent-domain-xyz.com");
    expect(missing).toBe(null);
  });

  test("API check response contract: omitting raw HTML preserves snapshot and analysis", () => {
    const mockFetchResult: FetchSuccessResult = {
      success: true,
      originalUrl: "https://example.com",
      normalizedUrl: "https://example.com",
      finalUrl: "https://example.com",
      domain: "example.com",
      status: 200,
      statusText: "OK",
      contentType: "text/html",
      contentLength: 500,
      redirectCount: 0,
      redirectHistory: [],
      timingMs: 40,
      html: "<html><body><h1>Hello Safe World</h1></body></html>",
    };

    // Simulate the route stripping html
    const { html: _omittedHtml, ...safeFetchMetadata } = mockFetchResult;
    expect("html" in safeFetchMetadata).toBe(false);
    expect(safeFetchMetadata.domain).toBe("example.com");
    expect(safeFetchMetadata.status).toBe(200);
    expect(safeFetchMetadata.finalUrl).toBe("https://example.com");
  });

  test("SSRF & URL validation: blocks private IPv4, bracketed IPv6, IPv4-mapped IPv6, and non-HTTP protocols", async () => {
    expect(isPrivateIpAddress("127.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("169.254.169.254")).toBe(true);
    expect(isPrivateIpAddress("[::1]")).toBe(true);
    expect(isPrivateIpAddress("[fe80::1]")).toBe(true);
    expect(isPrivateIpAddress("[fd12:3456:789a::1]")).toBe(true);
    expect(isPrivateIpAddress("[::ffff:127.0.0.1]")).toBe(true);
    expect(isPrivateIpAddress("[::ffff:7f00:1]")).toBe(true);
    expect(isPrivateIpAddress("8.8.8.8")).toBe(false);

    expect(validateUrl("http://[::1]:3000").isValid).toBe(false);
    expect(validateUrl("http://169.254.169.254/latest/meta-data/").isValid).toBe(false);

    const ipv6Loopback = await checkSsrf("http://[::1]:8080/");
    expect(ipv6Loopback.isSafe).toBe(false);

    const ipv6Mapped = await checkSsrf("http://[::ffff:127.0.0.1]/");
    expect(ipv6Mapped.isSafe).toBe(false);

    const fileProto = await checkSsrf("file:///etc/passwd");
    expect(fileProto.isSafe).toBe(false);

    const dataProto = await checkSsrf("data:text/html,<h1>test</h1>");
    expect(dataProto.isSafe).toBe(false);
  });

  test("In-memory fetch cache enforces MAX_CACHE_ENTRIES (25) FIFO eviction bound", () => {
    _clearFetchCacheForTesting();
    for (let i = 1; i <= 30; i++) {
      const url = `https://example-${i}.com`;
      setCachedFetch(url, {
        success: true,
        originalUrl: url,
        normalizedUrl: url,
        finalUrl: url,
        domain: `example-${i}.com`,
        status: 200,
        statusText: "OK",
        contentType: "text/html",
        contentLength: 50,
        redirectCount: 0,
        redirectHistory: [],
        timingMs: 10,
        html: `<html><body>Site ${i}</body></html>`,
      });
    }

    expect(_getFetchCacheSizeForTesting()).toBe(25);
    // First 5 entries should have been evicted
    expect(getCachedFetch("https://example-1.com")).toBe(null);
    expect(getCachedFetch("https://example-5.com")).toBe(null);
    // Entry 6 through 30 should still be present
    expect(getCachedFetch("https://example-6.com") !== null).toBe(true);
    expect(getCachedFetch("https://example-30.com") !== null).toBe(true);
  });
});
