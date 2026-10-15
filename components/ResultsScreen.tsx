"use client";
import React, { useState, useMemo } from "react";
import { Link2, Clock, Share2, Download, AlertCircle, Check, Zap, Info, X, Lock, Mail, ArrowRight, Sparkles, Shield, Users, Eye, ChevronDown } from "lucide-react";
import Link from "next/link";
import { adaptReport, SIGNAL_ID_TO_KEY } from "@/lib/report-adapter";

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
  supportingContext?: any;
  isFreeTierOnly?: boolean;
  isPartialAccess?: boolean;
  isAccessError?: boolean;
  checkedAt?: string;
  lockedPreviewCounts?: {
    actionSteps: number;
    secondaryFixes: number;
    copyRewrites: number;
    totalRisks: number;
  };
}

export default function ResultsScreen({
  rawUrl,
  analysisData: data,
  isUnlocked = false,
  onBackToLanding,
  onRunNewCheck,
  onRecheck,
  onOpenFaq,
  onOpenPricing,
}: any) {
  const [activeExplorerSignalId, setActiveExplorerSignalId] = useState("first-impression");
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isReportUnlocked = Boolean(isUnlocked);

  // Canonical report normalized from authoritative analysis data
  const report = useMemo(() => adaptReport(data), [data]);

  // Semantic color mapping matching status semantics:
  // Clear / Understandable: Green
  // Partly clear / Needs work / Needs improvement: Amber
  // Unclear / Poor: Rose
  const getStatusTheme = (status: string, badgeType?: string) => {
    const s = (status || "").toLowerCase().trim();
    if (s === "clear" || s === "understandable" || s === "excellent" || s === "good") {
      return {
        text: "text-emerald-400",
        bg: "bg-emerald-500",
        dot: "bg-emerald-400",
      };
    }
    if (s === "partly clear" || s === "needs work" || s === "needs improvement" || s === "partly") {
      return {
        text: "text-amber-400",
        bg: "bg-amber-500",
        dot: "bg-amber-400",
      };
    }
    if (s === "unclear" || s === "poor" || s === "bad") {
      return {
        text: "text-rose-400",
        bg: "bg-rose-500",
        dot: "bg-rose-400",
      };
    }
    if (badgeType === "clear") return { text: "text-emerald-400", bg: "bg-emerald-500", dot: "bg-emerald-400" };
    if (badgeType === "amber") return { text: "text-amber-400", bg: "bg-amber-500", dot: "bg-amber-400" };
    if (badgeType === "coral") return { text: "text-rose-400", bg: "bg-rose-500", dot: "bg-rose-400" };
    return { text: "text-[#94A3B8]", bg: "bg-[#263044]", dot: "bg-[#94A3B8]" };
  };

  const formatStatusText = (str: string): string => {
    if (!str) return "";
    const lower = str.toLowerCase().trim();
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  };

  const overallTheme = getStatusTheme(report.overallStatus);

  const explorerTabs = [
    { id: "first-impression", label: "First Impression" },
    { id: "audience", label: "Audience" },
    { id: "value", label: "Value" },
    { id: "trust", label: "Trust" },
    { id: "action", label: "Action" },
  ];

  const activeSignalKey = SIGNAL_ID_TO_KEY[activeExplorerSignalId] || "firstImpression";
  const activeSignal = report.signals[activeSignalKey];

  if (!data) return null;

  return (
    <div id="results-content" className="min-h-screen bg-[#090D15] text-[#F1F5F9] font-sans antialiased flex flex-col">
      {/* SCORE CALCULATION MODAL */}
      {isScoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-[#121824] border border-[#263044] rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">How scoring works</h3>
            <p className="text-[#94A3B8] text-sm mb-6">Your overall clarity score is a weighted average of your five signal scores: First Impression (25%), Audience (20%), Value (25%), Trust (15%), and Action (15%).</p>
            <button onClick={() => setIsScoreModalOpen(false)} className="w-full bg-[#171F2D] hover:bg-[#263044] text-white font-bold py-3 rounded-lg text-sm cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="w-full bg-[#090D15]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1000px] mx-auto px-4 h-16 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2 cursor-pointer bg-transparent border-0 p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            aria-label="Return to StrangerLens home"
          >
            <span className="font-bold text-xl tracking-tight text-white hover:text-slate-200 transition-colors">
              StrangerLens
            </span>
          </button>
          <button
            type="button"
            onClick={onRunNewCheck || onBackToLanding}
            className="rounded-full bg-[#171F2D] hover:bg-[#263044] text-white font-semibold px-4 py-2 transition text-sm cursor-pointer"
          >
            New Check
          </button>
        </div>
        <div className="max-w-[1000px] mx-auto px-4 py-2 flex items-center justify-between text-sm text-[#94A3B8]">
          <span className="font-medium text-[#F1F5F9]">{report.domain}</span>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 py-6 sm:py-10 space-y-8 sm:space-y-12">
        {/* OVERALL CLARITY SCORE */}
        <section className="bg-[#121824] border border-[#263044] rounded-2xl p-5 sm:p-6 shadow-xs">
          <h2 className="text-xs sm:text-sm font-semibold text-[#94A3B8] uppercase tracking-wider mb-3">
            Website Clarity Score
          </h2>
          <div className="space-y-1.5">
            <div className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
              {report.overallScoreDisplay}
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${overallTheme.dot}`} aria-hidden="true" />
              <span className={`text-sm sm:text-base font-medium ${overallTheme.text}`}>
                {formatStatusText(report.overallStatus)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3.5 border-t border-[#263044]/70">
            <button
              type="button"
              onClick={() => setIsScoreModalOpen(true)}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-blue-400 hover:text-blue-300 font-medium transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>How scoring works</span>
            </button>
          </div>
        </section>

        {/* 1. FREE: FIVE CLARITY SIGNALS */}
        <section>
          <h2 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-[#F1F5F9]">Your Clarity Signals</h2>
          <div className="bg-[#121824] border border-[#263044] rounded-xl overflow-hidden divide-y divide-[#263044]/70">
            {report.signalsList.map((signal) => {
              const theme = getStatusTheme(signal.status, signal.badgeType);
              return (
                <div key={signal.id} className="p-4 sm:p-4.5 transition-colors">
                  {/* Mobile Layout (< sm) */}
                  <div className="sm:hidden space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-[#F1F5F9]">{signal.title}</span>
                      <span className="font-semibold text-sm text-white">{signal.scoreDisplay}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} aria-hidden="true" />
                      <span className={`text-xs font-normal ${theme.text}`}>
                        {formatStatusText(signal.status)}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#171F2D] border border-[#263044]/40 rounded-full overflow-hidden mt-1.5">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${theme.bg}`}
                        style={{ width: `${Math.min(100, Math.max(0, signal.score ?? 0))}%` }}
                      />
                    </div>
                  </div>

                  {/* Desktop Layout (>= sm) */}
                  <div className="hidden sm:flex items-center justify-between">
                    <span className="font-medium text-[#F1F5F9]">{signal.title}</span>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-semibold text-white text-sm">{signal.scoreDisplay}</div>
                        <div className={`text-xs font-medium flex items-center justify-end gap-1.5 ${theme.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`} aria-hidden="true" />
                          <span>{formatStatusText(signal.status)}</span>
                        </div>
                      </div>
                      <div className="w-20 h-1.5 bg-[#171F2D] border border-[#263044]/40 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${theme.bg}`}
                          style={{ width: `${Math.min(100, Math.max(0, signal.score ?? 0))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PAYWALL */}
        {!isReportUnlocked && (
          <section className="bg-[#121824] border border-[#263044] rounded-2xl p-6 text-center shadow-lg">
            <h2 className="text-xl font-bold mb-2 text-white">Unlock Full Analysis</h2>
            <p className="text-[#94A3B8] text-sm mb-6 max-w-sm mx-auto">Get detailed signal diagnostics, actionable improvement steps, and visitor comprehension analysis.</p>
            <div className="space-y-2 mb-6 text-sm text-[#F1F5F9] font-medium">
              <div className="flex items-center justify-center gap-2">✓ Understand every score</div>
              <div className="flex items-center justify-center gap-2">✓ See what to improve</div>
            </div>
            <div className="text-2xl font-bold mb-6 text-white">$5 <span className="text-sm text-[#94A3B8] font-normal">· One-time payment</span></div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg text-sm transition cursor-pointer">Unlock Full Analysis — $5</button>
            <p className="text-xs text-[#94A3B8] mt-4">One-time payment · No subscription · Terms · Privacy · Refund Policy · Support</p>
          </section>
        )}

        {/* PREMIUM: INTERACTIVE ANALYSIS */}
        <section>
          <h2 className="text-xl font-bold mb-6 text-white">Signal Diagnostics</h2>
          
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {explorerTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveExplorerSignalId(tab.id)}
                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition cursor-pointer ${activeExplorerSignalId === tab.id ? "bg-blue-600 text-white" : "bg-[#121824] border border-[#263044] text-[#94A3B8]"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="bg-[#121824] border border-[#263044] rounded-xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">{activeSignal.title}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${getStatusTheme(activeSignal.status, activeSignal.badgeType).dot}`} aria-hidden="true" />
                  <span className={`text-xs font-medium ${getStatusTheme(activeSignal.status, activeSignal.badgeType).text}`}>
                    {formatStatusText(activeSignal.status)}
                  </span>
                </div>
              </div>
              <div className="text-sm font-semibold text-white">{activeSignal.scoreDisplay}</div>
            </div>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-[10px] font-bold text-blue-400 mb-2 tracking-widest uppercase">Why This Score</h4>
                <p className="text-[#94A3B8] text-sm">
                  {activeSignal.explanation || "Diagnostic analysis not available for this signal."}
                </p>
              </div>
              <div className="border-t border-[#263044]"></div>
              <div>
                <h4 className="text-[10px] font-bold text-emerald-400 mb-2 tracking-widest uppercase">What&apos;s Working</h4>
                {activeSignal.positiveFindings.length > 0 ? (
                  <ul className="text-[#94A3B8] text-sm space-y-1.5">
                    {activeSignal.positiveFindings.map((finding, i) => (
                      <li key={i}>✓ {finding}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#94A3B8] text-sm">No clear positive signals detected in the initial content.</p>
                )}
              </div>
              <div className="border-t border-[#263044]"></div>
              <div>
                <h4 className="text-[10px] font-bold text-amber-400 mb-2 tracking-widest uppercase">What&apos;s Unclear</h4>
                {activeSignal.concerns.length > 0 ? (
                  <ul className="text-[#94A3B8] text-sm space-y-1.5">
                    {activeSignal.concerns.map((concern, i) => (
                      <li key={i}>! {concern}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#94A3B8] text-sm">No significant ambiguities identified for this signal.</p>
                )}
              </div>
              <div className="border-t border-[#263044]"></div>
              <div>
                <h4 className="text-[10px] font-bold text-rose-400 mb-2 tracking-widest uppercase">How to Improve</h4>
                {activeSignal.recommendations.length > 0 ? (
                  <ul className="text-[#94A3B8] text-sm space-y-1.5">
                    {activeSignal.recommendations.map((rec, i) => (
                      <li key={i}>→ {rec}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[#94A3B8] text-sm">Maintain current messaging clarity in this area.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* FIRST 5 SECONDS */}
        <section>
          <h2 className="text-xl font-bold mb-2 text-white">First 5 Seconds</h2>
          <p className="text-[#94A3B8] text-sm mb-6">What a first-time visitor grasps in the first 5 seconds.</p>
          <div className="grid gap-6">
            <div className="bg-[#121824] border border-[#263044] rounded-xl p-5">
              <h3 className="font-bold text-emerald-400 text-xs mb-3 tracking-widest uppercase">WHAT VISITORS UNDERSTAND</h3>
              {report.firstSeconds.understandItems.length > 0 ? (
                <div className="space-y-3">
                  {report.firstSeconds.understandItems.map((item, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-semibold text-white">{item.title}</div>
                      <div className="text-[#94A3B8] mt-0.5">{item.explanation}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">No elements detected as immediately clear on initial load.</p>
              )}
            </div>
            <div className="bg-[#121824] border border-[#263044] rounded-xl p-5">
              <h3 className="font-bold text-amber-400 text-xs mb-3 tracking-widest uppercase">WHAT VISITORS MISS</h3>
              {report.firstSeconds.missItems.length > 0 ? (
                <div className="space-y-3">
                  {report.firstSeconds.missItems.map((item, i) => (
                    <div key={i} className="text-sm">
                      <div className="font-semibold text-white">{item.title}</div>
                      <div className="text-[#94A3B8] mt-0.5">{item.explanation}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">No immediate comprehension blockers identified.</p>
              )}
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-[#263044]">
          <button 
            onClick={() => {
              import('html2canvas').then(html2canvas => {
                const target = document.getElementById('results-content');
                if (!target) return;
                html2canvas.default(target, { scale: 2, useCORS: true }).then(canvas => {
                  const link = document.createElement('a');
                  link.download = `strangerlens-${report.domain}.png`;
                  link.href = canvas.toDataURL('image/png');
                  link.click();
                });
              });
            }}
            className="flex-1 bg-[#171F2D] hover:bg-[#263044] text-white font-semibold py-3 rounded-lg text-sm transition"
          >
            Export Summary
          </button>
          <button 
            onClick={() => {
              Promise.all([
                import('html2canvas'),
                import('jspdf')
              ]).then(([html2canvas, jspdf]) => {
                const target = document.getElementById('results-content');
                if (!target) return;
                html2canvas.default(target, { scale: 2, useCORS: true }).then(canvas => {
                  const imgData = canvas.toDataURL('image/png');
                  const pdf = new jspdf.jsPDF('p', 'mm', 'a4');
                  const pdfWidth = pdf.internal.pageSize.getWidth();
                  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                  const pageHeight = pdf.internal.pageSize.getHeight();
                  let heightLeft = pdfHeight;
                  let position = 0;

                  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                  heightLeft -= pageHeight;

                  while (heightLeft > 0) {
                    position = heightLeft - pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                    heightLeft -= pageHeight;
                  }

                  pdf.save(`strangerlens-${report.domain}.pdf`);
                });
              });
            }}
            className="flex-1 bg-[#171F2D] hover:bg-[#263044] text-white font-semibold py-3 rounded-lg text-sm transition"
          >
            Download PDF
          </button>
        </div>
      </main>
    </div>
  );
}

export function buildReportSummaryForExport(data: any, isUnlocked: boolean): string {
  if (!isUnlocked) {
    return `STRANGERLENS FREE PREVIEW SUMMARY
URL: ${data?.url || data?.domain || ""}
FIVE SIGNAL OVERVIEW:
${data?.signals?.map((s: any) => `- ${s.name}: ${s.score}/100`).join("\n") || ""}
BIGGEST ISSUE + EVIDENCE:
${data?.biggestIssue?.title || ""} - ${data?.biggestIssue?.description || ""}
YOUR #1 PRIORITY FIX:
${data?.priorityFix?.action || ""}`;
  }
  return `STRANGERLENS FULL FIRST-IMPRESSION REPORT
URL: ${data?.url || data?.domain || ""}
FIRST-TIME VISITOR IMPRESSION:
${data?.visitorThought || ""}
FIVE DETAILED SIGNAL BREAKDOWN:
${data?.signals?.map((s: any) => `- ${s.name}: ${s.score}/100 (${s.explanation || ""})`).join("\n") || ""}
COMMUNICATION RISKS:
${data?.risks?.map((r: any) => `- ${r}`).join("\n") || ""}`;
}
