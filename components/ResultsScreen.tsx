"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {LEGAL_CONFIG} from "@/lib/legal-config";
import {
  Link2,
  ArrowRight,
  ArrowDown,
  Check,
  X,
  Sparkles,
  RefreshCw,
  Share2,
  Download,
  Info,
  Zap,
  Shield,
  Users,
  Eye,
  ChevronRight,
  ChevronDown,
  MinusCircle,
  Copy,
  CheckCircle2,
  BarChart2,
  AlertCircle,
  Clock,
  ExternalLink,
  Lock,
  Mail,
  Menu,
  FileText,
  MoreVertical,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  type StoredHistoryRecord,
  normalizeComparisonDomain,
  evaluateComparisonEligibility,
  syncReportWithHistoryStorage,
  METHODOLOGY_VARIABILITY_NOTE,
} from "@/lib/recheck-compare";
import { SIGNAL_WEIGHTS } from "@/services/scoring/scoringConfig";
import { type SupportingContext } from "@/types/supportingContext";

export interface AnalysisData {
  domain: string;
  score: number;
  scoreStatus: "Needs improvement" | "Good" | "Needs work" | "Excellent";
  verdict: string;
  verdictSubtext: string;
  quickSignals: Array<{
    label: string;
    type: "clear" | "amber" | "coral";
  }>;
  firstSeconds: Array<{
    question: string;
    label: string;
    type: "clear" | "partly" | "unclear";
  }>;
  visitorThought: string;
  evidence: {
    locationTag: string;
    homepageExcerpt: string;
    clearFindings: string[];
    missingFindings: string[];
  };
  signals: Array<{
    id: string;
    title: string;
    score: number;
    badgeText: string;
    badgeType: "clear" | "amber" | "coral";
    description: string;
    icon: string;
  }>;
  websiteMessage?: {
    summary: string;
    confidence: "high" | "medium" | "low";
  };
  risks?: Array<{
    category: string;
    severity: "high" | "medium" | "low";
    title: string;
    description: string;
    why_it_matters: string;
  }>;
  recommendation: {
    title: string;
    subhead: string;
    explanation: string;
    impact?: "high" | "medium";
    currentDirection: string;
    strongerDirection: string;
  };
  otherImprovements: Array<{
    id: string;
    title: string;
    description: string;
    whyItMatters: string;
    whatToImprove: string;
    copyableSuggestion?: string;
    icon: string;
    color: string;
  }>;
  supportingContext?: SupportingContext;
  isFreeTierOnly?: boolean;
  lockedPreviewCounts?: {
    actionSteps: number;
    secondaryFixes: number;
    copyRewrites: number;
    totalRisks: number;
  };
  isPartialAccess?: boolean;
  isAccessError?: boolean;
  checkedAt?: string;
}

interface ResultsScreenProps {
  rawUrl: string;
  analysisData?: Partial<AnalysisData>;
  previousCheckRecord?: Partial<StoredHistoryRecord> | null;
  isUnlocked?: boolean;
  onBackToLanding: () => void;
  onRunNewCheck: () => void;
  onOpenFaq: () => void;
  onOpenPricing: () => void;
}

export function buildReportSummaryForExport(
  data: AnalysisData,
  isUnlocked = false
): string {
  if (!isUnlocked) {
    const overviewSignalLines = data.signals
      .map((s) => `- ${s.title}: ${s.score}/100 (${s.badgeText})`)
      .join("\n");

    const sortedSignals = [...data.signals].sort((a, b) => a.score - b.score);
    const weakestSignal = sortedSignals[0] || null;
    const primaryRisk = data.risks && data.risks.length > 0 ? data.risks[0] : null;
    const biggestIssueSummary = primaryRisk
      ? `${primaryRisk.title} (${primaryRisk.severity} severity)`
      : weakestSignal
      ? `${weakestSignal.title} (${weakestSignal.score}/100 — ${weakestSignal.badgeText})`
      : "No major communication bottleneck flagged.";

    const cleanStrongerDirection = (data.recommendation?.strongerDirection || "")
      .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
      .trim();

    return [
      `STRANGERLENS FREE PREVIEW SUMMARY — ${data.domain}`,
      `Overall First-Impression Score: ${data.score}/100 (${data.scoreStatus})`,
      `Checked: ${data.checkedAt || "Just now"}`,
      ``,
      `VERDICT`,
      `${data.verdict}`,
      ``,
      ...(data.websiteMessage?.summary
        ? [`WHAT YOUR WEBSITE IS ACTUALLY SAYING`, `${data.websiteMessage.summary}`, ``]
        : []),
      `FIVE SIGNAL OVERVIEW`,
      overviewSignalLines,
      ``,
      `BIGGEST ISSUE + EVIDENCE`,
      `${biggestIssueSummary}`,
      ``,
      `YOUR #1 PRIORITY FIX: ${data.recommendation.subhead}`,
      `${cleanStrongerDirection || data.recommendation.explanation}`,
      ``,
      `---`,
      `Free Preview Summary (Sections 01–03). Unlock the Complete Report ($5) for Complete Fix Plan, Website Messaging Upgrade, Complete Visitor Insights, and Website Improvement Brief.`,
    ].join("\n");
  }

  const detailedSignalLines = data.signals
    .map((s) => `- ${s.title}: ${s.score}/100 (${s.badgeText}) — ${s.description}`)
    .join("\n");
  const riskLines =
    data.risks && data.risks.length > 0
      ? data.risks
          .map((r) => `- [${r.severity.toUpperCase()}] ${r.title}: ${r.description}`)
          .join("\n")
      : "- No major communication risks identified.";

  return [
    `STRANGERLENS FULL FIRST-IMPRESSION REPORT — ${data.domain}`,
    `Overall First-Impression Score: ${data.score}/100 (${data.scoreStatus})`,
    `Checked: ${data.checkedAt || "Just now"}`,
    ``,
    `VERDICT`,
    `${data.verdict}`,
    ``,
    ...(data.websiteMessage?.summary
      ? [`WHAT YOUR WEBSITE IS ACTUALLY SAYING`, `${data.websiteMessage.summary}`, ``]
      : []),
    `FIRST-TIME VISITOR IMPRESSION`,
    `${data.visitorThought}`,
    ``,
    `FIVE DETAILED SIGNAL BREAKDOWN`,
    detailedSignalLines,
    ``,
    `YOUR #1 PRIORITY FIX: ${data.recommendation.subhead}`,
    `${data.recommendation.explanation}`,
    `What you say now: ${data.recommendation.currentDirection}`,
    `Clearer direction: ${data.recommendation.strongerDirection}`,
    ``,
    `COMMUNICATION RISKS`,
    riskLines,
  ].join("\n");
}

export function buildImprovementBriefText(
  data: AnalysisData,
  priorityFixPlan: Array<{
    title: string;
    where: string | null;
    why: string | null;
    isPrimaryFix: boolean;
  }> = [],
  copyReadyImprovements: Array<{
    intendedLocation: string;
    currentCopy: string | null;
    suggestedReplacement: string;
    whyThisMayHelp: string;
  }> = []
): string {
  const safeDomain = data.domain || "website";
  const primaryProblem = data.verdict || "Clarify core value proposition";

  const recChangesText =
    priorityFixPlan.length > 0
      ? priorityFixPlan
          .map((step, i) => {
            const lines = [
              `Priority ${i + 1}: ${step.title}`,
              step.where ? `  Where: ${step.where}` : null,
              step.why ? `  Why: ${step.why}` : null,
            ].filter(Boolean);
            return lines.join("\n");
          })
          .join("\n\n")
      : `- ${data.recommendation?.subhead || data.recommendation?.title || "Clarify headline"}: ${
          data.recommendation?.explanation || "Improve first-time visitor understanding."
        }`;

  const messagingText =
    copyReadyImprovements.length > 0
      ? copyReadyImprovements
          .map((item, i) => {
            const lines = [
              `Item ${i + 1} (${item.intendedLocation}):`,
              item.currentCopy
                ? `  Current: "${item.currentCopy}"`
                : `  Current: [Not explicitly quoted on page]`,
              `  Suggested: "${item.suggestedReplacement}"`,
              `  Why: ${item.whyThisMayHelp}`,
            ];
            return lines.join("\n");
          })
          .join("\n\n")
      : "No copy-specific replacements required. Follow recommendations in the Fix Plan.";

  const clearFindings =
    data.evidence?.clearFindings && data.evidence.clearFindings.length > 0
      ? data.evidence.clearFindings.map((f) => `- ${f}`).join("\n")
      : "- Initial page structure reviewed.";

  const missingFindings =
    data.evidence?.missingFindings && data.evidence.missingFindings.length > 0
      ? data.evidence.missingFindings.map((f) => `- ${f}`).join("\n")
      : "- No critical blockers detected.";

  return [
    `==================================================`,
    `STRANGERLENS — WEBSITE IMPROVEMENT BRIEF`,
    `==================================================`,
    `Website: ${safeDomain}`,
    `Overall First-Impression Score: ${data.score}/100 (${data.scoreStatus})`,
    `Checked: ${data.checkedAt || "Current scan"}`,
    ``,
    `--------------------------------------------------`,
    `1. PRIMARY PROBLEM`,
    `--------------------------------------------------`,
    `${primaryProblem}`,
    ``,
    `--------------------------------------------------`,
    `2. RECOMMENDED CHANGES`,
    `--------------------------------------------------`,
    recChangesText,
    ``,
    `--------------------------------------------------`,
    `3. MESSAGING IMPROVEMENTS`,
    `--------------------------------------------------`,
    messagingText,
    ``,
    `--------------------------------------------------`,
    `4. SUPPORTING EVIDENCE`,
    `--------------------------------------------------`,
    `Clear Elements Observed:`,
    clearFindings,
    ``,
    `Gaps & Improvement Areas:`,
    missingFindings,
    ``,
    `==================================================`,
    `End of Brief — Generated by StrangerLens`,
    `==================================================`,
  ].join("\n");
}

export default function ResultsScreen({
  rawUrl,
  analysisData: customData,
  previousCheckRecord,
  isUnlocked = false,
  onBackToLanding,
  onRunNewCheck,
  onOpenFaq,
  onOpenPricing,
}: ResultsScreenProps) {
  // Phase 2 Interaction States
  const [copiedState, setCopiedState] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastTone, setToastTone] = useState<"success" | "warning">("success");
  const [isMethodologyModalOpen, setIsMethodologyModalOpen] = useState<boolean>(false);
  const [actionsMenuOpen, setActionsMenuOpen] = useState<boolean>(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showDetailedSignalInsights, setShowDetailedSignalInsights] = useState<boolean>(false);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>("primary-priority-fix");
  const [expandedInsightAccordion, setExpandedInsightAccordion] = useState<string | null>(null);

  // Paywall & Premium Preview States (Single $5 Plan Only)
  const [paywallEmail, setPaywallEmail] = useState<string>("");
  const [paywallEmailError, setPaywallEmailError] = useState<string | null>(null);
  const [paywallCheckoutState, setPaywallCheckoutState] = useState<
    "idle" | "processing" | "coming_soon"
  >("idle");
  const isReportUnlocked = Boolean(isUnlocked);
  // Internal development preview mode: isolated to non-production environments
  // Displays both Free and Paid sections using real report data for responsive UI inspection
  const isInternalDevPreview = process.env.NODE_ENV !== "production";
  const showPaidSection = isReportUnlocked || isInternalDevPreview;

  // Async Button States
  const [shareState, setShareState] = useState<"idle" | "sharing" | "copied">("idle");
  const [downloadState, setDownloadState] = useState<"idle" | "preparing" | "downloaded" | "failed">("idle");
  const [checkAgainState, setCheckAgainState] = useState<"idle" | "checking">("idle");
  const [previousRecord, setPreviousRecord] = useState<StoredHistoryRecord | null>(null);
  const [hadCorruptedHistory, setHadCorruptedHistory] = useState<boolean>(false);

  // Score Reveal Animation
  const [displayScore, setDisplayScore] = useState<number>(0);
  const [hasAnimatedScore, setHasAnimatedScore] = useState<boolean>(false);

  // Timer refs to prevent race conditions on rapid copy clicks
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reduced Motion Detection
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Normalize Domain for Clean Display & Consistent Comparison Identity
  const cleanDomain = useMemo(() => {
    const normalized = normalizeComparisonDomain(customData?.domain || rawUrl);
    if (normalized) return normalized;
    let cleaned = rawUrl.trim();
    if (!cleaned) return "website.com";
    try {
      if (!/^https?:\/\//i.test(cleaned)) {
        cleaned = `https://${cleaned}`;
      }
      const parsed = new URL(cleaned);
      return parsed.hostname.replace(/^www\./i, "").toLowerCase() || "website.com";
    } catch {
      return (
        cleaned
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .split("/")[0]
          .toLowerCase() || "website.com"
      );
    }
  }, [customData?.domain, rawUrl]);

  // Dynamic Analysis Data Model ( strictly grounded in real analysisData )
  const data: AnalysisData = useMemo(() => {
    const score = customData?.score ?? 0;
    const defaultStatus: AnalysisData["scoreStatus"] =
      score >= 90
        ? "Excellent"
        : score >= 75
        ? "Good"
        : score >= 50
        ? "Needs work"
        : "Needs improvement";

    return {
      domain: customData?.domain || cleanDomain,
      score,
      scoreStatus: customData?.scoreStatus ?? defaultStatus,
      verdict:
        customData?.verdict ??
        "First-impression analysis completed based on visible homepage content.",
      verdictSubtext:
        customData?.verdictSubtext ??
        "First-time visitor perspective",
      quickSignals: customData?.quickSignals ?? [],
      firstSeconds: customData?.firstSeconds ?? [],
      visitorThought:
        customData?.visitorThought ??
        "No simulated visitor thought available for this scan.",
      evidence: customData?.evidence
        ? {
            ...customData.evidence,
            locationTag:
              customData.evidence.locationTag === "Homepage · Above the fold" ||
              customData.evidence.locationTag === "Homepage · Extracted content"
                ? "Homepage hero"
                : customData.evidence.locationTag,
          }
        : {
            locationTag: "Homepage hero",
            homepageExcerpt: "No homepage excerpt extracted.",
            clearFindings: [],
            missingFindings: [],
          },
      signals: customData?.signals ?? [],
      websiteMessage: customData?.websiteMessage,
      risks: customData?.risks ?? [],
      recommendation: customData?.recommendation ?? {
        title: "If you change only one thing",
        subhead: "Clarify your primary homepage headline",
        explanation:
          "State clearly what the product is, who it serves, and the main outcome visitors can expect.",
        currentDirection: "Current headline excerpt unavailable",
        strongerDirection: "State the specific outcome your target audience achieves.",
      },
      otherImprovements: customData?.otherImprovements ?? [],
      supportingContext: customData?.supportingContext,
      isPartialAccess: customData?.isPartialAccess ?? false,
      isAccessError: customData?.isAccessError ?? false,
      checkedAt: customData?.checkedAt ?? "Checked just now",
    };
  }, [cleanDomain, customData]);

  // Score Theme Palette based on actual score (Dark Mode)
  const scoreVisuals = useMemo(() => {
    if (data.score >= 75) {
      return {
        stroke: "#10b981",
        track: "#064e3b",
        pillBg: "bg-emerald-950/70 text-emerald-400 border border-emerald-500/30",
        modalBadge: "text-emerald-400 bg-emerald-950/80 border-emerald-500/30",
        accentText: "text-emerald-400",
      };
    }
    if (data.score >= 50) {
      return {
        stroke: "#f59e0b",
        track: "#78350f",
        pillBg: "bg-amber-950/70 text-amber-400 border border-amber-500/30",
        modalBadge: "text-amber-400 bg-amber-950/80 border-amber-500/30",
        accentText: "text-amber-400",
      };
    }
    return {
      stroke: "#f43f5e",
      track: "#881337",
      pillBg: "bg-rose-950/70 text-rose-400 border border-rose-500/30",
      modalBadge: "text-rose-400 bg-rose-950/80 border-rose-500/30",
      accentText: "text-rose-400",
    };
  }, [data.score]);

  // Derived Signal Overview & First-Seconds Insights
  const overviewStats = useMemo(() => {
    const sorted = [...data.signals].sort((a, b) => b.score - a.score);
    const strongest = sorted[0] || null;
    const weakest = sorted.length > 1 ? sorted[sorted.length - 1] : null;
    const clearQuestionsCount = data.firstSeconds.filter((q) => q.type === "clear").length;
    const clearSignalsCount = data.signals.filter((s) => s.badgeType === "clear").length;

    const questionBySignalId: Record<string, string> = {
      "first-impression": "Is it immediately clear?",
      audience: "Who is this built for?",
      value: "Why should a visitor care?",
      trust: "Why should they believe it?",
      action: "What is the next step?",
    };

    const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    const signalScoreForRiskCategory = (rawCat?: string): number => {
      const cat = (rawCat || "").trim().toLowerCase();
      const targetId =
        cat.includes("trust") || cat.includes("credibility")
          ? "trust"
          : cat.includes("audience")
          ? "audience"
          : cat.includes("value") || cat.includes("positioning")
          ? "value"
          : cat.includes("action") || cat.includes("cta")
          ? "action"
          : "first-impression";
      const found = data.signals.find((s) => s.id === targetId);
      return found ? found.score : 70;
    };

    const sortedRisks = [...(data.risks ?? [])].sort((a, b) => {
      const scoreA = signalScoreForRiskCategory(a.category);
      const scoreB = signalScoreForRiskCategory(b.category);
      // Prioritize risks belonging to non-clear signals (< 70) ahead of already-clear signals (>= 70)
      const isWeakA = scoreA < 70 ? 0 : 1;
      const isWeakB = scoreB < 70 ? 0 : 1;
      if (isWeakA !== isWeakB) return isWeakA - isWeakB;

      const sevDiff = (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3);
      if (sevDiff !== 0) return sevDiff;

      return scoreA - scoreB;
    });
    const primaryRisk = sortedRisks[0] || null;
    const secondaryRisks = sortedRisks.slice(1);

    return {
      strongest,
      weakest,
      clearQuestionsCount,
      clearSignalsCount,
      questionBySignalId,
      primaryRisk,
      secondaryRisks,
    };
  }, [data.signals, data.firstSeconds, data.risks]);

  // Phase 3: Derive Priority Fix Plan (Max 3 distinct, ordered actions from existing validated recommendations)
  const priorityFixPlan = useMemo(() => {
    const normalizeText = (value?: string): string =>
      (value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    // Condense multi-sentence or clause-heavy explanations into a concise 1-sentence summary
    // so Step 01 does not repeat the full verbatim paragraph from the #1 Priority Fix card.
    const summarizePlanReason = (rawText?: string, isPrimaryFix = false): string | null => {
      if (!rawText || !rawText.trim()) return null;
      const cleaned = rawText.trim().replace(/\s+/g, " ");
      const sentences = cleaned.match(/[^.!?]+[.!?]+/g);

      let firstSentence =
        sentences && sentences.length > 0 ? sentences[0].trim() : cleaned;

      if (isPrimaryFix) {
        // If the primary fix explanation is a single sentence, condense trailing subordinate clauses
        // so it serves as an executive summary rather than repeating the full card body verbatim.
        const clauseSplit = firstSentence.split(
          /\s+(?:because|which means|leaving|forcing|making it harder|while)\s+|;\s+|\s+—\s+/i
        );
        if (clauseSplit.length > 1 && clauseSplit[0].trim().length >= 28) {
          firstSentence = clauseSplit[0].trim().replace(/[,;:\s]+$/, "") + ".";
        }
      }

      if (!/[.!?]$/.test(firstSentence)) {
        firstSentence += ".";
      }
      return firstSentence;
    };

    // Extract a website location ONLY when explicitly stated in the validated recommendation text.
    // Never guess or fabricate a location.
    const extractExplicitLocation = (...texts: Array<string | undefined>): string | null => {
      const combined = texts.filter(Boolean).join(" ");
      if (!combined) return null;

      if (/\b(hero headline|main headline|primary headline|h1 headline)\b/i.test(combined)) {
        return "Hero headline";
      }
      if (/\b(hero subheadline|subheadline|sub-headline)\b/i.test(combined)) {
        return "Hero subheadline";
      }
      if (/\b(hero supporting description|supporting description|supporting copy)\b/i.test(combined)) {
        return "Hero supporting description";
      }
      if (/\b(primary cta|call to action|call-to-action|cta button)\b/i.test(combined)) {
        return "Primary CTA";
      }
      if (/\b(navigation bar|top navigation|header navigation)\b/i.test(combined)) {
        return "Navigation";
      }
      if (/\b(homepage hero|hero section|above the fold|above-the-fold)\b/i.test(combined)) {
        return "Homepage hero";
      }
      return null;
    };

    const areTitlesDuplicate = (normA: string, normB: string): boolean => {
      if (!normA || !normB) return false;
      if (normA === normB) return true;
      if (normA.length >= 16 && normB.length >= 16) {
        if (normA.includes(normB) || normB.includes(normA)) {
          return true;
        }
      }
      return false;
    };

    interface PriorityPlanStep {
      id: string;
      stepNumber: "01" | "02" | "03";
      title: string;
      where: string | null;
      why: string | null;
      isPrimaryFix: boolean;
      linkedImprovementId?: string;
    }

    const rawSteps: Array<{
      id: string;
      title: string;
      where: string | null;
      why: string | null;
      isPrimaryFix: boolean;
      linkedImprovementId?: string;
      normTitle: string;
    }> = [];

    const seenIds = new Set<string>();

    // 1. Primary source: Existing #1 Priority Fix ("IF YOU CHANGE ONLY ONE THING")
    const primaryRec = customData ? customData.recommendation : data.recommendation;
    const primaryTitle = primaryRec?.subhead?.trim() || "";

    if (primaryTitle) {
      const normPrimary = normalizeText(primaryTitle);
      if (normPrimary) {
        seenIds.add("primary-priority-fix");
        rawSteps.push({
          id: "primary-priority-fix",
          title: primaryTitle,
          where: extractExplicitLocation(primaryRec?.subhead, primaryRec?.currentDirection),
          why: summarizePlanReason(primaryRec?.explanation, true),
          isPrimaryFix: true,
          normTitle: normPrimary,
        });
      }
    }

    // 2. Secondary source: Existing validated otherImprovements in preserved source order
    const additionalRecs = customData
      ? customData.otherImprovements ?? []
      : data.otherImprovements ?? [];

    for (const item of additionalRecs) {
      if (rawSteps.length >= 3) break;
      const itemTitle = item?.title?.trim() || "";
      if (!itemTitle) continue;

      const itemId = item.id ? String(item.id) : "";
      if (itemId && seenIds.has(itemId)) continue;

      const normTitle = normalizeText(itemTitle);
      if (!normTitle) continue;

      const isDuplicate = rawSteps.some(
        (existing) =>
          areTitlesDuplicate(existing.normTitle, normTitle) ||
          (item.description &&
            areTitlesDuplicate(existing.normTitle, normalizeText(item.description)))
      );
      if (isDuplicate) continue;

      if (itemId) {
        seenIds.add(itemId);
      }

      rawSteps.push({
        id: itemId || `plan-step-${rawSteps.length + 1}`,
        title: itemTitle,
        where: extractExplicitLocation(item.title, item.whatToImprove),
        why: summarizePlanReason(item.description || item.whyItMatters, false),
        isPrimaryFix: false,
        linkedImprovementId: item.id,
        normTitle,
      });
    }

    const stepLabels: Array<"01" | "02" | "03"> = ["01", "02", "03"];

    return rawSteps.slice(0, 3).map((step, index): PriorityPlanStep => ({
      id: step.id,
      stepNumber: stepLabels[index] || "03",
      title: step.title,
      where: step.where,
      why: step.why,
      isPrimaryFix: step.isPrimaryFix,
      linkedImprovementId: step.linkedImprovementId,
    }));
  }, [customData, data.recommendation, data.otherImprovements]);

  // Phase 4: Derive Copy-Ready Improvements (Max 3 trustworthy, verified copy comparisons)
  const copyReadyImprovements = useMemo(() => {
    const stripQuotes = (value?: string): string =>
      (value || "")
        .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const normalizeText = (value?: string): string =>
      stripQuotes(value)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const isPlaceholderExcerpt = (value: string): boolean => {
      const lower = value.toLowerCase();
      return (
        !lower ||
        lower === "no homepage excerpt extracted." ||
        lower === "no homepage excerpt extracted" ||
        lower === "we scanned your homepage above the fold structure." ||
        lower === "we scanned your homepage above the fold structure" ||
        lower === "we scanned your accessible homepage structure." ||
        lower === "we scanned your accessible homepage structure" ||
        lower === "current headline excerpt unavailable" ||
        lower === "none" ||
        lower === "n/a" ||
        lower === "unavailable"
      );
    };

    // 1. Extract verified homepage text from actual extracted evidence fields
    const rawExcerpt = stripQuotes(
      customData?.evidence?.homepageExcerpt ?? data.evidence?.homepageExcerpt
    );
    const hasVerifiedExcerpt = !isPlaceholderExcerpt(rawExcerpt);

    let verifiedHeadline: string | null = null;
    let verifiedSubheadline: string | null = null;

    if (hasVerifiedExcerpt) {
      const dividerIdx = rawExcerpt.indexOf(" — ");
      if (dividerIdx !== -1) {
        const headPart = stripQuotes(rawExcerpt.slice(0, dividerIdx));
        const subPart = stripQuotes(rawExcerpt.slice(dividerIdx + 3));
        if (headPart && !isPlaceholderExcerpt(headPart)) {
          verifiedHeadline = headPart;
        }
        if (subPart && !isPlaceholderExcerpt(subPart)) {
          verifiedSubheadline = subPart;
        }
      } else {
        verifiedHeadline = rawExcerpt;
      }
    }

    // Check clearFindings for verified Primary CTA text (`Primary action: “...” is prominent`)
    let verifiedPrimaryCta: string | null = null;
    const clearFindingsList =
      customData?.evidence?.clearFindings ?? data.evidence?.clearFindings ?? [];
    for (const finding of clearFindingsList) {
      const ctaMatch = finding.match(/Primary action:\s*[“"]([^”"]+)[”"]/i);
      if (ctaMatch && ctaMatch[1]?.trim()) {
        verifiedPrimaryCta = ctaMatch[1].trim();
        break;
      }
    }

    // Build the verified source pool string to check against fabricated claims
    const verifiedSourcePool = [
      rawExcerpt,
      ...clearFindingsList,
      customData?.websiteMessage?.summary ?? data.websiteMessage?.summary ?? "",
    ]
      .join(" ")
      .toLowerCase();

    // Check if a `currentDirection` string is actual website copy rather than an AI diagnostic paraphrase
    const isVerifiedCurrentQuote = (candidate?: string): string | null => {
      const cleaned = stripQuotes(candidate);
      if (!cleaned || isPlaceholderExcerpt(cleaned)) return null;

      const normCandidate = normalizeText(cleaned);
      const normExcerpt = normalizeText(rawExcerpt);

      // If it directly matches or is a substring of the extracted homepage excerpt, it is verified source copy
      if (hasVerifiedExcerpt && normExcerpt && normCandidate && normExcerpt.includes(normCandidate)) {
        return cleaned;
      }

      // Reject AI diagnostic paraphrases that describe the site in 3rd/2nd person rather than quoting it
      const diagnosticParaphrasePattern =
        /\b(your homepage|the homepage|your website|the website|hero section|above the fold|currently lacks|does not state|does not clearly|fails to|no clear|no explicit|visitors see|visitors cannot|is unclear|is missing|without explaining|without stating|current copy|headline focuses on)\b/i;

      if (diagnosticParaphrasePattern.test(cleaned)) {
        return null;
      }

      return cleaned;
    };

    // Validate that a suggested replacement is genuine copyable text, not a generic mapper template,
    // meta-instruction, or fabricated credibility/metric claim
    const isTrustworthySuggestion = (
      rawSuggestion?: string,
      category?: "HERO HEADLINE" | "SUPPORTING DESCRIPTION" | "PRIMARY CTA LABEL"
    ): string | null => {
      const cleaned = stripQuotes(rawSuggestion);
      if (!cleaned || cleaned.length < 3) return null;

      // Reject default fallback placeholder
      if (
        cleaned.toLowerCase() ===
        "state the specific outcome your target audience achieves."
      ) {
        return null;
      }

      // Reject generic fallback templates from mapper
      const genericTemplatePatterns = [
        /^trusted by teams building and growing with\b/i,
        /^built specifically for .+ users looking to achieve results faster\.?$/i,
        /\(instant setup\s*·\s*no credit card required\)/i,
        /^the fastest way to achieve your goals with\b/i,
      ];
      if (genericTemplatePatterns.some((re) => re.test(cleaned))) {
        return null;
      }

      // Reject meta-instructions or conditional advice that tell the user what to do instead of providing replacement copy
      const instructionalPrefixPattern =
        /^(add|include|place|insert|display|show|replace|clarify|restate|rewrite|ensure|make sure|highlight|feature|use concrete|state clearly|if you have|once you have|consider adding)\b/i;
      if (instructionalPrefixPattern.test(cleaned)) {
        return null;
      }

      if (/\[[^\]]+\]|\{[^}]+\}|<[^>]+>/i.test(cleaned)) {
        return null;
      }

      // Reject fabricated quantitative claims, ratings, certifications, or promises unless present in source pool
      const potentiallyFabricatedTokens: Array<{ pattern: RegExp; tokenCheck: RegExp }> = [
        {
          pattern: /\b\d[\d,]*\+?\s*(?:users|customers|teams|companies|clients|developers|businesses|organizations|startups|enterprises|agencies|brands)\b/i,
          tokenCheck: /\b\d[\d,]*\+?\s*(?:users|customers|teams|companies|clients|developers|businesses|organizations|startups|enterprises|agencies|brands)\b/i,
        },
        {
          pattern: /\b\d+(?:\.\d+)?%\s*(?:faster|more|increase|conversion|growth|uptime|roi|reduction|less|time|saved)\b/i,
          tokenCheck: /\b\d+(?:\.\d+)?%\b/i,
        },
        {
          pattern: /\b\d+(?:\.\d+)?x\s*(?:faster|more|growth|roi|output|productivity|conversions?)\b/i,
          tokenCheck: /\b\d+(?:\.\d+)?x\b/i,
        },
        {
          pattern: /\b(?:4\.\d\/5|5-star|#1 rated|award-winning|fortune\s*500)\b/i,
          tokenCheck: /\b(?:4\.\d\/5|5-star|#1 rated|award-winning|fortune\s*500)\b/i,
        },
        {
          pattern: /\b(?:soc\s*2|iso\s*27001|hipaa|gdpr compliant|bank-grade security|military-grade)\b/i,
          tokenCheck: /\b(?:soc\s*2|iso\s*27001|hipaa|gdpr)\b/i,
        },
        {
          pattern: /\b(?:no credit card required|instant setup|100% guaranteed|money-back guarantee|free forever)\b/i,
          tokenCheck: /\b(?:no credit card|instant setup|100% guaranteed|money-back|free forever)\b/i,
        },
      ];

      for (const check of potentiallyFabricatedTokens) {
        if (check.pattern.test(cleaned) && !check.tokenCheck.test(verifiedSourcePool)) {
          return null;
        }
      }

      // Ensure CTA labels are reasonably concise
      if (category === "PRIMARY CTA LABEL" && cleaned.length > 90) {
        return null;
      }

      return cleaned;
    };

    type SupportedCopyCategory =
      | "HERO HEADLINE"
      | "SUPPORTING DESCRIPTION"
      | "PRIMARY CTA LABEL";

    const classifyCopyCategory = (
      titleText?: string,
      detailText?: string,
      isPrimary = false
    ): {
      category: SupportedCopyCategory;
      intendedLocation: string;
    } | null => {
      const combined = `${titleText || ""} ${detailText || ""}`.toLowerCase();

      // Exclude purely visual/structural/proof recommendations (e.g., adding logos, screenshots, badges)
      // unless they explicitly target headline, subheadline, supporting description, or CTA wording
      const isStructuralProofOnly =
        /\b(logo|logos|screenshot|screenshots|video|badge|badges|testimonial|case study|pricing table|navigation menu|layout)\b/i.test(
          combined
        ) &&
        !/\b(headline|subheadline|sub-headline|supporting description|supporting copy|cta|button|wording|copy)\b/i.test(
          combined
        );

      if (isStructuralProofOnly) {
        return null;
      }

      if (
        /\b(primary cta|call to action|call-to-action|cta button|button label|button text|button copy|action button)\b/i.test(
          combined
        )
      ) {
        return {
          category: "PRIMARY CTA LABEL",
          intendedLocation: "Primary call-to-action button",
        };
      }

      if (
        /\b(subheadline|sub-headline|supporting description|supporting copy|subhead|hero description|explanatory line)\b/i.test(
          combined
        )
      ) {
        return {
          category: "SUPPORTING DESCRIPTION",
          intendedLocation: "Hero supporting description / subheadline",
        };
      }

      if (
        isPrimary ||
        /\b(headline|h1|hero|value proposition|main message|opening statement|positioning|who it is for|audience)\b/i.test(
          combined
        )
      ) {
        return {
          category: "HERO HEADLINE",
          intendedLocation: "Homepage hero headline",
        };
      }

      return null;
    };

    const resolveCurrentCopyForCategory = (
      category: SupportedCopyCategory,
      explicitCandidate?: string | null
    ): string | null => {
      const verifiedCandidate = isVerifiedCurrentQuote(explicitCandidate || undefined);
      if (verifiedCandidate) return verifiedCandidate;

      if (category === "HERO HEADLINE" && verifiedHeadline) {
        return verifiedHeadline;
      }
      if (category === "SUPPORTING DESCRIPTION" && verifiedSubheadline) {
        return verifiedSubheadline;
      }
      if (category === "PRIMARY CTA LABEL" && verifiedPrimaryCta) {
        return verifiedPrimaryCta;
      }
      return null;
    };

    const formatWhyThisMayHelp = (rawReason?: string, fallbackReason?: string): string => {
      const source = (rawReason || fallbackReason || "").trim().replace(/\s+/g, " ");
      if (!source) {
        return "Communicates the core value proposition more directly to first-time visitors.";
      }
      const sentences = source.match(/[^.!?]+[.!?]+/g);
      if (sentences && sentences.length > 0) {
        return sentences[0].trim();
      }
      return /[.!?]$/.test(source) ? source : `${source}.`;
    };

    interface CopyImprovementItem {
      id: string;
      indexLabel: "01" | "02" | "03";
      category: SupportedCopyCategory;
      intendedLocation: string;
      currentCopy: string | null;
      suggestedReplacement: string;
      whyThisMayHelp: string;
      relatedPlanStep: "01" | "02" | "03" | null;
    }

    const candidates: Array<{
      id: string;
      category: SupportedCopyCategory;
      intendedLocation: string;
      currentCopy: string | null;
      suggestedReplacement: string;
      whyThisMayHelp: string;
      relatedPlanStep: "01" | "02" | "03" | null;
      normReplacement: string;
    }> = [];

    const seenReplacements = new Set<string>();
    const seenCategories = new Set<SupportedCopyCategory>();

    // Candidate 1: Primary #1 Priority Fix (`recommendation`)
    const primaryRec = customData ? customData.recommendation : data.recommendation;
    if (primaryRec) {
      const classification = classifyCopyCategory(
        primaryRec.subhead,
        primaryRec.explanation,
        true
      );
      if (classification) {
        const cleanSuggestion = isTrustworthySuggestion(
          primaryRec.strongerDirection,
          classification.category
        );
        if (cleanSuggestion) {
          const currentCopy = resolveCurrentCopyForCategory(
            classification.category,
            primaryRec.currentDirection
          );
          const normSuggestion = normalizeText(cleanSuggestion);
          const normCurrent = normalizeText(currentCopy || "");

          if (normSuggestion && normSuggestion !== normCurrent) {
            const matchingStep = priorityFixPlan.find((s) => s.isPrimaryFix);
            seenReplacements.add(normSuggestion);
            seenCategories.add(classification.category);

            candidates.push({
              id: "copy-primary-fix",
              category: classification.category,
              intendedLocation: classification.intendedLocation,
              currentCopy,
              suggestedReplacement: cleanSuggestion,
              whyThisMayHelp: formatWhyThisMayHelp(primaryRec.explanation),
              relatedPlanStep: matchingStep ? matchingStep.stepNumber : "01",
              normReplacement: normSuggestion,
            });
          }
        }
      }
    }

    // Candidate 2+: Additional recommendations from `otherImprovements`, ordered by Priority Fix Plan alignment
    const additionalRecs = customData
      ? customData.otherImprovements ?? []
      : data.otherImprovements ?? [];

    const orderedAdditionalRecs = [...additionalRecs].sort((a, b) => {
      const stepA = priorityFixPlan.findIndex((s) => s.linkedImprovementId === a.id);
      const stepB = priorityFixPlan.findIndex((s) => s.linkedImprovementId === b.id);
      const rankA = stepA === -1 ? 99 : stepA;
      const rankB = stepB === -1 ? 99 : stepB;
      return rankA - rankB;
    });

    for (const item of orderedAdditionalRecs) {
      if (candidates.length >= 3) break;
      if (!item?.copyableSuggestion) continue;

      const classification = classifyCopyCategory(
        item.title,
        `${item.whatToImprove || ""} ${item.description || ""}`,
        false
      );
      if (!classification) continue;

      // Avoid repeating multiple suggestions for the exact same category if already covered,
      // unless it's a distinct Supporting Description vs Hero Headline
      let targetCategory = classification.category;
      let targetLocation = classification.intendedLocation;
      if (
        targetCategory === "HERO HEADLINE" &&
        seenCategories.has("HERO HEADLINE") &&
        !seenCategories.has("SUPPORTING DESCRIPTION")
      ) {
        targetCategory = "SUPPORTING DESCRIPTION";
        targetLocation = "Hero supporting description / subheadline";
      }

      if (seenCategories.has(targetCategory)) continue;

      const cleanSuggestion = isTrustworthySuggestion(
        item.copyableSuggestion,
        targetCategory
      );
      if (!cleanSuggestion) continue;

      const normSuggestion = normalizeText(cleanSuggestion);
      if (!normSuggestion || seenReplacements.has(normSuggestion)) continue;

      const isNearDuplicate = candidates.some(
        (existing) =>
          existing.normReplacement.includes(normSuggestion) ||
          normSuggestion.includes(existing.normReplacement)
      );
      if (isNearDuplicate) continue;

      const currentCopy = resolveCurrentCopyForCategory(targetCategory, null);
      const normCurrent = normalizeText(currentCopy || "");
      if (normSuggestion === normCurrent) continue;

      const matchingStep = priorityFixPlan.find(
        (s) => s.linkedImprovementId === item.id
      );

      seenReplacements.add(normSuggestion);
      seenCategories.add(targetCategory);

      candidates.push({
        id: `copy-${item.id}`,
        category: targetCategory,
        intendedLocation: targetLocation,
        currentCopy,
        suggestedReplacement: cleanSuggestion,
        whyThisMayHelp: formatWhyThisMayHelp(item.whyItMatters, item.description),
        relatedPlanStep: matchingStep ? matchingStep.stepNumber : null,
        normReplacement: normSuggestion,
      });
    }

    const indexLabels: Array<"01" | "02" | "03"> = ["01", "02", "03"];

    return candidates.slice(0, 3).map((item, idx): CopyImprovementItem => ({
      id: item.id,
      indexLabel: indexLabels[idx] || "03",
      category: item.category,
      intendedLocation: item.intendedLocation,
      currentCopy: item.currentCopy,
      suggestedReplacement: item.suggestedReplacement,
      whyThisMayHelp: item.whyThisMayHelp,
      relatedPlanStep: item.relatedPlanStep,
    }));
  }, [
    customData,
    data.recommendation,
    data.otherImprovements,
    data.evidence,
    data.websiteMessage,
    priorityFixPlan,
  ]);

  // Phase 5: Derive Visitor Understanding (09 & 10) and Complete Homepage Evidence (11)
  const visitorUnderstandingAndEvidence = useMemo(() => {
    const stripOuterQuotes = (value?: string): string =>
      (value || "")
        .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const isGenericExcerptPlaceholder = (value: string): boolean => {
      const lower = value.toLowerCase();
      return (
        !lower ||
        lower.includes("we scanned your homepage above the fold structure") ||
        lower.includes("we scanned your accessible homepage structure") ||
        lower.includes("no headline extracted")
      );
    };

    const rawExcerpt = stripOuterQuotes(data.evidence?.homepageExcerpt);
    const hasVerifiedExcerpt = Boolean(
      rawExcerpt && !isGenericExcerptPlaceholder(rawExcerpt)
    );

    let verifiedHeadline: string | null = null;
    let verifiedSubheadline: string | null = null;

    if (hasVerifiedExcerpt) {
      if (rawExcerpt.includes(" — ")) {
        const parts = rawExcerpt.split(" — ");
        verifiedHeadline = stripOuterQuotes(parts[0]) || rawExcerpt;
        const sub = stripOuterQuotes(parts.slice(1).join(" — "));
        verifiedSubheadline = sub.length > 0 ? sub : null;
      } else {
        verifiedHeadline = rawExcerpt;
      }
    }

    const extractQuotedFromFinding = (prefixPattern: RegExp): string | null => {
      for (const finding of data.evidence?.clearFindings || []) {
        if (prefixPattern.test(finding)) {
          const match = finding.match(/[“"]([^”"]+)[”"]/);
          if (match && match[1]) {
            const clean = stripOuterQuotes(match[1]);
            if (clean.length > 0) return clean;
          }
        }
      }
      return null;
    };

    const verifiedCategorySnippet = extractQuotedFromFinding(/^product category:/i);
    const verifiedAudienceSnippet = extractQuotedFromFinding(/^target audience:/i);
    const verifiedOutcomeSnippet = extractQuotedFromFinding(/^primary outcome:/i);
    const verifiedProofSnippet = extractQuotedFromFinding(/^proof element:/i);
    const verifiedPrimaryCta = extractQuotedFromFinding(/^primary action:/i);

    // Filter out generic fallback placeholders from clearFindings and missingFindings
    // so Section 11 only presents real verified findings or clean honest empty states
    const verifiedClearFindings = (data.evidence?.clearFindings || []).filter(
      (item) =>
        item &&
        item.trim().length > 0 &&
        item.trim().toLowerCase() !== "found initial page structure"
    );

    const verifiedMissingFindings = (data.evidence?.missingFindings || []).filter(
      (item) =>
        item &&
        item.trim().length > 0 &&
        item.trim().toLowerCase() !== "no major communication blockers identified"
    );

    // Build the 5 required comprehension questions in exact canonical order
    const canonicalQuestions: Array<{
      numberLabel: "01" | "02" | "03" | "04" | "05";
      question: string;
      dimensionLabel: string;
      quickSignalNote: string | null;
      verifiedSnippet: string | null;
    }> = [
      {
        numberLabel: "01",
        question: "What is this?",
        dimensionLabel: "Product category",
        quickSignalNote: data.quickSignals?.[0]?.label || null,
        verifiedSnippet: verifiedCategorySnippet,
      },
      {
        numberLabel: "02",
        question: "Who is it for?",
        dimensionLabel: "Target audience",
        quickSignalNote: data.quickSignals?.[1]?.label || null,
        verifiedSnippet: verifiedAudienceSnippet,
      },
      {
        numberLabel: "03",
        question: "What will I get?",
        dimensionLabel: "Primary benefit",
        quickSignalNote: data.quickSignals?.[2]?.label || null,
        verifiedSnippet: verifiedOutcomeSnippet,
      },
      {
        numberLabel: "04",
        question: "Why should I care?",
        dimensionLabel: "Credibility & proof",
        quickSignalNote: data.quickSignals?.[3]?.label || null,
        verifiedSnippet: verifiedProofSnippet,
      },
      {
        numberLabel: "05",
        question: "What should I do next?",
        dimensionLabel: "Next step / CTA",
        quickSignalNote: data.quickSignals?.[4]?.label || null,
        verifiedSnippet: verifiedPrimaryCta,
      },
    ];

    const firstSecondsRows = canonicalQuestions.map((canon, idx) => {
      const matched =
        (data.firstSeconds || []).find(
          (q) => q.question.trim().toLowerCase() === canon.question.toLowerCase()
        ) || data.firstSeconds?.[idx];

      const label: string = matched?.label || "Partly clear";
      const type: "clear" | "partly" | "unclear" = matched?.type || "partly";

      return {
        numberLabel: canon.numberLabel,
        question: canon.question,
        dimensionLabel: canon.dimensionLabel,
        label,
        type,
        quickSignalNote: canon.quickSignalNote,
        verifiedSnippet: canon.verifiedSnippet,
      };
    });

    // Clean visitor thought from validated result payload
    const cleanVisitorThought = stripOuterQuotes(data.visitorThought);

    // Focused primary issue evidence for Section 05 (so Section 05 focuses on #1 issue
    // without ever contradicting the targeted signal or left-column diagnosis)
    const normalizeIssueCategory = (rawCat?: string): "clarity" | "audience" | "value" | "trust" | "action" => {
      const c = (rawCat || "").trim().toLowerCase();
      if (c.includes("trust") || c.includes("credibility")) return "trust";
      if (c.includes("audience")) return "audience";
      if (c.includes("value") || c.includes("positioning")) return "value";
      if (c.includes("action") || c.includes("cta")) return "action";
      return "clarity";
    };

    const primaryIssueCategory = normalizeIssueCategory(
      overviewStats.primaryRisk?.category || overviewStats.weakest?.id || "clarity"
    );

    const categoryKeywordMap: Record<"clarity" | "audience" | "value" | "trust" | "action", RegExp> = {
      clarity: /product category|scanning|headline|clarity/i,
      audience: /audience|role|who/i,
      value: /outcome|benefit|value/i,
      trust: /proof|trust|logo|credential/i,
      action: /action|cta|friction|next-step/i,
    };

    const fallbackGapByCategory: Record<"clarity" | "audience" | "value" | "trust" | "action", string> = {
      clarity: "Product category wording requires clearer specificity in the hero section",
      audience: "Target audience or intended user role is not explicitly stated in the hero section",
      value: "Primary value statement could express a more concrete, measurable visitor outcome",
      trust: "Verifiable proof points, customer logos, or credentials were not detected in the extracted homepage content",
      action: "Primary call-to-action path could set clearer expectations for what happens next",
    };

    const primaryPattern = categoryKeywordMap[primaryIssueCategory];

    // Never fall back to verifiedMissingFindings[0] from an unrelated signal category,
    // which would contradict the primary issue diagnosis in Section 05.
    const primaryFocusedMissingFinding =
      verifiedMissingFindings.find((item) => primaryPattern.test(item)) ||
      fallbackGapByCategory[primaryIssueCategory];

    const rawCurrentRecQuote = stripOuterQuotes(
      data.recommendation?.currentDirection
    );
    const hasPrimaryRecQuote = Boolean(
      rawCurrentRecQuote &&
        !isGenericExcerptPlaceholder(rawCurrentRecQuote) &&
        !/^(none|n\/a|not found|missing)$/i.test(rawCurrentRecQuote)
    );

    const isPrimaryRecQuoteAligned =
      hasPrimaryRecQuote &&
      (primaryIssueCategory === "clarity" ||
        primaryIssueCategory === "value" ||
        primaryPattern.test(
          `${data.recommendation?.subhead || ""} ${data.recommendation?.explanation || ""}`
        ));

    return {
      hasVerifiedExcerpt,
      verifiedExcerptText: hasVerifiedExcerpt ? rawExcerpt : null,
      verifiedHeadline,
      verifiedSubheadline,
      verifiedPrimaryCta,
      verifiedClearFindings,
      verifiedMissingFindings,
      firstSecondsRows,
      cleanVisitorThought: cleanVisitorThought.length > 0 ? cleanVisitorThought : null,
      primaryFocusedMissingFinding,
      primaryRecQuote: hasPrimaryRecQuote ? rawCurrentRecQuote : null,
      isPrimaryRecQuoteAligned,
    };
  }, [
    data.evidence,
    data.firstSeconds,
    data.quickSignals,
    data.visitorThought,
    data.recommendation,
    overviewStats.primaryRisk,
    overviewStats.weakest,
  ]);

  // Phase 6: Derive Five Detailed Signals (12), Communication Risks (13), and Other Recommended Improvements (14)
  const phase6DetailedData = useMemo(() => {
    const normalizeText = (value?: string): string =>
      (value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const areTextsDuplicate = (normA: string, normB: string): boolean => {
      if (!normA || !normB) return false;
      if (normA === normB) return true;
      if (normA.length >= 16 && normB.length >= 16) {
        return normA.includes(normB) || normB.includes(normA);
      }
      return false;
    };

    const signalMetaById: Record<
      string,
      {
        indexLabel: "01" | "02" | "03" | "04" | "05";
        shortQuestion: string;
        detailedQuestion: string;
        comprehensionIndex: number;
        clearPattern: RegExp;
        missingPattern: RegExp;
      }
    > = {
      "first-impression": {
        indexLabel: "01",
        shortQuestion: "Is it immediately clear?",
        detailedQuestion: "Is it immediately clear what this website or product does?",
        comprehensionIndex: 0,
        clearPattern: /^product category:/i,
        missingPattern: /product category|scanning|headline|clarity/i,
      },
      audience: {
        indexLabel: "02",
        shortQuestion: "Who is this built for?",
        detailedQuestion: "Can the right audience quickly tell this is meant for them?",
        comprehensionIndex: 1,
        clearPattern: /^target audience:/i,
        missingPattern: /target audience|user role|audience/i,
      },
      value: {
        indexLabel: "03",
        shortQuestion: "Why should a visitor care?",
        detailedQuestion: "Is the main benefit or outcome clear and compelling?",
        comprehensionIndex: 2,
        clearPattern: /^primary outcome:/i,
        missingPattern: /outcome|measurable benefit|value/i,
      },
      trust: {
        indexLabel: "04",
        shortQuestion: "Why should they believe it?",
        detailedQuestion: "Are there visible reasons to believe the website is credible?",
        comprehensionIndex: 3,
        clearPattern: /^(proof element:|credibility signals)/i,
        missingPattern: /proof points|logos|metrics|credentials|trust/i,
      },
      action: {
        indexLabel: "05",
        shortQuestion: "What is the next step?",
        detailedQuestion: "Is the main action obvious and low-friction?",
        comprehensionIndex: 4,
        clearPattern: /^primary action:/i,
        missingPattern: /call-to-action|primary action|vague|competing|high-friction/i,
      },
    };

    const indexFallbacks: Array<"01" | "02" | "03" | "04" | "05"> = [
      "01",
      "02",
      "03",
      "04",
      "05",
    ];

    const detailedSignals = data.signals.map((sig, idx) => {
      const meta = signalMetaById[sig.id];
      const indexLabel = meta?.indexLabel || indexFallbacks[idx] || "05";
      const shortQuestion =
        meta?.shortQuestion ||
        overviewStats.questionBySignalId[sig.id] ||
        "Visitor signal";
      const detailedQuestion =
        meta?.detailedQuestion ||
        overviewStats.questionBySignalId[sig.id] ||
        "How clearly is this signal communicated on the homepage?";

      const compIdx = meta ? meta.comprehensionIndex : idx;
      const comprehensionRow =
        visitorUnderstandingAndEvidence.firstSecondsRows[compIdx] || null;
      const quickTakeaway = data.quickSignals?.[compIdx]?.label || null;

      const verifiedClearFinding = meta
        ? visitorUnderstandingAndEvidence.verifiedClearFindings.find((f) =>
            meta.clearPattern.test(f)
          ) || null
        : null;

      const verifiedMissingFinding = meta
        ? visitorUnderstandingAndEvidence.verifiedMissingFindings.find((f) =>
            meta.missingPattern.test(f)
          ) || null
        : null;

      const isStrongest = Boolean(
        overviewStats.strongest && overviewStats.strongest.id === sig.id
      );
      const isWeakest = Boolean(
        overviewStats.weakest &&
          overviewStats.weakest.id === sig.id &&
          overviewStats.weakest.id !== overviewStats.strongest?.id
      );

      // Concise 1-line summary for Section 04 Overview so full sig.description is reserved for Section 12
      const overviewTakeaway = comprehensionRow
        ? `${comprehensionRow.dimensionLabel}: ${comprehensionRow.label}`
        : sig.badgeText;

      return {
        ...sig,
        indexLabel,
        shortQuestion,
        detailedQuestion,
        overviewTakeaway,
        comprehensionRow,
        verifiedClearFinding,
        verifiedMissingFinding,
        isStrongest,
        isWeakest,
      };
    });

    // Format category names for Communication Risks (Section 13)
    const categoryLabelMap: Record<string, string> = {
      clarity: "Clarity & First Impression",
      audience: "Target Audience",
      value: "Value Proposition",
      trust: "Trust & Credibility",
      action: "Call to Action",
    };

    const formatRiskCategory = (rawCat?: string): string => {
      const key = (rawCat || "").trim().toLowerCase();
      return categoryLabelMap[key] || rawCat || "Communication";
    };

    const primaryRisk = overviewStats.primaryRisk
      ? {
          ...overviewStats.primaryRisk,
          categoryLabel: formatRiskCategory(overviewStats.primaryRisk.category),
        }
      : null;

    // Resolve the targeted signal for the primary risk so Section 05 header/badges never contradict the issue body
    const resolveRiskSignalId = (rawCat?: string): string | undefined => {
      const c = (rawCat || "").trim().toLowerCase();
      if (!c) return undefined;
      if (c.includes("trust") || c.includes("credibility")) return "trust";
      if (c.includes("audience")) return "audience";
      if (c.includes("value") || c.includes("positioning")) return "value";
      if (c.includes("action") || c.includes("cta")) return "action";
      if (c.includes("clarity") || c.includes("first-impression") || c.includes("first_impression")) {
        return "first-impression";
      }
      return undefined;
    };
    const primaryRiskSignalId = primaryRisk
      ? resolveRiskSignalId(primaryRisk.category)
      : undefined;
    const primaryIssueTargetSignal = primaryRiskSignalId
      ? data.signals.find((s) => s.id === primaryRiskSignalId) || overviewStats.weakest
      : overviewStats.weakest;

    // Resolve the targeted signal for Section 06 (#1 Priority Fix) based on what the fix actually addresses
    const resolvePriorityFixSignal = () => {
      const recText = `${data.recommendation?.subhead || ""} ${data.recommendation?.explanation || ""}`.toLowerCase();
      let matchedId: string | null = null;
      if (/\b(trust|proof|credibility|testimonial|logo|logos|metric|metrics|credential|social proof|validation|case stud)\b/i.test(recText)) {
        matchedId = "trust";
      } else if (/\b(cta|call to action|call-to-action|button|next step|friction|action)\b/i.test(recText)) {
        matchedId = "action";
      } else if (/\b(audience|who it is for|who this is for|persona|role|built for|target user|ideal customer)\b/i.test(recText)) {
        matchedId = "audience";
      } else if (/\b(outcome|benefit|value proposition|measurable|what visitors get|what i get)\b/i.test(recText)) {
        matchedId = "value";
      } else if (/\b(product category|what it is|first impression|headline|h1|hero)\b/i.test(recText)) {
        matchedId = "first-impression";
      }
      if (matchedId) {
        const found = data.signals.find((s) => s.id === matchedId);
        if (found) return found;
      }
      return primaryIssueTargetSignal || overviewStats.weakest || null;
    };

    const priorityFixTargetSignal = resolvePriorityFixSignal();

    const stripGuidanceQuotes = (val?: string): string =>
      (val || "")
        .replace(/^[“"'\s]+|[”"'\s]+$/g, "")
        .replace(/\s+/g, " ")
        .trim();

    const isPlaceholderGuidance = (val: string): boolean => {
      const lower = val.toLowerCase();
      return (
        !lower ||
        lower === "current headline excerpt unavailable" ||
        lower === "state the specific outcome your target audience achieves." ||
        lower.includes("we scanned your accessible homepage structure") ||
        lower.includes("we scanned your homepage above the fold structure") ||
        lower === "none" ||
        lower === "n/a" ||
        lower === "unavailable"
      );
    };

    const rawWhatYouSayNow = stripGuidanceQuotes(data.recommendation?.currentDirection);
    const rawClearerDirection = stripGuidanceQuotes(data.recommendation?.strongerDirection);

    const priorityFixCurrentText = !isPlaceholderGuidance(rawWhatYouSayNow)
      ? rawWhatYouSayNow
      : visitorUnderstandingAndEvidence.verifiedHeadline ||
        visitorUnderstandingAndEvidence.verifiedExcerptText ||
        null;

    const priorityFixDirectionText = !isPlaceholderGuidance(rawClearerDirection)
      ? rawClearerDirection
      : data.recommendation?.explanation || null;

    const normPrimaryRiskTitle = normalizeText(primaryRisk?.title);
    const seenRiskTitles = new Set<string>(
      normPrimaryRiskTitle ? [normPrimaryRiskTitle] : []
    );

    const secondaryRisks = overviewStats.secondaryRisks
      .filter((risk) => {
        const normTitle = normalizeText(risk.title);
        if (!normTitle || seenRiskTitles.has(normTitle)) return false;
        if (
          normPrimaryRiskTitle &&
          areTextsDuplicate(normPrimaryRiskTitle, normTitle)
        ) {
          return false;
        }
        seenRiskTitles.add(normTitle);
        return true;
      })
      .map((risk, idx) => ({
        ...risk,
        riskNumber: idx + 2,
        categoryLabel: formatRiskCategory(risk.category),
      }));

    // Deduplicate Other Recommended Improvements (Section 14) against #1 Priority Fix
    const normPrimaryFixTitle = normalizeText(data.recommendation?.subhead);
    const seenImprovementTitles = new Set<string>();

    const deduplicatedImprovements = (data.otherImprovements || [])
      .filter((item) => {
        const normTitle = normalizeText(item?.title);
        if (!normTitle) return false;
        if (
          normPrimaryFixTitle &&
          areTextsDuplicate(normPrimaryFixTitle, normTitle)
        ) {
          return false;
        }
        for (const existing of seenImprovementTitles) {
          if (areTextsDuplicate(existing, normTitle)) {
            return false;
          }
        }
        seenImprovementTitles.add(normTitle);
        return true;
      })
      .map((item, idx) => {
        const matchingStep = priorityFixPlan.find(
          (s) => s.linkedImprovementId === item.id
        );
        const hasCopyReadyCard = copyReadyImprovements.some(
          (c) => c.id === `copy-${item.id}`
        );
        return {
          ...item,
          orderLabel: String(idx + 1).padStart(2, "0"),
          relatedPlanStep: matchingStep ? matchingStep.stepNumber : null,
          hasCopyReadyCard,
        };
      });

    return {
      detailedSignals,
      primaryRisk,
      primaryIssueTargetSignal,
      priorityFixTargetSignal,
      priorityFixCurrentText,
      priorityFixDirectionText,
      secondaryRisks,
      totalRisksCount: (primaryRisk ? 1 : 0) + secondaryRisks.length,
      deduplicatedImprovements,
    };
  }, [
    data.signals,
    data.quickSignals,
    data.recommendation,
    data.otherImprovements,
    overviewStats,
    visitorUnderstandingAndEvidence,
    priorityFixPlan,
    copyReadyImprovements,
  ]);

  // Phase 2: Animate score counter
  useEffect(() => {
    if (!customData || customData.score === undefined) return;
    if (prefersReducedMotion || hasAnimatedScore) {
      const rafId = requestAnimationFrame(() => {
        setDisplayScore(data.score);
      });
      return () => cancelAnimationFrame(rafId);
    }

    let startTimestamp: number | null = null;
    let rafId: number;
    const duration = 800; // ms

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = progress * (2 - progress);
      setDisplayScore(Math.floor(easedProgress * data.score));

      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplayScore(data.score);
        setHasAnimatedScore(true);
      }
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [customData, data.score, prefersReducedMotion, hasAnimatedScore]);

  // Persistence: Safely load previous check for domain & store current result in localStorage
  // Uses WeakMap instance tracking so rerenders or StrictMode remounts never compare the current report to itself.
  useEffect(() => {
    if (typeof window === "undefined" || !customData || customData.score === undefined) return;
    if (previousCheckRecord !== undefined) return;

    const syncResult = syncReportWithHistoryStorage({
      reportInstanceKey: customData,
      domainInput: data.domain || cleanDomain,
      score: data.score,
      signals: data.signals,
    });

    const rafId = requestAnimationFrame(() => {
      setPreviousRecord(syncResult.previousRecord);
      setHadCorruptedHistory(syncResult.hadCorruptedData);
    });

    return () => cancelAnimationFrame(rafId);
  }, [cleanDomain, customData, data.domain, data.score, data.signals, previousCheckRecord]);

  // Phase 7: Evaluate Comparison Eligibility & Before -> After Deltas
  const comparisonEvaluation = useMemo(() => {
    const candidatePrevious =
      previousCheckRecord !== undefined ? previousCheckRecord : previousRecord;
    return evaluateComparisonEligibility({
      currentDomainInput: data.domain || cleanDomain,
      currentScore: customData?.score,
      currentSignals: data.signals,
      previousRecord: candidatePrevious,
    });
  }, [
    cleanDomain,
    customData?.score,
    data.domain,
    data.signals,
    previousCheckRecord,
    previousRecord,
  ]);

  // Multi-Page Phase 3: Defensively validate and format optional Supporting Pages Context
  const supportingPagesInsights = useMemo(() => {
    const rawCtx = data.supportingContext;
    if (!rawCtx || typeof rawCtx !== "object") return null;
    if (rawCtx.status !== "available" && rawCtx.status !== "partial") {
      return null;
    }
    if (!Array.isArray(rawCtx.pagesAnalyzed) || rawCtx.pagesAnalyzed.length === 0) {
      return null;
    }

    const baseHost = (data.domain || cleanDomain)
      .toLowerCase()
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .split("?")[0]
      .split("#")[0];

    const normalizeSafePageUrl = (
      rawUrl: unknown
    ): {
      safeHref: string;
      displayUrl: string;
      urlKey: string;
      pathname: string;
    } | null => {
      if (typeof rawUrl !== "string" || !rawUrl.trim()) return null;
      const trimmed = rawUrl.trim();
      if (!/^https?:\/\//i.test(trimmed)) return null;
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          return null;
        }
        if (parsed.username || parsed.password) return null;
        const candidateHost = parsed.hostname.toLowerCase().replace(/^www\./i, "");
        if (!candidateHost || (baseHost && candidateHost !== baseHost)) {
          return null;
        }
        // Strip query parameters and hash fragments to prevent leaking sensitive query params
        parsed.search = "";
        parsed.hash = "";
        let normPath = parsed.pathname
          .replace(/\/{2,}/g, "/")
          .replace(/\/index\.(html?|php)$/i, "");
        if (normPath.length > 1 && normPath.endsWith("/")) {
          normPath = normPath.slice(0, -1);
        }
        if (!normPath || normPath === "/") {
          return null; // Never treat homepage root as a supporting page
        }
        parsed.pathname = normPath;
        return {
          safeHref: parsed.href,
          displayUrl: `${candidateHost}${normPath}`,
          urlKey: `${candidateHost}${normPath.toLowerCase()}`,
          pathname: normPath,
        };
      } catch {
        return null;
      }
    };

    const formatCategoryLabel = (rawCategory: unknown): string => {
      const cat =
        typeof rawCategory === "string"
          ? rawCategory.trim().toLowerCase()
          : "other";
      const map: Record<string, string> = {
        pricing: "Pricing",
        features: "Features",
        product: "Product",
        how_it_works: "How It Works",
        solutions: "Solutions",
        use_cases: "Use Cases",
        customers: "Customers",
        security: "Security",
        about: "About",
        docs: "Documentation",
        other: "Supporting Page",
      };
      return (
        map[cat] ||
        cat
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase())
      );
    };

    const isSafePlainText = (val: unknown, maxLen = 420): val is string => {
      if (typeof val !== "string") return false;
      const t = val.trim();
      if (!t || t.length < 3 || t.length > maxLen) return false;
      // Reject raw HTML tags, stack traces, or credential/JSON leaks
      if (
        /<\s*(script|html|body|iframe|style|div|section)\b/i.test(t) ||
        t.includes("\n    at ") ||
        t.includes("API_KEY") ||
        t.startsWith("{")
      ) {
        return false;
      }
      return true;
    };

    // 1. Validate Pages Reviewed (Max 3 unique same-domain supporting pages)
    const pagesReviewed: Array<{
      safeHref: string;
      displayUrl: string;
      urlKey: string;
      pathname: string;
      categoryLabel: string;
      title?: string;
    }> = [];
    const pageByUrlKey = new Map<
      string,
      {
        safeHref: string;
        displayUrl: string;
        categoryLabel: string;
        pathname: string;
      }
    >();

    for (const item of rawCtx.pagesAnalyzed) {
      if (pagesReviewed.length >= 3) break;
      if (!item || typeof item !== "object") continue;
      const norm = normalizeSafePageUrl(item.url);
      if (!norm || pageByUrlKey.has(norm.urlKey)) continue;

      const categoryLabel = formatCategoryLabel(item.category);
      const cleanTitle = isSafePlainText(item.title, 160)
        ? item.title.trim()
        : undefined;

      const entry = {
        ...norm,
        categoryLabel,
        ...(cleanTitle ? { title: cleanTitle } : {}),
      };
      pagesReviewed.push(entry);
      pageByUrlKey.set(norm.urlKey, {
        safeHref: norm.safeHref,
        displayUrl: norm.displayUrl,
        categoryLabel,
        pathname: norm.pathname,
      });
    }

    if (pagesReviewed.length === 0) {
      return null;
    }

    // Helper to validate SourceEvidence strictly against pagesReviewed
    const validateUiEvidence = (
      rawEvList: unknown,
      isTrustSection = false
    ): Array<{
      safeSourceUrl: string;
      displaySourceUrl: string;
      sourceCategoryLabel: string;
      excerpt: string;
      interpretation?: string;
      claimBadgeLabel?: string;
      isPublishedClaim: boolean;
    }> => {
      if (!Array.isArray(rawEvList)) return [];
      const validList: Array<{
        safeSourceUrl: string;
        displaySourceUrl: string;
        sourceCategoryLabel: string;
        excerpt: string;
        interpretation?: string;
        claimBadgeLabel?: string;
        isPublishedClaim: boolean;
      }> = [];
      const seen = new Set<string>();

      for (const ev of rawEvList) {
        if (!ev || typeof ev !== "object") continue;
        const rawSource = (ev as any).sourceUrl;
        const rawExcerpt = (ev as any).excerpt;
        const rawInterp = (ev as any).interpretation;
        const rawBasis = (ev as any).claimBasis;

        const normSource = normalizeSafePageUrl(rawSource);
        if (!normSource) continue;
        const matchedPage = pageByUrlKey.get(normSource.urlKey);
        if (!matchedPage) continue; // Must match an actually reviewed supporting page

        if (!isSafePlainText(rawExcerpt, 360)) continue;
        const excerpt = rawExcerpt.trim();
        if (excerpt.length < 4) continue;

        const dedupeKey = `${normSource.urlKey}|${excerpt.toLowerCase()}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const hasClaimPattern =
          rawBasis === "website_published_claim" ||
          /\b(trusted by|customers|users|uptime|soc\s?2|iso\s?27001|gdpr|hipaa|certified|award|guaranteed|saved|\d+%|\$\d+|\d+\+)/i.test(
            excerpt
          );

        let interpretation = isSafePlainText(rawInterp, 260)
          ? rawInterp.trim()
          : undefined;

        if (interpretation && isTrustSection) {
          interpretation = interpretation
            .replace(
              /\b(independently verified|verified fact|proven fact|conclusively proves|proves that|guarantees that)\b/gi,
              "published on the website as"
            );
        }

        validList.push({
          safeSourceUrl: matchedPage.safeHref,
          displaySourceUrl: matchedPage.displayUrl,
          sourceCategoryLabel: matchedPage.categoryLabel,
          excerpt,
          ...(interpretation ? { interpretation } : {}),
          ...(isTrustSection
            ? {
                claimBadgeLabel: hasClaimPattern
                  ? "Website-published claim"
                  : "Observed on page",
              }
            : {}),
          isPublishedClaim: hasClaimPattern,
        });
      }

      return validList.slice(0, 4);
    };

    // 2. Validate Message Consistency
    let messageConsistency: {
      statusLabel: string;
      statusTone: "emerald" | "blue" | "amber" | "slate";
      assessment: string;
      evidence: ReturnType<typeof validateUiEvidence>;
    } | null = null;

    if (
      rawCtx.messageConsistency &&
      typeof rawCtx.messageConsistency === "object" &&
      isSafePlainText(rawCtx.messageConsistency.assessment, 450)
    ) {
      const ev = validateUiEvidence(rawCtx.messageConsistency.evidence, false);
      const rawStatus = rawCtx.messageConsistency.status;
      if (ev.length > 0 || rawStatus === "insufficient_evidence") {
        let statusLabel = "Supports homepage message";
        let statusTone: "emerald" | "blue" | "amber" | "slate" = "blue";
        if (rawStatus === "consistent") {
          statusLabel = "Consistent with homepage";
          statusTone = "emerald";
        } else if (rawStatus === "clarifies_homepage") {
          statusLabel = "Clarifies homepage promise";
          statusTone = "blue";
        } else if (rawStatus === "divergent") {
          statusLabel = "Meaningful difference noted";
          statusTone = "amber";
        } else if (rawStatus === "insufficient_evidence") {
          statusLabel = "Limited text extracted";
          statusTone = "slate";
        }
        messageConsistency = {
          statusLabel,
          statusTone,
          assessment: rawCtx.messageConsistency.assessment.trim(),
          evidence: ev,
        };
      }
    }

    // 3. Validate Additional Trust Context
    let trustContext: {
      assessment: string;
      evidence: ReturnType<typeof validateUiEvidence>;
      hasPublishedClaims: boolean;
    } | null = null;

    if (
      rawCtx.trustContext &&
      typeof rawCtx.trustContext === "object" &&
      isSafePlainText(rawCtx.trustContext.assessment, 450)
    ) {
      const ev = validateUiEvidence(rawCtx.trustContext.evidence, true);
      const rawStatus = rawCtx.trustContext.status;
      if (ev.length > 0 || rawStatus === "insufficient_evidence") {
        const hasPublishedClaims = ev.some((e) => e.isPublishedClaim);
        let safeAssessment = rawCtx.trustContext.assessment
          .trim()
          .replace(
            /\b(independently verified|verified fact|proven fact|conclusively proves|proves that|guarantees that)\b/gi,
            "published on the website as"
          );
        if (
          hasPublishedClaims &&
          !/not independently verified/i.test(safeAssessment)
        ) {
          safeAssessment = `${safeAssessment.replace(/\.?\s*$/, "")} (website-published claim, not independently verified).`;
        }
        trustContext = {
          assessment: safeAssessment,
          evidence: ev,
          hasPublishedClaims,
        };
      }
    }

    // 4. Validate Next-Step (CTA Destination) Context
    let ctaDestination: {
      inspectable: boolean;
      ctaText?: string;
      safeDestinationUrl?: string;
      displayDestinationUrl?: string;
      purposeClear?: boolean;
      alignsWithCtaWording?: boolean;
      nextActionUnderstandable?: boolean;
      assessment: string;
      evidence: ReturnType<typeof validateUiEvidence>;
    } | null = null;

    if (
      rawCtx.ctaDestination &&
      typeof rawCtx.ctaDestination === "object" &&
      isSafePlainText(rawCtx.ctaDestination.assessment, 450)
    ) {
      const ctaText = isSafePlainText(rawCtx.ctaDestination.ctaText, 90)
        ? rawCtx.ctaDestination.ctaText.trim()
        : undefined;

      if (rawCtx.ctaDestination.inspectable === true) {
        const normDest = normalizeSafePageUrl(rawCtx.ctaDestination.destinationUrl);
        const matchedDestPage = normDest
          ? pageByUrlKey.get(normDest.urlKey)
          : undefined;
        const ev = validateUiEvidence(rawCtx.ctaDestination.evidence, false);

        if (matchedDestPage && ev.length > 0) {
          ctaDestination = {
            inspectable: true,
            ctaText,
            safeDestinationUrl: matchedDestPage.safeHref,
            displayDestinationUrl: matchedDestPage.displayUrl,
            purposeClear:
              typeof rawCtx.ctaDestination.purposeClear === "boolean"
                ? rawCtx.ctaDestination.purposeClear
                : undefined,
            alignsWithCtaWording:
              typeof rawCtx.ctaDestination.alignsWithCtaWording === "boolean"
                ? rawCtx.ctaDestination.alignsWithCtaWording
                : undefined,
            nextActionUnderstandable:
              typeof rawCtx.ctaDestination.nextActionUnderstandable === "boolean"
                ? rawCtx.ctaDestination.nextActionUnderstandable
                : undefined,
            assessment: rawCtx.ctaDestination.assessment.trim(),
            evidence: ev,
          };
        }
      } else if (rawCtx.ctaDestination.inspectable === false) {
        ctaDestination = {
          inspectable: false,
          ctaText,
          assessment: rawCtx.ctaDestination.assessment.trim(),
          evidence: [],
        };
      }
    }

    // 5. Meaningful Insights Gate: Do not render an empty section when no grounded insights exist
    const hasGroundedInsight =
      Boolean(messageConsistency && messageConsistency.evidence.length > 0) ||
      Boolean(trustContext && trustContext.evidence.length > 0) ||
      Boolean(
        ctaDestination &&
          ctaDestination.inspectable &&
          ctaDestination.evidence.length > 0
      );

    if (!hasGroundedInsight) {
      return null;
    }

    // 6. Validate Analysis Limitations (only genuine limitations, no generic boilerplate or stack traces)
    const limitations: string[] = [];
    if (Array.isArray(rawCtx.limitations)) {
      for (const lim of rawCtx.limitations) {
        if (!isSafePlainText(lim, 320)) continue;
        const cleanedLim = lim.trim();
        // Skip generic non-limitation disclaimer strings that duplicate the Trust Context badge
        if (
          /supporting-page credibility items reflect website-published statements/i.test(
            cleanedLim
          )
        ) {
          continue;
        }
        if (!limitations.includes(cleanedLim)) {
          limitations.push(cleanedLim);
        }
      }
    }

    return {
      status: rawCtx.status,
      pagesReviewed,
      messageConsistency,
      trustContext,
      ctaDestination,
      limitations: limitations.slice(0, 4),
    };
  }, [cleanDomain, data.domain, data.supportingContext]);

  // Keyboard accessibility: Close modal & options menu on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMethodologyModalOpen(false);
        setActionsMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Click outside to close options overflow menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setActionsMenuOpen(false);
      }
    };
    if (actionsMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [actionsMenuOpen]);

  // Background scroll lock when Score Methodology Modal is open
  useEffect(() => {
    if (isMethodologyModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isMethodologyModalOpen]);

  const showToast = (message: string, tone: "success" | "warning" = "success") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToastTone(tone);
    setToastMessage(message);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
      toastTimerRef.current = null;
    }, 3200);
  };

  // Build plain-text diagnostic summary respecting Free Preview vs Full Report boundaries
  const buildReportSummaryText = () =>
    buildReportSummaryForExport(data, isReportUnlocked);

  // Clipboard Helper with Error Handling & Duplicate Click Protection
  const copyToClipboard = async (text: string, id: string, customToast?: string) => {
    if (copiedState === id) return;
    const cleanText = text.trim();
    if (!cleanText) {
      showToast("No replacement text available to copy.", "warning");
      return;
    }

    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
        throw new Error("Clipboard API unavailable");
      }
      await navigator.clipboard.writeText(cleanText);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      setCopiedState(id);
      if (customToast) {
        showToast(customToast, "success");
      }
      copyTimerRef.current = setTimeout(() => {
        setCopiedState(null);
        copyTimerRef.current = null;
      }, 2200);
    } catch {
      setCopiedState(null);
      showToast("Couldn't copy text automatically. Please select and copy manually.", "warning");
    }
  };

  // Phase 2: Honest Share Summary with Clipboard Fallback (Strictly Free Preview when locked)
  const handleShare = async () => {
    if (shareState !== "idle") return;
    setShareState("sharing");

    const summaryText = buildReportSummaryText();
    const shareData = {
      title: `StrangerLens ${isReportUnlocked ? "Full Report" : "Free Preview"} for ${cleanDomain} (${data.score}/100)`,
      text: summaryText,
    };

    if (navigator.share && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
        setShareState("copied");
        showToast(
          isReportUnlocked
            ? "Full report summary shared!"
            : "Free preview summary shared!",
          "success"
        );
        setTimeout(() => setShareState("idle"), 2200);
        return;
      } catch {
        // Fallback to clipboard if user cancels or environment blocks navigator.share
      }
    }

    try {
      await navigator.clipboard.writeText(summaryText);
      setShareState("copied");
      showToast(
        isReportUnlocked
          ? "Full report summary copied to clipboard!"
          : "Free preview summary copied to clipboard!",
        "success"
      );
      setTimeout(() => setShareState("idle"), 2200);
    } catch {
      showToast("Couldn't copy report summary automatically.", "warning");
      setShareState("idle");
    }
  };

  // Phase 2: Honest Download Report Handler (Downloads Free Preview Summary when locked)
  const handleDownloadReport = () => {
    if (downloadState !== "idle") return;
    setDownloadState("preparing");

    setTimeout(() => {
      try {
        const reportText = buildReportSummaryText();
        const blob = new Blob([reportText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const safeDomain = cleanDomain.replace(/[^a-z0-9.-]/gi, "-");
        const filePrefix = isReportUnlocked
          ? "strangerlens-full-report"
          : "strangerlens-free-preview";
        link.href = url;
        link.download = `${filePrefix}-${safeDomain}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setDownloadState("downloaded");
        showToast(`Downloaded ${filePrefix}-${safeDomain}.txt`, "success");
        setTimeout(() => setDownloadState("idle"), 2500);
      } catch {
        setDownloadState("failed");
        showToast("Couldn't download report file. Try copying the summary instead.", "warning");
        setTimeout(() => {
          setDownloadState("idle");
        }, 3000);
      }
    }, 250);
  };

  // Phase 2: Check Again Async Handler
  const handleCheckAgain = () => {
    if (checkAgainState !== "idle") return;
    setCheckAgainState("checking");

    setTimeout(() => {
      onRunNewCheck();
    }, 350);
  };

  // Phase 2: Download Website Improvement Brief Handler
  const handleDownloadBrief = () => {
    try {
      const briefText = buildImprovementBriefText(
        data,
        priorityFixPlan,
        copyReadyImprovements
      );
      const blob = new Blob([briefText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeDomain = cleanDomain.replace(/[^a-z0-9.-]/gi, "-");
      link.href = url;
      link.download = `strangerlens-improvement-brief-${safeDomain}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`Downloaded improvement brief for ${cleanDomain}`, "success");
    } catch {
      showToast("Couldn't download brief file. Try copying instead.", "warning");
    }
  };

  // Phase 2: Copy Website Improvement Brief Handler
  const handleCopyBrief = () => {
    const briefText = buildImprovementBriefText(
      data,
      priorityFixPlan,
      copyReadyImprovements
    );
    copyToClipboard(briefText, "copy-brief", "Improvement brief copied to clipboard!");
  };

  // Focus Paywall Helper when clicking a locked section preview card or jump link
  const handleLockedSectionClick = (sectionNum: string, sectionTitle: string) => {
    const paywallEl = document.getElementById("paid-report-paywall-section");
    if (paywallEl) {
      paywallEl.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    }
    const emailInputEl = document.getElementById(
      "paywall-email-input"
    ) as HTMLInputElement | null;
    if (emailInputEl) {
      setTimeout(() => {
        emailInputEl.focus({ preventScroll: true });
      }, 150);
    }
    showToast(
      `Section ${sectionNum} (${sectionTitle}) is part of the Full Report ($5). Enter your email above for launch access.`,
      "warning"
    );
  };

  const handleJumpLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionNum: string,
    sectionTitle: string
  ) => {
    if (!isReportUnlocked) {
      e.preventDefault();
      handleLockedSectionClick(sectionNum, sectionTitle);
    }
  };

  // Paywall Checkout Submit Handler (Honest Pre-Launch Coming Soon State — Never Fakes Payment Success)
  const handlePaywallCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (paywallCheckoutState === "processing") return;

    const trimmedEmail = paywallEmail.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setPaywallEmailError("Please enter a valid email address to continue.");
      return;
    }

    setPaywallEmailError(null);
    setPaywallCheckoutState("processing");

    const planLabel = "$5 Complete Fix";

    setTimeout(() => {
      setPaywallCheckoutState("coming_soon");
      showToast(
        `Paid checkout for the ${planLabel} is coming soon. No payment was processed.`,
        "warning"
      );
    }, 200);
  };

  // Enforce Real Analysis Only: Never show mock results or hardcoded scores
  if (!customData || customData.score === undefined) {
    return (
      <div className="min-h-screen bg-[#fafafc] text-slate-900 font-sans antialiased flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-lg">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 mb-2">No Analysis Data Available</h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            A real website scan must be performed to view visitor comprehension results for {cleanDomain}.
          </p>
          <button
            onClick={onBackToLanding}
            className="w-full rounded-full bg-[#1d68f5] hover:bg-blue-600 text-white font-medium text-sm py-3 transition shadow-sm cursor-pointer"
          >
            Check a website
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090D15] text-[#F1F5F9] font-sans antialiased selection:bg-[#3B82F6]/30 selection:text-[#F1F5F9] flex flex-col relative">
      {/* Non-blocking Toast Feedback */}
      <AnimatePresence>
        {(copiedState || toastMessage) && (
          <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50 bg-[#121824] text-[#F1F5F9] px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium flex items-center gap-2 border border-[#263044] print:hidden"
            role="status"
            aria-live="polite"
          >
            {toastMessage ? (
              <>
                {toastTone === "warning" ? (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <span>{toastMessage}</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Suggested copy copied to clipboard!</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. HEADER (Compact Dark Sticky Navigation Header) */}
      <header className="w-full bg-[#090D15]/95 backdrop-blur-md border-b border-[#263044] sticky top-0 z-30 transition-all print:static print:border-b">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[64px] sm:h-[70px] flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center shrink-0">
            <button
              onClick={onBackToLanding}
              className="flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight text-[#F1F5F9] hover:opacity-85 transition cursor-pointer text-left min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none rounded-md px-1"
              title="Return to StrangerLens Home"
              aria-label="Return to StrangerLens Home"
            >
              <div className="w-8 h-8 rounded-xl bg-[#171F2D] border border-[#263044] text-[#3B82F6] flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs shrink-0">
                S
              </div>
              <span className="whitespace-nowrap font-extrabold tracking-tight">StrangerLens</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-5 md:gap-8 print:hidden">
            <button
              onClick={onOpenFaq}
              className="text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none rounded-md"
            >
              FAQ
            </button>
            <button
              onClick={onOpenPricing}
              className="text-sm font-medium text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer min-h-[44px] inline-flex items-center px-1 focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none rounded-md"
            >
              Pricing
            </button>
            <button
              onClick={onRunNewCheck}
              className="rounded-full bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap shrink-0 min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
            >
              <span>New check</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5 shrink-0" />
            </button>
          </div>

          {/* Mobile Navigation Controls */}
          <div className="flex sm:hidden items-center gap-2 print:hidden">
            <button
              onClick={onRunNewCheck}
              className="rounded-full bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-semibold px-3.5 py-2 transition inline-flex items-center gap-1 shadow-sm cursor-pointer whitespace-nowrap min-h-[40px]"
            >
              <span>New check</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation menu"
              className="w-10 h-10 rounded-xl border border-[#263044] bg-[#121824] text-[#F1F5F9] hover:bg-[#171F2D] flex items-center justify-center cursor-pointer transition"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Clean Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden bg-[#121824] border-t border-[#263044] px-4 py-3 space-y-1 shadow-xl print:hidden">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenFaq();
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F1F5F9] hover:bg-[#171F2D] transition cursor-pointer"
            >
              FAQ
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPricing();
              }}
              className="w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium text-[#F1F5F9] hover:bg-[#171F2D] transition cursor-pointer"
            >
              Pricing
            </button>
          </div>
        )}
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 pt-5 sm:pt-7 pb-16 sm:pb-24 space-y-6 sm:space-y-7">
        
        {/* ACCESS ERROR / PARTIAL WARNING STATE */}
        {data.isAccessError && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-950/40 border border-amber-500/30 rounded-2xl p-4 sm:p-5 text-amber-200 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block text-amber-100 text-sm">We {"couldn't"} fully access this homepage.</strong>
                <p className="text-amber-300/90 mt-0.5">We {"couldn't"} complete the full first-impression check because part of the page was unavailable.</p>
              </div>
            </div>
            <button
              onClick={handleCheckAgain}
              className="rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 text-xs shrink-0 cursor-pointer transition min-h-[44px]"
            >
              Try again →
            </button>
          </motion.div>
        )}

        {data.isPartialAccess && !data.isAccessError && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-950/30 border border-amber-500/30 rounded-2xl px-4 py-3.5 text-amber-200 text-xs sm:text-[13px] flex items-start sm:items-center gap-3 shadow-sm"
          >
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <p className="leading-relaxed">
              <strong className="font-semibold text-amber-100">Limited visible text detected:</strong>{" "}
              Some content on {data.domain} may load dynamically via client-side scripts. This report reflects the initial visible HTML seen on arrival.
            </p>
          </motion.div>
        )}

        {/* WEBSITE + ANALYSIS DATE (Clean Top Bar with Attached 3-Dot Menu) */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="flex items-center justify-between gap-3 pb-0.5 scroll-mt-24"
        >
          {/* Domain Identity Pill with Attached Compact 3-Dot Menu */}
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#121824] border border-[#263044] shadow-xs text-xs sm:text-[13px] text-[#94A3B8] max-w-full min-h-[44px]">
            <div className="w-6 h-6 rounded-full bg-[#171F2D] text-[#3B82F6] border border-[#263044] flex items-center justify-center shrink-0">
              <Link2 className="w-3.5 h-3.5" />
            </div>
            <span className="truncate max-w-[170px] sm:max-w-[280px]">
              <strong className="font-bold text-[#F1F5F9]">{data.domain}</strong>
            </span>
            {data.checkedAt && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[#94A3B8] pl-2 border-l border-[#263044] shrink-0">
                <Clock className="w-3 h-3 text-[#94A3B8]" />
                <span>{data.checkedAt}</span>
              </span>
            )}
            {/* Compact Three-Dot Menu beside domain */}
            <div className="relative shrink-0 pl-1 border-l border-[#263044]" ref={actionsMenuRef}>
              <button
                type="button"
                onClick={() => setActionsMenuOpen((prev) => !prev)}
                aria-expanded={actionsMenuOpen}
                aria-haspopup="true"
                aria-label="Report options menu"
                className="w-7 h-7 rounded-full text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#171F2D] flex items-center justify-center transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {actionsMenuOpen && (
                <div
                  role="menu"
                  aria-orientation="vertical"
                  className="absolute right-0 sm:left-0 mt-2 w-56 max-w-[calc(100vw-48px)] bg-[#121824] rounded-xl shadow-2xl border border-[#263044] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      handleCheckAgain();
                    }}
                    disabled={checkAgainState === "checking"}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#F1F5F9] hover:bg-[#171F2D] flex items-center gap-2.5 transition cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-[#94A3B8] shrink-0 ${
                        checkAgainState === "checking" ? "animate-spin text-[#3B82F6]" : ""
                      }`}
                    />
                    <span>{checkAgainState === "checking" ? "Checking…" : "Recheck Website"}</span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      handleShare();
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#F1F5F9] hover:bg-[#171F2D] flex items-center gap-2.5 transition cursor-pointer"
                  >
                    {shareState === "copied" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold">Summary copied</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span>Share Summary</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setActionsMenuOpen(false);
                      handleDownloadReport();
                    }}
                    disabled={downloadState === "preparing"}
                    className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#F1F5F9] hover:bg-[#171F2D] flex items-center gap-2.5 transition cursor-pointer disabled:opacity-60"
                  >
                    {downloadState === "preparing" ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-[#3B82F6] animate-spin shrink-0" />
                        <span>Preparing…</span>
                      </>
                    ) : downloadState === "downloaded" ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold">Downloaded ✓</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-[#94A3B8] shrink-0" />
                        <span>Download Summary</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* 01. YOUR FIRST IMPRESSION */}
        <motion.section
          id="first-impression-section"
          aria-labelledby="first-impression-heading"
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#121824] border border-[#263044] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-md relative scroll-mt-24 space-y-6"
        >
          <div className="pb-3 border-b border-[#263044]">
            <h2
              id="first-impression-heading"
              className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
            >
              01. Your First Impression
            </h2>
          </div>

          {/* Top Row: Score on Left, Verdict on Right */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center">
            {/* Score on Left (4 cols) */}
            <div
              data-score-section="VALUE CLARITY SCORE"
              className="md:col-span-4 flex flex-col items-center md:items-start text-center md:text-left border-b md:border-b-0 md:border-r border-[#263044] pb-6 md:pb-0 md:pr-6 shrink-0"
            >
              <div className="flex items-baseline gap-1.5 tabular-nums">
                <span className="text-5xl sm:text-6xl font-black text-[#F1F5F9] tracking-tight leading-none">
                  {displayScore}
                </span>
                <span className="text-sm sm:text-base font-bold text-[#94A3B8]">/ 100</span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${scoreVisuals.pillBg}`}>
                  {data.score >= 75 ? (
                    <Check className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                  ) : data.score >= 50 ? (
                    <Zap className="w-3.5 h-3.5 fill-current shrink-0" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{data.scoreStatus}</span>
                </span>
              </div>

              {/* Score Methodology Modal Trigger */}
              <button
                type="button"
                onClick={() => setIsMethodologyModalOpen(true)}
                aria-haspopup="dialog"
                className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] hover:text-blue-400 hover:underline transition-colors cursor-pointer print:hidden focus-visible:outline-none"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>How is this score calculated?</span>
              </button>
            </div>

            {/* Verdict on Right (8 cols) */}
            <div className="md:col-span-8 flex flex-col justify-center">
              <h1 className="text-xl sm:text-2xl md:text-[26px] font-extrabold text-[#F1F5F9] tracking-tight leading-[1.3] [text-wrap:balance]">
                {data.verdict}
              </h1>

              {data.verdictSubtext && (
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-2 font-normal leading-relaxed">
                  {data.verdictSubtext}
                </p>
              )}
            </div>
          </div>

          {/* Five Signals */}
          <div className="pt-4 border-t border-[#263044]">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {phase6DetailedData.detailedSignals.map((sig) => {
                const barColor =
                  sig.badgeType === "clear"
                    ? "bg-emerald-500"
                    : sig.badgeType === "amber"
                    ? "bg-amber-500"
                    : "bg-rose-500";

                const badgeStyle =
                  sig.badgeType === "clear"
                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                    : sig.badgeType === "amber"
                    ? "bg-amber-950/60 text-amber-400 border-amber-500/30"
                    : "bg-rose-950/60 text-rose-400 border-rose-500/30";

                return (
                  <div
                    key={sig.id}
                    className="bg-[#171F2D] border border-[#263044] rounded-xl p-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-xs font-bold text-[#F1F5F9] truncate" title={sig.title}>
                          {sig.title}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 mb-2">
                        <div className="flex items-baseline gap-1 tabular-nums">
                          <span className="text-lg font-black text-[#F1F5F9] leading-none">
                            {sig.score}
                          </span>
                          <span className="text-[11px] text-[#94A3B8] font-medium">/ 100</span>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${badgeStyle}`}>
                          {sig.badgeText}
                        </span>
                      </div>
                    </div>

                    <div
                      className="w-full h-1.5 bg-[#090D15] rounded-full overflow-hidden"
                      role="progressbar"
                      aria-valuenow={sig.score}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${sig.title}: ${sig.score}/100`}
                    >
                      <div
                        style={{ width: `${Math.max(4, Math.min(100, sig.score))}%` }}
                        className={`h-full rounded-full ${barColor}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* 02. YOUR BIGGEST CLARITY GAP */}
        <section
          id="biggest-clarity-gap-section"
          aria-labelledby="biggest-clarity-gap-heading"
          className="bg-[#121824] border border-[#263044] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-md scroll-mt-24 space-y-6"
        >
          {/* Header */}
          <div className="pb-3 border-b border-[#263044]">
            <h2
              id="biggest-clarity-gap-heading"
              className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
            >
              02. Your Biggest Clarity Gap
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-normal">
              What your website says versus what visitors may understand, and your immediate first step.
            </p>
          </div>

          {/* Connected Diagnosis: A & B Side-by-Side (Desktop) / Stacked (Mobile) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* A. YOUR WEBSITE SAYS */}
            <div className="bg-[#171F2D] border border-[#263044] rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-extrabold tracking-wider text-[#94A3B8] uppercase block mb-2">
                  A. YOUR WEBSITE SAYS
                </span>
                {visitorUnderstandingAndEvidence.primaryRecQuote ||
                visitorUnderstandingAndEvidence.verifiedExcerptText ||
                data.evidence.homepageExcerpt ? (
                  <p className="text-sm sm:text-base font-semibold text-[#F1F5F9] leading-relaxed break-words">
                    &ldquo;
                    {(visitorUnderstandingAndEvidence.isPrimaryRecQuoteAligned
                      ? visitorUnderstandingAndEvidence.primaryRecQuote
                      : visitorUnderstandingAndEvidence.verifiedExcerptText) ||
                      visitorUnderstandingAndEvidence.primaryRecQuote ||
                      data.evidence.homepageExcerpt}
                    &rdquo;
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed italic">
                    No headline text verified in the initial HTML response.
                  </p>
                )}
              </div>
            </div>

            {/* B. A VISITOR MAY UNDERSTAND */}
            <div className="bg-[#171F2D] border border-[#3B82F6]/40 rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
              <div>
                <span className="text-[11px] font-extrabold tracking-wider text-[#3B82F6] uppercase block mb-2">
                  B. A VISITOR MAY UNDERSTAND
                </span>
                {data.visitorThought && data.visitorThought !== "No simulated visitor thought available for this scan." ? (
                  <p className="text-sm sm:text-base font-semibold text-[#F1F5F9] leading-relaxed break-words">
                    &ldquo;{data.visitorThought}&rdquo;
                  </p>
                ) : data.websiteMessage?.summary ? (
                  <p className="text-sm sm:text-base font-semibold text-[#F1F5F9] leading-relaxed break-words">
                    {data.websiteMessage.summary}
                  </p>
                ) : (
                  <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed italic">
                    First-time visitor interpretation unavailable for this scan.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* C. WHAT'S UNCLEAR */}
          <div className="bg-[#171F2D] border border-amber-500/40 rounded-2xl p-4 sm:p-5">
            <span className="text-[11px] font-extrabold tracking-wider text-amber-400 uppercase block mb-1.5">
              C. WHAT&apos;S UNCLEAR
            </span>
            <p className="text-xs sm:text-sm font-semibold text-[#F1F5F9] leading-relaxed">
              {visitorUnderstandingAndEvidence.primaryFocusedMissingFinding ||
                phase6DetailedData.primaryRisk?.title ||
                data.evidence.missingFindings?.[0] ||
                "Key target audience or value proposition details are missing from the opening hero."}
            </p>
          </div>

          {/* D. FIRST STEP */}
          <div className="bg-[#171F2D] border border-[#263044] rounded-2xl p-4 sm:p-5 space-y-2">
            <span className="text-[11px] font-extrabold tracking-wider text-[#3B82F6] uppercase block mb-1">
              D. FIRST STEP
            </span>
            <h3 className="text-base sm:text-lg font-bold text-[#F1F5F9]">
              {data.recommendation.subhead || data.recommendation.title || "Clarify your primary homepage headline"}
            </h3>
            <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed font-normal">
              {data.recommendation.explanation || priorityFixPlan[0]?.title || "State clearly what the product is, who it serves, and the main outcome visitors achieve."}
            </p>
            {(priorityFixPlan[0]?.where || data.evidence.locationTag) && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121824] border border-[#263044] text-xs mt-2">
                <span className="font-bold text-[#3B82F6] uppercase tracking-wider text-[10px]">Location:</span>
                <span className="font-medium text-[#F1F5F9]">
                  {priorityFixPlan[0]?.where || data.evidence.locationTag}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* =========================================================================
            PREMIUM PAYWALL (Rendered immediately after free Section 3 when locked)
           ========================================================================= */}
        {/* =========================================================================
            PAYMENT SECTION: ONE $5 COMPLETE FIX OFFER
           ========================================================================= */}
        {(!isReportUnlocked || isInternalDevPreview) && (
          <section
            id="paid-report-paywall-section"
            aria-labelledby="paid-report-paywall-heading"
            className="bg-[#121824] border-2 border-[#3B82F6]/30 rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-md scroll-mt-24 print:hidden"
          >
            <div className="max-w-xl mx-auto text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full bg-[#171F2D] text-[#3B82F6] border border-[#3B82F6]/40">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>COMPLETE FIX OFFER</span>
              </div>

              <h2
                id="paid-report-paywall-heading"
                className="text-xl sm:text-2xl md:text-3xl font-extrabold text-[#F1F5F9] tracking-tight"
              >
                Get Your Complete Fix
              </h2>

              <p className="text-xs sm:text-sm text-[#94A3B8] leading-relaxed">
                Know exactly what to change, where to change it, and how to improve your website&apos;s biggest first-impression problem.
              </p>

              {/* Show ONLY these benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-1">
                {[
                  "Exact changes and locations",
                  "Clear implementation guidance",
                  "Improved messaging when supported",
                  "Relevant evidence and next steps",
                ].map((benefit, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-[#171F2D] border border-[#263044]">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[2.5]" />
                    <span className="text-xs font-semibold text-[#F1F5F9]">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Price */}
              <div className="pt-2 text-center">
                <div className="inline-flex items-baseline gap-1.5 tabular-nums">
                  <span className="text-3xl sm:text-4xl font-black text-[#F1F5F9]">$5</span>
                  <span className="text-xs text-[#94A3B8] font-medium">· One-time</span>
                </div>
              </div>

              {/* Email Form + Primary Checkout CTA */}
              <form onSubmit={handlePaywallCheckout} className="space-y-3 pt-1 text-left" noValidate>
                <div>
                  <label htmlFor="paywall-email-input" className="sr-only">
                    Email address for report delivery
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 pointer-events-none" />
                    <input
                      id="paywall-email-input"
                      type="email"
                      value={paywallEmail}
                      onChange={(e) => {
                        setPaywallEmail(e.target.value);
                        if (paywallEmailError) setPaywallEmailError(null);
                      }}
                      placeholder="Enter your email to unlock…"
                      aria-label="Email address for report delivery"
                      aria-invalid={Boolean(paywallEmailError)}
                      className={`w-full pl-9 pr-3.5 py-3 min-h-[46px] text-xs sm:text-sm bg-[#171F2D] border rounded-xl text-[#F1F5F9] placeholder:text-[#94A3B8] outline-none transition-all ${
                        paywallEmailError
                          ? "border-rose-500 ring-2 ring-rose-500/20"
                          : "border-[#263044] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20"
                      }`}
                    />
                  </div>
                  {paywallEmailError && (
                    <p className="text-[11px] text-rose-400 font-medium mt-1 pl-1" role="alert">
                      {paywallEmailError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={paywallCheckoutState === "processing"}
                  className="w-full min-h-[48px] rounded-xl bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.99] text-white font-bold text-sm px-6 py-3 transition-all inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer disabled:opacity-70 focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
                >
                  <span>
                    {paywallCheckoutState === "processing"
                      ? "Checking availability…"
                      : "Unlock My Complete Fix — $5"}
                  </span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                {paywallCheckoutState === "coming_soon" && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl bg-amber-950/60 border border-amber-500/30 p-3.5 text-left text-xs text-amber-200 space-y-1"
                  >
                    <p className="font-bold text-amber-100">
                      Online checkout is being finalized
                    </p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      Paddle checkout for the $5 Complete Fix is currently being finalized for launch. No payment was processed and{" "}
                      <strong className="font-semibold text-amber-100">{paywallEmail.trim()}</strong> has not been charged.
                    </p>
                  </div>
                )}

                <p className="text-[11px] text-[#94A3B8] text-center">
                  One-time payment · No subscription
                </p>

                <div className="pt-2 border-t border-[#263044] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#94A3B8]">
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] underline underline-offset-2 transition-colors">
                    Terms
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] underline underline-offset-2 transition-colors">
                    Privacy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-[#94A3B8] hover:text-[#3B82F6] font-medium underline underline-offset-2 transition-colors">
                    Refund Policy
                  </Link>
                  <span aria-hidden="true">·</span>
                  <Link href="/contact" target="_blank" rel="noopener noreferrer" className="hover:text-[#F1F5F9] underline underline-offset-2 transition-colors">
                    Support
                  </Link>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* =========================================================================
            PAID: 03. YOUR COMPLETE STRANGER VIEW (RENDERED IN INTERNAL TESTING PREVIEW & ON UNLOCK)
            Displays the prioritized sequence, suggested copy, and supporting evidence.
           ========================================================================= */}
        {showPaidSection && (
          <section
            id="complete-stranger-view-section"
            aria-labelledby="complete-stranger-view-heading"
            className="bg-[#121824] border border-[#263044] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24 space-y-7"
          >
            {/* Unified Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[#263044]">
              <div>
                <span className="text-[11px] font-extrabold tracking-wider text-[#3B82F6] uppercase block mb-1">
                  03. YOUR COMPLETE STRANGER VIEW
                </span>
                <h2
                  id="complete-stranger-view-heading"
                  className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
                >
                  03. Your Complete Stranger View
                </h2>
                <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-normal">
                  Prioritized implementation steps, messaging upgrades, and supporting evidence to maximize conversion clarity.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadBrief}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold transition cursor-pointer shadow-xs min-h-[40px] focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Download Your Fix</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyBrief}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171F2D] hover:bg-[#263044] border border-[#263044] text-[#F1F5F9] text-xs sm:text-sm font-semibold transition cursor-pointer min-h-[40px]"
                >
                  <Copy className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>Copy Brief</span>
                </button>
              </div>
            </div>

            {/* PART 1: PRIORITIZED IMPLEMENTATION SEQUENCE */}
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                    Prioritized Implementation Sequence
                  </h3>
                  <p className="text-xs text-[#94A3B8] mt-0.5">
                    Follow this step-by-step sequence to eliminate visitor hesitation on critical page areas.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                {priorityFixPlan.map((step, idx) => {
                  const isExpanded = expandedPlanId === step.id;
                  const changeWhat = step.isPrimaryFix
                    ? (data.recommendation.strongerDirection || data.recommendation.explanation)
                    : step.title;
                  const locationWhere = step.where || data.evidence.locationTag || "Homepage hero section";
                  const whyReason = step.why || data.recommendation.explanation;

                  return (
                    <div
                      key={step.id}
                      className="border border-[#263044] rounded-2xl overflow-hidden transition-all bg-[#171F2D]"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedPlanId(isExpanded ? null : step.id)}
                        aria-expanded={isExpanded}
                        className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#1a2333] transition cursor-pointer"
                      >
                        <div className="flex items-start sm:items-center gap-3 min-w-0">
                          <span className="px-2.5 py-1 rounded-lg bg-[#3B82F6]/20 text-[#3B82F6] border border-[#3B82F6]/30 text-xs font-black tracking-tight shrink-0 uppercase">
                            Priority {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-sm sm:text-base font-bold text-[#F1F5F9] truncate">
                              {step.title}
                            </h4>
                            <p className="text-xs text-[#94A3B8] truncate mt-0.5">
                              {whyReason}
                            </p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-[#121824] border border-[#263044] flex items-center justify-center shrink-0 text-[#94A3B8]">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-[#263044] bg-[#121824] space-y-3.5 text-xs sm:text-sm">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="bg-[#171F2D] p-3.5 rounded-xl border border-[#263044]">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-1">
                                Where to improve
                              </span>
                              <p className="font-semibold text-[#F1F5F9]">
                                {locationWhere}
                              </p>
                            </div>

                            <div className="bg-[#171F2D] p-3.5 rounded-xl border border-[#3B82F6]/30 md:col-span-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#3B82F6] block mb-1">
                                What to change
                              </span>
                              <p className="font-semibold text-[#F1F5F9] leading-relaxed">
                                {changeWhat}
                              </p>
                            </div>
                          </div>

                          <div className="bg-[#171F2D] p-3.5 rounded-xl border border-[#263044]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-1">
                              Why the change matters
                            </span>
                            <p className="text-[#94A3B8] leading-relaxed font-normal">
                              {whyReason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PART 2: IMPROVED MESSAGING & COPY UPGRADES */}
            <div className="pt-4 border-t border-[#263044] space-y-3.5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                  Improved Messaging &amp; Copy Replacements
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Direct before-and-after suggestions to clarify your core value proposition.
                </p>
              </div>

              {copyReadyImprovements.length === 0 ? (
                <div className="rounded-2xl bg-[#171F2D] border border-[#263044] p-5 text-center text-xs sm:text-sm text-[#94A3B8]">
                  <p className="font-semibold text-[#F1F5F9]">
                    No direct headline replacement required
                  </p>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Your existing phrasing is structurally sound. Focus on positioning and proof improvements from the sequence above.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {copyReadyImprovements.map((item) => {
                    const isCopied = copiedState === item.id;
                    return (
                      <div
                        key={item.id}
                        className="border border-[#263044] rounded-2xl p-4 sm:p-5 bg-[#171F2D] space-y-3 shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] text-[11px] font-bold uppercase tracking-wider border border-[#3B82F6]/30">
                            {item.intendedLocation}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                item.suggestedReplacement,
                                item.id,
                                "Copied suggested copy to clipboard!"
                              )
                            }
                            aria-label={`Copy suggestion for ${item.intendedLocation}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#121824] hover:bg-[#263044] border border-[#263044] text-[#F1F5F9] text-xs font-semibold transition cursor-pointer min-h-[36px]"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                                <span>Copy Suggestion</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Desktop 2-Column Side-by-Side / Mobile Stack */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="bg-[#121824] border border-[#263044] rounded-xl p-3.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] block mb-1">
                              Current Wording
                            </span>
                            <p className="text-xs sm:text-sm text-[#94A3B8] italic font-medium break-words">
                              {item.currentCopy ? `“${item.currentCopy}”` : "Current wording not explicitly quoted on page"}
                            </p>
                          </div>

                          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block mb-1">
                              Suggested Improvement
                            </span>
                            <p className="text-xs sm:text-sm text-[#F1F5F9] font-semibold break-words">
                              “{item.suggestedReplacement}”
                            </p>
                          </div>
                        </div>

                        {item.whyThisMayHelp && (
                          <p className="text-xs text-[#94A3B8] font-medium pt-0.5">
                            <strong className="text-[#F1F5F9]">Why this helps:</strong> {item.whyThisMayHelp}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PART 3: SUPPORTING EVIDENCE & VISITOR OBSERVATIONS */}
            <div className="pt-4 border-t border-[#263044] space-y-3.5">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                  Supporting Evidence &amp; Observations
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Extracted excerpts, verified findings, signal diagnostics, and first-time visitor comprehension.
                </p>
              </div>

              {/* Accordion Group */}
              <div className="space-y-3">
                {/* Accordion 1: First-Time Visitor Understanding */}
                <div className="border border-[#263044] rounded-2xl overflow-hidden bg-[#171F2D]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedInsightAccordion(
                        expandedInsightAccordion === "understanding" ? null : "understanding"
                      )
                    }
                    aria-expanded={expandedInsightAccordion === "understanding"}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#1a2333] transition cursor-pointer"
                  >
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                        First-Time Visitor Understanding
                      </h4>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        How visitors answered the 5 core comprehension questions
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#121824] border border-[#263044] flex items-center justify-center shrink-0 text-[#94A3B8]">
                      {expandedInsightAccordion === "understanding" ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {expandedInsightAccordion === "understanding" && (
                    <div className="p-4 sm:p-5 pt-2 border-t border-[#263044] bg-[#121824] space-y-4 text-xs sm:text-sm">
                      <div className="divide-y divide-[#263044] bg-[#171F2D] border border-[#263044] rounded-xl overflow-hidden">
                        {visitorUnderstandingAndEvidence.firstSecondsRows.map((q) => {
                          const isClear = q.type === "clear";
                          const isPartly = q.type === "partly";
                          return (
                            <div key={q.question} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">
                                  {q.dimensionLabel}
                                </span>
                                <p className="font-semibold text-[#F1F5F9] mt-0.5">
                                  {q.question}
                                </p>
                                {q.verifiedSnippet && (
                                  <p className="text-xs text-[#94A3B8] italic mt-0.5">
                                    Observed: “{q.verifiedSnippet}”
                                  </p>
                                )}
                              </div>
                              <span
                                className={`self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                                  isClear
                                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                                    : isPartly
                                    ? "bg-amber-950/60 text-amber-400 border border-amber-500/30"
                                    : "bg-rose-950/60 text-rose-400 border border-rose-500/30"
                                }`}
                              >
                                {q.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {visitorUnderstandingAndEvidence.cleanVisitorThought && (
                        <div className="bg-[#171F2D] p-4 rounded-xl border border-[#263044]">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">
                            Visitor Initial Thought
                          </span>
                          <p className="italic text-[#F1F5F9] leading-relaxed font-medium">
                            &ldquo;{visitorUnderstandingAndEvidence.cleanVisitorThought}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Accordion 2: Homepage Evidence */}
                <div className="border border-[#263044] rounded-2xl overflow-hidden bg-[#171F2D]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedInsightAccordion(
                        expandedInsightAccordion === "evidence" ? null : "evidence"
                      )
                    }
                    aria-expanded={expandedInsightAccordion === "evidence"}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#1a2333] transition cursor-pointer"
                  >
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                        Homepage Evidence
                      </h4>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Extracted hero excerpt, clear observations, and detected gaps
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#121824] border border-[#263044] flex items-center justify-center shrink-0 text-[#94A3B8]">
                      {expandedInsightAccordion === "evidence" ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {expandedInsightAccordion === "evidence" && (
                    <div className="p-4 sm:p-5 pt-2 border-t border-[#263044] bg-[#121824] space-y-4 text-xs sm:text-sm">
                      {visitorUnderstandingAndEvidence.hasVerifiedExcerpt && (
                        <div className="bg-[#171F2D] p-4 rounded-xl border border-[#263044]">
                          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">
                            Scanned Hero Excerpt
                          </span>
                          <p className="text-[#F1F5F9] font-mono text-xs leading-relaxed bg-[#090D15] p-2.5 rounded-lg border border-[#263044]">
                            {visitorUnderstandingAndEvidence.verifiedExcerptText}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div className="bg-[#171F2D] p-4 rounded-xl border border-emerald-500/20 space-y-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                            Verified Clear Elements
                          </span>
                          <ul className="space-y-1.5">
                            {visitorUnderstandingAndEvidence.verifiedClearFindings.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[#F1F5F9]">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="bg-[#171F2D] p-4 rounded-xl border border-amber-500/20 space-y-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 block">
                            Missing or Incomplete Elements
                          </span>
                          <ul className="space-y-1.5">
                            {visitorUnderstandingAndEvidence.verifiedMissingFindings.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-[#F1F5F9]">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 3: Five Signal Details */}
                <div className="border border-[#263044] rounded-2xl overflow-hidden bg-[#171F2D]">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedInsightAccordion(
                        expandedInsightAccordion === "signals" ? null : "signals"
                      )
                    }
                    aria-expanded={expandedInsightAccordion === "signals"}
                    className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#1a2333] transition cursor-pointer"
                  >
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                        Five Signal Diagnostic Details
                      </h4>
                      <p className="text-xs text-[#94A3B8] mt-0.5">
                        Diagnostic scores and evaluation criteria for each dimension
                      </p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#121824] border border-[#263044] flex items-center justify-center shrink-0 text-[#94A3B8]">
                      {expandedInsightAccordion === "signals" ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>
                  </button>

                  {expandedInsightAccordion === "signals" && (
                    <div className="p-4 sm:p-5 pt-2 border-t border-[#263044] bg-[#121824] space-y-3 text-xs sm:text-sm">
                      <div className="space-y-2.5">
                        {phase6DetailedData.detailedSignals.map((sig) => (
                          <div
                            key={sig.id}
                            className="bg-[#171F2D] p-3.5 rounded-xl border border-[#263044] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-[#F1F5F9] text-sm">
                                  {sig.title}
                                </h5>
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    sig.badgeType === "clear"
                                      ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                                      : sig.badgeType === "amber"
                                      ? "bg-amber-950/60 text-amber-400 border border-amber-500/30"
                                      : "bg-rose-950/60 text-rose-400 border border-rose-500/30"
                                  }`}
                                >
                                  {sig.badgeText}
                                </span>
                              </div>
                              <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                                {sig.description}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <span className="text-lg font-black text-[#F1F5F9] tabular-nums">
                                {sig.score}
                              </span>
                              <span className="text-xs text-[#94A3B8]">/100</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 4: Supporting Pages (Rendered ONLY if supportingPagesInsights exists) */}
                {supportingPagesInsights && (
                  <div className="border border-[#263044] rounded-2xl overflow-hidden bg-[#171F2D]">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInsightAccordion(
                          expandedInsightAccordion === "supporting" ? null : "supporting"
                        )
                      }
                      aria-expanded={expandedInsightAccordion === "supporting"}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#1a2333] transition cursor-pointer"
                    >
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                          Supporting Pages Context
                        </h4>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Insights from {supportingPagesInsights.pagesReviewed.length} linked pages
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#121824] border border-[#263044] flex items-center justify-center shrink-0 text-[#94A3B8]">
                        {expandedInsightAccordion === "supporting" ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {expandedInsightAccordion === "supporting" && (
                      <div className="p-4 sm:p-5 pt-2 border-t border-[#263044] bg-[#121824] space-y-3.5 text-xs sm:text-sm">
                        <div className="flex flex-wrap gap-2">
                          {supportingPagesInsights.pagesReviewed.map((p) => (
                            <span
                              key={p.urlKey}
                              className="px-2.5 py-1 rounded-lg bg-[#171F2D] border border-[#263044] text-xs text-[#F1F5F9] font-medium"
                            >
                              <span className="text-[#3B82F6] font-bold mr-1.5">[{p.categoryLabel}]</span>
                              {p.displayUrl}
                            </span>
                          ))}
                        </div>

                        {supportingPagesInsights.messageConsistency && (
                          <div className="bg-[#171F2D] p-3.5 rounded-xl border border-[#263044]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-0.5">
                              Consistency: {supportingPagesInsights.messageConsistency.statusLabel}
                            </span>
                            <p className="text-[#F1F5F9] leading-relaxed font-normal">
                              {supportingPagesInsights.messageConsistency.assessment}
                            </p>
                          </div>
                        )}

                        {supportingPagesInsights.trustContext && (
                          <div className="bg-[#171F2D] p-3.5 rounded-xl border border-[#263044]">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] block mb-0.5">
                              Trust &amp; Claims
                            </span>
                            <p className="text-[#F1F5F9] leading-relaxed font-normal">
                              {supportingPagesInsights.trustContext.assessment}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Accordion 5: Additional Communication Friction (Rendered ONLY if totalRisksCount > 0) */}
                {phase6DetailedData.totalRisksCount > 0 && (
                  <div className="border border-[#263044] rounded-2xl overflow-hidden bg-[#171F2D]">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedInsightAccordion(
                          expandedInsightAccordion === "risks" ? null : "risks"
                        )
                      }
                      aria-expanded={expandedInsightAccordion === "risks"}
                      className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-3 hover:bg-[#1a2333] transition cursor-pointer"
                    >
                      <div>
                        <h4 className="text-sm sm:text-base font-bold text-[#F1F5F9]">
                          Additional Communication Friction
                        </h4>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          {phase6DetailedData.totalRisksCount} potential friction points identified
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-[#121824] border border-[#263044] flex items-center justify-center shrink-0 text-[#94A3B8]">
                        {expandedInsightAccordion === "risks" ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                    </button>

                    {expandedInsightAccordion === "risks" && (
                      <div className="p-4 sm:p-5 pt-2 border-t border-[#263044] bg-[#121824] space-y-3 text-xs sm:text-sm">
                        {phase6DetailedData.primaryRisk && (
                          <div className="bg-[#171F2D] p-3.5 rounded-xl border border-[#263044] space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-950/60 text-rose-400 border border-rose-500/30">
                                {phase6DetailedData.primaryRisk.severity} priority
                              </span>
                              <h5 className="font-bold text-[#F1F5F9]">
                                {phase6DetailedData.primaryRisk.title}
                              </h5>
                            </div>
                            <p className="text-[#94A3B8] leading-relaxed font-normal">
                              {phase6DetailedData.primaryRisk.description}
                            </p>
                          </div>
                        )}

                        {phase6DetailedData.secondaryRisks.map((risk, idx) => (
                          <div
                            key={idx}
                            className="bg-[#171F2D] p-3.5 rounded-xl border border-[#263044] space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-950/60 text-amber-400 border border-amber-500/30">
                                {risk.severity} priority
                              </span>
                              <h5 className="font-bold text-[#F1F5F9]">
                                {risk.title}
                              </h5>
                            </div>
                            <p className="text-[#94A3B8] leading-relaxed font-normal">
                              {risk.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* PART 4: COMPACT HANDOFF SUMMARY CARD */}
            <div className="pt-4 border-t border-[#263044]">
              <div className="border border-[#263044] rounded-2xl p-4 sm:p-5 bg-[#171F2D] space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#263044] text-xs">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#3B82F6]" />
                    <strong className="text-[#F1F5F9] font-bold">{data.domain}</strong>
                  </div>
                  <span className="font-semibold text-[#94A3B8]">
                    Diagnosis Score: <strong className="text-[#F1F5F9]">{data.score}/100</strong> ({data.scoreStatus})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] block">
                      Primary Diagnosis
                    </span>
                    <p className="font-semibold text-[#F1F5F9] leading-snug">
                      {data.verdict}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#94A3B8] block">
                      Recommended Sequence
                    </span>
                    <ul className="space-y-0.5 text-[#94A3B8] text-xs">
                      {priorityFixPlan.slice(0, 3).map((s, idx) => (
                        <li key={s.id} className="flex items-start gap-1.5 truncate">
                          <span className="font-bold text-[#3B82F6]">{idx + 1}.</span>
                          <span className="truncate text-[#F1F5F9]">{s.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* RECHECK WEBSITE SECTION (Clean & Simple) */}
        <section
          id="recheck-website-section"
          aria-labelledby="recheck-website-heading"
          className="bg-[#121824] border border-[#263044] rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 shadow-xs scroll-mt-24 print:hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#171F2D] text-[#3B82F6] border border-[#263044]">
                  <RefreshCw className="w-3 h-3 text-[#3B82F6] shrink-0" />
                  <span>CHECK WEBSITE AGAIN</span>
                </span>
                <span className="text-xs text-[#94A3B8]">· {data.domain}</span>
              </div>
              <h2
                id="recheck-website-heading"
                className="text-lg sm:text-xl md:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
              >
                Verify Your Improvements
              </h2>
              <p className="text-xs sm:text-sm text-[#94A3B8] mt-1 font-normal">
                Updated your homepage copy or design? Run another analysis to verify visitor clarity.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCheckAgain}
              disabled={checkAgainState === "checking"}
              aria-label={`Check ${data.domain} again`}
              className="rounded-full bg-[#3B82F6] hover:bg-blue-600 active:scale-[0.98] text-white text-xs sm:text-sm font-bold px-6 py-3 transition-all inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer min-h-[44px] shrink-0 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
            >
              <RefreshCw
                className={`w-4 h-4 shrink-0 ${
                  checkAgainState === "checking" ? "animate-spin" : ""
                }`}
              />
              <span>{checkAgainState === "checking" ? "Scanning website…" : "Check Website Again"}</span>
            </button>
          </div>
        </section>

        {/* RESULTS SCREEN LEGAL & SUPPORT FOOTER */}
        <footer className="pt-4 pb-6 border-t border-[#263044] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#94A3B8] print:hidden">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <span className="font-bold text-[#F1F5F9]">{LEGAL_CONFIG.brandName}</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} {LEGAL_CONFIG.brandName}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {LEGAL_CONFIG.links.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#F1F5F9] transition-colors underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </footer>
      </main>

      {/* SCORE METHODOLOGY MODAL */}
      <AnimatePresence>
        {isMethodologyModalOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-methodology-title"
            aria-describedby="score-methodology-desc"
            className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm"
          >
            {/* Backdrop click to dismiss */}
            <div
              className="absolute inset-0 cursor-pointer"
              onClick={() => setIsMethodologyModalOpen(false)}
              aria-hidden="true"
            />

            {/* Modal Container: Fullscreen on mobile, centered max-w-[560px] on desktop */}
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-[560px] bg-[#121824] border border-[#263044] sm:rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 sm:p-6 pb-4 border-b border-[#263044] flex items-start justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#3B82F6] block mb-1">
                    Score Methodology
                  </span>
                  <h2
                    id="score-methodology-title"
                    className="text-xl sm:text-2xl font-extrabold text-[#F1F5F9] tracking-tight"
                  >
                    How Your Score Works
                  </h2>
                  <p
                    id="score-methodology-desc"
                    className="text-xs sm:text-[13px] text-[#94A3B8] mt-1 leading-relaxed"
                  >
                    Your score measures how clearly your website communicates its purpose, audience, value, credibility, and next steps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMethodologyModalOpen(false)}
                  aria-label="Close score methodology modal"
                  className="w-8 h-8 rounded-lg text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#171F2D] flex items-center justify-center transition cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                {/* Real Five Weights and Current Report Scores */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#94A3B8] block">
                    The Five Clarity Weights
                  </span>
                  <div className="space-y-2">
                    {[
                      {
                        id: "first-impression",
                        name: "First Impression",
                        weight: "25%",
                        desc: "How clearly the website communicates its core purpose.",
                      },
                      {
                        id: "audience",
                        name: "Audience",
                        weight: "20%",
                        desc: "Whether visitors can quickly tell who it is built for.",
                      },
                      {
                        id: "value",
                        name: "Value",
                        weight: "25%",
                        desc: "How specifically the outcome or benefit is stated.",
                      },
                      {
                        id: "trust",
                        name: "Trust",
                        weight: "15%",
                        desc: "Identifiable credibility and proof elements.",
                      },
                      {
                        id: "action",
                        name: "Action",
                        weight: "15%",
                        desc: "How clearly the website guides visitors on next steps.",
                      },
                    ].map((item) => {
                      const matchedSignal = phase6DetailedData.detailedSignals.find((s) => s.id === item.id);
                      const scoreVal = matchedSignal ? matchedSignal.score : data.score;
                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl bg-[#171F2D] border border-[#263044] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#F1F5F9]">{item.name}</span>
                              <span className="text-[10px] font-bold text-[#3B82F6] bg-[#3B82F6]/20 px-1.5 py-0.5 rounded border border-[#3B82F6]/30">
                                {item.weight}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{item.desc}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-black text-[#F1F5F9] tabular-nums">
                              {scoreVal}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] font-medium">/100</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Weighted Calculation Explanation */}
                <div className="p-3.5 rounded-xl bg-[#171F2D] border border-[#3B82F6]/30 text-xs text-[#94A3B8] space-y-1">
                  <strong className="font-semibold text-[#F1F5F9] block">Weighted Calculation:</strong>
                  <p className="leading-relaxed text-[11px] text-[#94A3B8]">
                    The overall score combines five communication signals using different weights: (First Impression &times; 0.25) + (Audience &times; 0.20) + (Value &times; 0.25) + (Trust &times; 0.15) + (Action &times; 0.15)
                  </p>
                </div>

                {/* Scope & Methodology Note */}
                <div className="p-3.5 rounded-xl bg-[#171F2D] border border-[#263044] text-[11px] text-[#94A3B8] leading-relaxed">
                  &ldquo;Scores assess homepage messaging. Supporting pages can add context when available, without changing the overall score.&rdquo;
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:p-5 border-t border-[#263044] bg-[#121824] flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsMethodologyModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#171F2D] hover:bg-[#263044] border border-[#263044] text-[#F1F5F9] text-xs sm:text-sm font-semibold transition cursor-pointer focus-visible:ring-2 focus-visible:ring-[#3B82F6] focus-visible:outline-none"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
