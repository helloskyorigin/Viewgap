"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { Check, AlertCircle, RotateCcw, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

interface ScanScreenProps {
  rawUrl: string;
  onBackToLanding: () => void;
  onOpenFaq?: () => void;
  onOpenPricing?: () => void;
  onGoToResults?: () => void;
  onRetry?: () => void;
  isBackendReady?: boolean;
  backendError?: string | null;
}

const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Ensures error messages shown to the user remain concise, understandable,
 * and never expose raw stack traces, API keys, or internal server diagnostics.
 */
function formatSafeErrorMessage(rawError: string | null | undefined): string {
  if (!rawError || typeof rawError !== "string") {
    return "We couldn’t complete the analysis for this website. Please verify the URL and try again.";
  }

  const trimmed = rawError.trim();
  if (!trimmed) {
    return "We couldn’t complete the analysis for this website. Please verify the URL and try again.";
  }

  // Guard against accidental stack traces, raw JSON dumps, or internal key references
  const hasInternalLeak =
    trimmed.includes("\n    at ") ||
    trimmed.includes("SyntaxError") ||
    trimmed.includes("TypeError") ||
    trimmed.includes("API_KEY") ||
    trimmed.includes("Bearer ") ||
    trimmed.startsWith("{") ||
    trimmed.length > 220;

  if (hasInternalLeak) {
    return "Analysis is temporarily unavailable or the website could not be read. Please try again in a moment.";
  }

  return trimmed;
}

export default function ScanScreen({
  rawUrl,
  onBackToLanding,
  onGoToResults,
  onRetry,
  isBackendReady = false,
  backendError = null,
}: ScanScreenProps) {
  const shouldReduceMotion = useReducedMotion();
  const hasTransitionedRef = useRef(false);

  // Extract clean hostname dynamically from the actual analysis input
  const cleanDomain = useMemo(() => {
    const cleaned = rawUrl.trim();
    if (!cleaned) return "";
    try {
      const withProtocol = /^https?:\/\//i.test(cleaned)
        ? cleaned
        : `https://${cleaned}`;
      const parsed = new URL(withProtocol);
      return parsed.hostname.replace(/^www\./i, "") || cleaned;
    } catch {
      return (
        cleaned
          .replace(/^https?:\/\//i, "")
          .replace(/^www\./i, "")
          .split("/")[0]
          .split("?")[0] || cleaned
      );
    }
  }, [rawUrl]);

  // Reset transition guard when a new URL scan starts
  useEffect(() => {
    hasTransitionedRef.current = false;
  }, [rawUrl, isBackendReady, backendError]);

  // Seamless transition to existing ResultsScreen as soon as real backend analysis completes
  useEffect(() => {
    if (
      isBackendReady &&
      !backendError &&
      onGoToResults &&
      !hasTransitionedRef.current
    ) {
      const delayMs = shouldReduceMotion ? 0 : 220;
      const timer = setTimeout(() => {
        if (!hasTransitionedRef.current) {
          hasTransitionedRef.current = true;
          onGoToResults();
        }
      }, delayMs);

      return () => clearTimeout(timer);
    }
  }, [isBackendReady, backendError, onGoToResults, shouldReduceMotion]);

  const hasError = Boolean(backendError);
  const safeErrorMessage = useMemo(
    () => (hasError ? formatSafeErrorMessage(backendError) : null),
    [hasError, backendError]
  );

  const handleRetryAction = () => {
    if (onRetry) {
      onRetry();
    } else {
      onBackToLanding();
    }
  };

  return (
    <div className="min-h-dvh bg-[#FAFAFA] text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col justify-between overflow-x-hidden">
      {/* 1. TOP BAR — Brand wordmark at top-left & small ANALYZING status indicator at top-right on desktop */}
      <header className="w-full border-b border-slate-200/70 bg-white/90 backdrop-blur-md shrink-0">
        <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[64px] sm:h-[72px] flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToLanding}
            className="flex items-center gap-2 sm:gap-2.5 group cursor-pointer bg-transparent border-0 p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded-lg"
            aria-label="Return to StrangerLens home"
          >
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs transition-transform duration-200 group-hover:scale-[1.03]">
              S
            </div>
            <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-950 whitespace-nowrap">
              StrangerLens
            </span>
          </button>

          {/* Desktop status indicator */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-50 border border-slate-200/80 shadow-2xs text-[11px] font-semibold tracking-wider uppercase">
            {hasError ? (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-700">CHECK FAILED</span>
              </>
            ) : isBackendReady ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-emerald-700">COMPLETE</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  {!shouldReduceMotion && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#246BFD] opacity-40" />
                  )}
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#246BFD]" />
                </span>
                <span className="text-slate-700">ANALYZING</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. MAIN SECTION — Heading, Submitted Domain, Understated Separator, Supporting Text, and LIVE ACTIVITY */}
      <main className="flex-1 w-full max-w-xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center justify-center text-center">
        {/* Main Heading */}
        <motion.h1
          initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
          className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight leading-[1.15] [text-wrap:balance]"
        >
          Analyzing your website
        </motion.h1>

        {/* Submitted Website Domain */}
        {cleanDomain && (
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05, ease: EASE_OUT_EXPO }}
            className="mt-1 sm:mt-1.5 text-sm sm:text-base font-medium text-slate-500 truncate max-w-full"
          >
            {cleanDomain}
          </motion.p>
        )}

        {/* Thin, understated visual separator / progress indicator */}
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.45, delay: 0.1, ease: EASE_OUT_EXPO }}
          className="w-full max-w-xs sm:max-w-sm h-px bg-slate-200/90 relative overflow-hidden my-4 sm:my-5 rounded-full"
          aria-hidden="true"
        >
          {!hasError && !isBackendReady && !shouldReduceMotion && (
            <motion.div
              className="absolute top-0 bottom-0 w-2/5 bg-gradient-to-r from-transparent via-[#246BFD] to-transparent"
              initial={{ x: "-100%" }}
              animate={{ x: "260%" }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
          {isBackendReady && (
            <div className="w-full h-full bg-[#246BFD]/60" />
          )}
        </motion.div>

        {/* Supporting Text */}
        <motion.p
          initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: EASE_OUT_EXPO }}
          className="text-sm sm:text-base text-[#526078] font-normal leading-relaxed max-w-md"
        >
          Understanding what your website communicates.
        </motion.p>

        {/* 3. LIVE ACTIVITY — Vertical Activity Timeline */}
        <motion.section
          initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: EASE_OUT_EXPO }}
          aria-label="Live analysis activity"
          className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs text-left mt-6 sm:mt-7"
        >
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
              LIVE ACTIVITY
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {hasError ? "1/3" : isBackendReady ? "3/3" : "2/3"}
            </span>
          </div>

          <div className="space-y-0" aria-live="polite">
            {/* Step 1: Website connected (Truthfully completed via pre-scan reachability verification) */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                </div>
                <div className="w-px h-6 bg-slate-200 my-0.5" />
              </div>
              <div className="min-w-0 pb-1">
                <p className="text-xs sm:text-sm font-medium text-slate-600 leading-tight">
                  Website connected
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  HTTP connection established
                </p>
              </div>
            </div>

            {/* Step 2: Analyzing content (Active during /api/check execution) */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {hasError ? (
                  <div className="w-4 h-4 rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" />
                  </div>
                ) : isBackendReady ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-blue-200 bg-blue-50/70 flex items-center justify-center shrink-0 mt-0.5 relative">
                    {!shouldReduceMotion && (
                      <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-[#246BFD] opacity-35" />
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-[#246BFD] relative z-10" />
                  </div>
                )}
                <div className="w-px h-6 bg-slate-200 my-0.5" />
              </div>
              <div className="min-w-0 pb-1">
                <p
                  className={`text-xs sm:text-sm leading-tight ${
                    hasError
                      ? "font-semibold text-rose-700"
                      : isBackendReady
                      ? "font-medium text-slate-600"
                      : "font-semibold text-slate-900"
                  }`}
                >
                  Analyzing content
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  {hasError
                    ? "Analysis halted"
                    : isBackendReady
                    ? "Observations & signals extracted"
                    : "Evaluating positioning, clarity & trust"}
                </p>
              </div>
            </div>

            {/* Step 3: Preparing your report (Pending while analyzing, completes when backend data is ready) */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                {isBackendReady && !hasError ? (
                  <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/70 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Check className="w-2.5 h-2.5 stroke-[2.75]" />
                  </div>
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-200 bg-white flex items-center justify-center shrink-0 mt-0.5" />
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-xs sm:text-sm leading-tight ${
                    isBackendReady && !hasError
                      ? "font-semibold text-slate-900"
                      : "font-normal text-slate-400"
                  }`}
                >
                  Preparing your report
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
                  {isBackendReady && !hasError
                    ? "Ready to view"
                    : "Final diagnosis & recommendations"}
                </p>
              </div>
            </div>
          </div>

          {/* Failure Feedback inside the card */}
          <AnimatePresence>
            {hasError && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
                className="mt-4 pt-4 border-t border-rose-100 overflow-hidden"
              >
                <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl mb-3.5">
                  <p className="text-xs text-rose-700 leading-relaxed font-medium">
                    {safeErrorMessage}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRetryAction}
                    className="flex-1 rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white font-semibold text-xs py-2.5 px-4 transition-all inline-flex items-center justify-center gap-1.5 shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try again</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBackToLanding}
                    className="rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-medium text-xs py-2.5 px-4 transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change URL</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </main>

      {/* Balanced bottom spacer to maintain optical vertical centering across mobile & desktop */}
      <div className="h-6 sm:h-10 shrink-0" aria-hidden="true" />
    </div>
  );
}
