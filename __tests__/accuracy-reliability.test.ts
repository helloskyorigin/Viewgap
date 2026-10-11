import { describe, test } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { extractWebsiteSnapshot } from "@/lib/content-extractor";
import { validateAndScoreAnalysis } from "@/services/validation/analysisValidator";
import { mapBackendToFrontend } from "@/lib/mapper";
import {
  evaluateComparisonEligibility,
  METHODOLOGY_VARIABILITY_NOTE,
} from "@/lib/recheck-compare";
import { SIGNAL_WEIGHTS } from "@/services/scoring/scoringConfig";
import { calculateOverallScore } from "@/services/scoring/calculateOverallScore";
import ResultsScreen from "@/components/ResultsScreen";

const ARE_YOU_RARE_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>AreYouRare — Check how rare you really are</title>
    <meta name="description" content="Discover your statistical rarity across traits and habits." />
  </head>
  <body>
    <header>
      <nav>
        <a href="/">AreYouRare</a>
        <a href="#faq" class="btn">FAQ</a>
        <a href="/about">About</a>
      </nav>
    </header>
    <main>
      <div class="max-w-4xl mx-auto py-16">
        <h1>Check how rare you really are</h1>
        <p>Enter a few traits to calculate how uncommon your combination is.</p>
        <button type="button" class="bg-blue-600 text-white px-6 py-3 rounded">Find My Rarity</button>
      </div>
      <section id="faq">
        <h2>Frequently Asked Questions</h2>
        <p>How does the calculation work? Enter your everyday traits, habits, and preferences to see how uncommon your combination is compared with general statistical distributions.</p>
      </section>
    </main>
  </body>
</html>
`;

describe("Accuracy & Reliability — Phase 1 & Phase 2 Regression Suite", () => {
  test("TEST 1: Static HTML homepage analysis contains no unsupported viewport-observation claims", () => {
    const snapshot = extractWebsiteSnapshot(ARE_YOU_RARE_HTML, { baseUrl: "https://areyourare.ai.studio" });
    const rawAi: any = {
      verdict: { text: "AreYouRare invites visitors to test trait rarity." },
      first_seconds: {
        what_is_this: {
          status: "partly_clear",
          explanation: "It is an interactive rarity checker.",
          evidence_refs: [{ source: "hero", text: "Check how rare you really are" }],
        },
        who_is_it_for: {
          status: "partly_clear",
          explanation: "General internet users.",
          evidence_refs: [],
        },
        what_will_i_get: {
          status: "understandable",
          explanation: "A rarity calculation.",
          evidence_refs: [
            {
              source: "hero",
              text: "Enter a few traits to calculate how uncommon your combination is.",
            },
          ],
        },
        why_should_i_care: {
          status: "unclear",
          explanation: "No external proof points present.",
          evidence_refs: [],
        },
        what_should_i_do_next: {
          status: "clear",
          explanation: "Click Find My Rarity.",
          evidence_refs: [{ source: "cta", text: "Find My Rarity" }],
        },
      },
      visitor_thought: {
        text: "I can enter my traits and click Find My Rarity to see how uncommon my combination is.",
        confidence: "medium",
      },
      website_message: {
        summary: "AreYouRare calculates how uncommon a visitor's combination of traits is.",
        confidence: "medium",
        evidence_refs: [{ source: "hero", text: "Check how rare you really are" }],
      },
      signals: {
        first_impression: {
          score: 68,
          status: "partly_clear",
          explanation: "Headline states the general idea.",
          confidence: "medium",
          evidence_refs: [{ source: "hero", text: "Check how rare you really are" }],
        },
        audience: {
          score: 55,
          status: "partly_clear",
          explanation: "No explicit audience is stated.",
          confidence: "medium",
          evidence_refs: [],
        },
        value: {
          score: 70,
          status: "understandable",
          explanation: "Explains trait calculation.",
          confidence: "medium",
          evidence_refs: [
            {
              source: "hero",
              text: "Enter a few traits to calculate how uncommon your combination is.",
            },
          ],
        },
        trust: {
          score: 45,
          status: "needs_work",
          explanation: "No third-party proof points identified.",
          confidence: "medium",
          evidence_refs: [],
        },
        action: {
          score: 82,
          status: "clear",
          explanation: "Find My Rarity CTA is clear.",
          confidence: "high",
          evidence_refs: [{ source: "cta", text: "Find My Rarity" }],
        },
      },
      risks: [],
      priority_fix: {
        title: "Clarify methodology and target audience in the hero section",
        reason: "Visitors do not see what data source powers the rarity calculation.",
        impact: "high",
        what_you_say_now: "Check how rare you really are",
        clearer_direction:
          "Check how rare you really are — Compare your traits against our statistical survey.",
      },
      other_improvements: [],
    };

    const validated = validateAndScoreAnalysis(rawAi, snapshot);
    const mapped = mapBackendToFrontend(validated, "https://areyourare.ai.studio", snapshot);

    assert.equal(mapped.evidence.locationTag, "Homepage · Extracted content");

    const html = renderToStaticMarkup(
      React.createElement(ResultsScreen, {
        rawUrl: "https://areyourare.ai.studio",
        analysisData: mapped,
        previousCheckRecord: null,
        onBackToLanding: () => {},
        onRunNewCheck: () => {},
        onOpenFaq: () => {},
        onOpenPricing: () => {},
      })
    );

    assert.ok(html.includes("Homepage · Extracted content"));
    assert.ok(html.includes("Based on accessible homepage content"));
    assert.ok(!html.includes("Homepage · Above the fold"));
    assert.ok(!html.includes("Evaluated from initial above-the-fold view"));
    assert.ok(!html.includes("EXTRACTED ABOVE-THE-FOLD TEXT"));
  });

  test("TEST 2: Legitimate recommendation mentioning 'above the fold' remains unchanged", () => {
    const snapshot = extractWebsiteSnapshot(ARE_YOU_RARE_HTML, { baseUrl: "https://areyourare.ai.studio" });
    const rawAi: any = {
      verdict: { text: "Homepage is understandable." },
      first_seconds: {},
      signals: {
        first_impression: { score: 75, status: "understandable", explanation: "Clear." },
        audience: { score: 60, status: "partly_clear", explanation: "Broad." },
        value: { score: 75, status: "understandable", explanation: "Clear." },
        trust: { score: 50, status: "could_be_stronger", explanation: "Limited." },
        action: { score: 80, status: "clear", explanation: "Clear." },
      },
      priority_fix: {
        title: "Make your primary CTA visible above the fold.",
        reason: "Keeping the primary call-to-action visible above the fold reduces scrolling friction.",
        impact: "high",
        what_you_say_now: "Check how rare you really are",
        clearer_direction: "Calculate your trait rarity in 30 seconds",
      },
      other_improvements: [],
    };

    const validated = validateAndScoreAnalysis(rawAi, snapshot);
    const mapped = mapBackendToFrontend(validated, "https://areyourare.ai.studio", snapshot);

    assert.equal(mapped.recommendation.subhead, "Make your primary CTA visible above the fold.");
    assert.ok(mapped.recommendation.explanation.includes("above the fold"));
  });

  test("TEST 3: Previous score 66, current score 59 -> -7 points, 'Scored lower', neutral interpretation", () => {
    const res = evaluateComparisonEligibility({
      currentDomainInput: "areyourare.ai.studio",
      currentScore: 59,
      currentSignals: [],
      previousRecord: {
        domain: "areyourare.ai.studio",
        score: 66,
        date: "2026-10-01T10:00:00.000Z",
      },
      currentTimestampMs: Date.parse("2026-10-11T10:00:00.000Z"),
    });

    assert.equal(res.isEligible, true);
    assert.equal(res.overall?.beforeScore, 66);
    assert.equal(res.overall?.afterScore, 59);
    assert.equal(res.overall?.delta, -7);
    assert.equal(res.overall?.deltaText, "-7 points");
    assert.equal(res.overall?.status, "Scored lower");
    assert.equal(
      res.interpretationSummary,
      "Your latest assessment scored 7 points lower."
    );
    assert.equal(
      res.methodologyNote,
      "Scores are AI-assisted assessments of accessible website content and may vary between scans. A score change does not necessarily mean visitor behavior has changed."
    );
  });

  test("TEST 4: Previous score 59, current score 66 -> +7 points, 'Scored higher', neutral interpretation", () => {
    const res = evaluateComparisonEligibility({
      currentDomainInput: "areyourare.ai.studio",
      currentScore: 66,
      currentSignals: [],
      previousRecord: {
        domain: "areyourare.ai.studio",
        score: 59,
        date: "2026-10-01T10:00:00.000Z",
      },
      currentTimestampMs: Date.parse("2026-10-11T10:00:00.000Z"),
    });

    assert.equal(res.isEligible, true);
    assert.equal(res.overall?.beforeScore, 59);
    assert.equal(res.overall?.afterScore, 66);
    assert.equal(res.overall?.delta, 7);
    assert.equal(res.overall?.deltaText, "+7 points");
    assert.equal(res.overall?.status, "Scored higher");
    assert.equal(
      res.interpretationSummary,
      "Your latest assessment scored 7 points higher."
    );
  });

  test("TEST 5: Previous score 59, current score 59 -> 0 points, 'Score unchanged'", () => {
    const res = evaluateComparisonEligibility({
      currentDomainInput: "areyourare.ai.studio",
      currentScore: 59,
      currentSignals: [],
      previousRecord: {
        domain: "areyourare.ai.studio",
        score: 59,
        date: "2026-10-01T10:00:00.000Z",
      },
      currentTimestampMs: Date.parse("2026-10-11T10:00:00.000Z"),
    });

    assert.equal(res.isEligible, true);
    assert.equal(res.overall?.delta, 0);
    assert.equal(res.overall?.deltaText, "0 points");
    assert.equal(res.overall?.status, "Score unchanged");
  });

  test("TEST 6: Previous signal scores unavailable -> No fabricated historical signals, shows 'Not recorded in previous check.'", () => {
    const res = evaluateComparisonEligibility({
      currentDomainInput: "areyourare.ai.studio",
      currentScore: 59,
      currentSignals: [
        { id: "first-impression", score: 65 },
        { id: "audience", score: 52 },
        { id: "value", score: 64 },
        { id: "trust", score: 45 },
        { id: "action", score: 75 },
      ],
      previousRecord: {
        domain: "areyourare.ai.studio",
        score: 66,
        date: "2026-10-01T10:00:00.000Z",
      },
      currentTimestampMs: Date.parse("2026-10-11T10:00:00.000Z"),
    });

    assert.equal(res.hasHistoricalSignalScores, false);
    for (const sig of res.signals) {
      assert.equal(sig.beforeScore, null);
      assert.equal(sig.delta, null);
      assert.equal(sig.status, "Not recorded in previous check.");
    }
  });

  test("TEST 7: Comparison of two different domains -> Not treated as a valid same-website comparison", () => {
    const res = evaluateComparisonEligibility({
      currentDomainInput: "areyourare.ai.studio",
      currentScore: 59,
      currentSignals: [],
      previousRecord: {
        domain: "different-domain.com",
        score: 66,
        date: "2026-10-01T10:00:00.000Z",
      },
      currentTimestampMs: Date.parse("2026-10-11T10:00:00.000Z"),
    });

    assert.equal(res.isEligible, false);
    assert.equal(res.unavailableReason, "domain_mismatch");
    assert.equal(res.overall, null);
  });

  test("TEST 8: Missing or invalid previous score -> Graceful fallback", () => {
    const resMissing = evaluateComparisonEligibility({
      currentDomainInput: "areyourare.ai.studio",
      currentScore: 59,
      previousRecord: null,
    });
    assert.equal(resMissing.isEligible, false);
    assert.equal(resMissing.unavailableReason, "no_previous_report");

    const resInvalid = evaluateComparisonEligibility({
      currentDomainInput: "areyourare.ai.studio",
      currentScore: 59,
      previousRecord: {
        domain: "areyourare.ai.studio",
        score: 140, // out of bounds
        date: "2026-10-01T10:00:00.000Z",
      },
    });
    assert.equal(resInvalid.isEligible, false);
    assert.equal(resInvalid.unavailableReason, "invalid_score");
  });

  test("TEST 9: Phase 1 accuracy regression tests (CTA, visitor thought, unsupported claims, audience contradiction, evidence relevance)", () => {
    const snapshot = extractWebsiteSnapshot(ARE_YOU_RARE_HTML, { baseUrl: "https://areyourare.ai.studio" });

    // 1. Primary CTA is "Find My Rarity", never "FAQ"
    assert.equal(snapshot.hero.primaryCta?.text, "Find My Rarity");
    assert.notEqual(snapshot.hero.primaryCta?.text, "FAQ");

    // 2. Feed adversarial AI output containing all 5 Phase 1 bugs
    const buggyAi: any = {
      verdict: {
        text: "Compare your traits against thousands of profiles and get detailed breakdowns with comparison charts.",
      },
      first_seconds: {
        what_is_this: {
          status: "clear",
          explanation: "Clear.",
          evidence_refs: [{ source: "hero", text: "Check how rare you really are" }],
        },
        who_is_it_for: {
          status: "clear",
          explanation: "Everyone is targeted.",
          evidence_refs: [{ source: "hero", text: "Check how rare you really are" }],
        },
        what_will_i_get: {
          status: "understandable",
          explanation: "Rarity score.",
          evidence_refs: [
            {
              source: "hero",
              text: "Enter a few traits to calculate how uncommon your combination is.",
            },
          ],
        },
        why_should_i_care: {
          status: "unclear",
          explanation: "No proof.",
          evidence_refs: [],
        },
        what_should_i_do_next: {
          status: "clear",
          explanation: "Click FAQ.",
          evidence_refs: [{ source: "cta", text: "FAQ" }],
        },
      },
      visitor_thought: {
        // Broken visitor thought with raw H1 + meta fragment
        text: "AreYouRare raises a clear question right away: H1: Check how rare you really are, though a first-time visitor still needs clearer proof.",
        confidence: "high",
      },
      website_message: {
        summary: "Compare your traits against thousands of profiles with comparison charts.",
        confidence: "high",
        evidence_refs: [],
      },
      signals: {
        first_impression: {
          score: 82,
          status: "clear",
          explanation: "Clear headline.",
          confidence: "high",
          evidence_refs: [{ source: "hero", text: "Check how rare you really are" }],
        },
        audience: {
          score: 80,
          status: "clear",
          explanation: "Target audience is clearly specified.",
          confidence: "high",
          evidence_refs: [{ source: "hero", text: "Check how rare you really are" }],
        },
        value: {
          score: 74,
          status: "understandable",
          explanation: "Clear value.",
          confidence: "medium",
          evidence_refs: [
            {
              source: "hero",
              text: "Enter a few traits to calculate how uncommon your combination is.",
            },
          ],
        },
        trust: {
          score: 45,
          status: "needs_work",
          explanation: "Limited trust.",
          confidence: "medium",
          evidence_refs: [],
        },
        action: {
          score: 85,
          status: "clear",
          explanation: "Primary CTA is FAQ.",
          confidence: "high",
          evidence_refs: [{ source: "cta", text: "FAQ" }],
        },
      },
      risks: [],
      priority_fix: {
        title: "Clarify value proposition",
        reason: "Explain what users get.",
        impact: "high",
        what_you_say_now: "Check how rare you really are",
        clearer_direction:
          "Compare your traits against thousands of profiles to get detailed breakdowns and comparison charts.",
      },
      other_improvements: [
        {
          title: "Improve subheadline",
          explanation: "Add specifics.",
          copyable_suggestion:
            "Discover your exact mathematical rarity across thousands of verified profiles.",
        },
      ],
    };

    const validated = validateAndScoreAnalysis(buggyAi, snapshot);
    const mapped = mapBackendToFrontend(validated, "https://areyourare.ai.studio", snapshot);

    // Issue 1: Primary CTA in findings is "Find My Rarity", never "FAQ"
    assert.ok(
      mapped.evidence.clearFindings.some((f) => f.includes("Find My Rarity")),
      "Expected Find My Rarity in clearFindings"
    );
    assert.ok(
      !mapped.evidence.clearFindings.some((f) => f.includes("“FAQ”")),
      "Must not report FAQ as Primary action"
    );

    // Issue 2: Visitor thought has no 'H1:' or meta-fragment
    assert.ok(!mapped.visitorThought.includes("H1:"));
    assert.ok(!/raises a clear question right away/i.test(mapped.visitorThought));

    // Issue 3: Unsupported marketing claims ('thousands of profiles', 'comparison charts', 'exact mathematical') are rejected
    assert.ok(!/thousands of profiles/i.test(mapped.recommendation.strongerDirection));
    assert.ok(!/comparison charts/i.test(mapped.recommendation.strongerDirection));
    assert.ok(!/thousands of profiles/i.test(mapped.verdict));
    assert.ok(
      !mapped.otherImprovements.some((imp) =>
        /thousands of verified profiles|exact mathematical/i.test(imp.copyableSuggestion || "")
      )
    );

    // Issue 4 & 5: Audience is not marked Clear when no explicit audience exists, and no contradiction between clearFindings and missingFindings
    assert.ok(validated.signals.audience.score < 70);
    assert.notEqual(validated.first_seconds.who_is_it_for.status, "clear");
    assert.notEqual(validated.first_seconds.who_is_it_for.status, "understandable");
    assert.ok(
      !mapped.evidence.clearFindings.some((f) => /^Target audience:/i.test(f)),
      "Must not include Target audience in clearFindings when audience is not explicitly stated"
    );
    assert.ok(
      mapped.evidence.missingFindings.some((f) => /Target audience/i.test(f)),
      "Expected missing target audience finding"
    );
  });

  test("TEST 10 & TEST 12: Supporting Pages Insights and all 15 report sections preserved", () => {
    const snapshot = extractWebsiteSnapshot(ARE_YOU_RARE_HTML, { baseUrl: "https://areyourare.ai.studio" });
    const validated = validateAndScoreAnalysis({} as any, snapshot);
    const mapped = mapBackendToFrontend(validated, "https://areyourare.ai.studio", snapshot, {
      status: "available",
      pagesAnalyzed: [
        {
          url: "https://areyourare.ai.studio/about",
          category: "about",
          title: "About AreYouRare",
        },
      ],
      messageConsistency: {
        status: "clarifies_homepage",
        assessment: "The About page clarifies how trait combinations are evaluated.",
        evidence: [
          {
            sourceUrl: "https://areyourare.ai.studio/about",
            excerpt: "About AreYouRare methodology and probability estimates.",
            claimBasis: "directly_observed_element",
          },
        ],
      },
      limitations: [],
    });

    const html = renderToStaticMarkup(
      React.createElement(ResultsScreen, {
        rawUrl: "https://areyourare.ai.studio",
        analysisData: mapped,
        previousCheckRecord: null,
        onBackToLanding: () => {},
        onRunNewCheck: () => {},
        onOpenFaq: () => {},
        onOpenPricing: () => {},
      })
    );

    assert.ok(html.includes('id="supporting-pages-insights-section"'));
    assert.ok(html.includes('id="five-signal-overview-section"'));
    assert.ok(html.includes('id="biggest-issue-section"'));
    assert.ok(html.includes('id="priority-fix-section"'));
    assert.ok(html.includes('id="priority-fix-plan-section"'));
    assert.ok(html.includes('id="copy-ready-improvements-section"'));
    assert.ok(html.includes('id="other-improvements-section"'));
    assert.ok(html.includes('id="first-seconds-section"'));
    assert.ok(html.includes('id="visitor-impression-section"'));
    assert.ok(html.includes('id="complete-homepage-evidence-section"'));
    assert.ok(html.includes('id="five-detailed-signals-section"'));
    assert.ok(html.includes('id="communication-risks-section"'));
    assert.ok(html.includes('id="recheck-compare-section"'));
  });

  test("TEST 11: Existing homepage scoring formula and weights remain unchanged", () => {
    assert.deepEqual(SIGNAL_WEIGHTS, {
      first_impression: 0.25,
      audience: 0.2,
      value: 0.25,
      trust: 0.15,
      action: 0.15,
    });

    const calc = calculateOverallScore({
      first_impression: 80,
      audience: 60,
      value: 80,
      trust: 60,
      action: 80,
    });
    // 80*0.25 + 60*0.20 + 80*0.25 + 60*0.15 + 80*0.15 = 20 + 12 + 20 + 9 + 12 = 73
    assert.equal(calc.overallScore, 73);
  });
});
