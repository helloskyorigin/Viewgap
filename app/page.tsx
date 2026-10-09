"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Link2,
  ArrowRight,
  Eye,
  Check,
  X,
  ChevronDown,
  Loader2,
  Shield,
  Users,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import ScanScreen from "@/components/ScanScreen";
import ResultsScreen from "@/components/ResultsScreen";
import { mapBackendToFrontend } from "@/lib/mapper";
import { validateClientUrl } from "@/lib/url-client-validator";
import {
  Reveal,
  StaggerContainer,
  StaggerItem,
  AnimatedHamburgerIcon,
  EASE_OUT_EXPO,
} from "@/components/motion/Reveal";

// PRICING CONFIG (One-time purchase model per V1 spec — single arrow handled by icon)
const PRICING_PLANS = [
  {
    id: "free",
    name: "Free Preview",
    price: 0,
    period: "forever",
    tagline: "For a quick stranger impression check",
    features: [
      "Overall score",
      "Five signal scores",
      "Three key observations",
      "Biggest problem",
      "One recommended fix",
    ],
    cta: "Try for free",
    popular: false,
  },
  {
    id: "one_report",
    name: "One Full Report",
    price: 5,
    period: "one-time",
    tagline: "For a single deep website diagnosis",
    features: [
      "Everything in Free",
      "Detailed reasoning",
      "Full relevant evidence",
      "Risk analysis",
      "Complete recommendations",
      "Full report/export",
    ],
    cta: "Get full report",
    popular: true,
  },
  {
    id: "three_reports",
    name: "3 Full Reports",
    price: 10,
    period: "one-time",
    tagline: "For checking multiple websites or versions",
    features: [
      "Three complete reports",
      "Full report capabilities for each",
      "Useful for checking multiple sites",
      "No expiry",
    ],
    cta: "Get 3 reports",
    popular: false,
  },
];

// REQUIRED FAQ ITEMS
const FAQ_ITEMS = [
  {
    question: "What does Percept analyse?",
    answer:
      "Percept analyses your homepage from the perspective of an unbiased first-time visitor. It evaluates message clarity, target audience alignment, value proposition, trust signals, and primary call-to-action friction.",
  },
  {
    question: "Does Percept work with any website?",
    answer:
      "Yes. Percept works with any publicly reachable web page, including SaaS landing pages, consumer apps, B2B software, marketplaces, and agency portfolios.",
  },
  {
    question: "Is the analysis based on real website content?",
    answer:
      "Yes. Percept extracts live text, headings, CTAs, and trust signals directly from your homepage URL to ground every finding in real evidence.",
  },
  {
    question: "Is Percept a security scanner?",
    answer:
      "No. Percept is a communication and conversion intelligence tool focused entirely on messaging, positioning, trust, and visitor comprehension. It does not perform vulnerability scanning or penetration testing.",
  },
  {
    question: "What is included in the free preview?",
    answer:
      "The free preview includes your overall value clarity score, the five signal scores, key observations, and your single highest-priority recommendation.",
  },
  {
    question: "What does the full report cost?",
    answer:
      "Full reports are available as a simple one-time purchase: $5 for a single comprehensive report or $10 for a pack of 3 reports, with no subscriptions or recurring fees.",
  },
  {
    question: "Do I need to create an account?",
    answer:
      "No account is required to run a free preview check. You can test any public URL instantly.",
  },
];

const NAV_ITEMS = [
  { label: "Product", href: "#product" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingPage() {
  const [url, setUrl] = useState("");
  const [currentView, setCurrentView] = useState<"landing" | "scan" | "results">("landing");
  const [submittedUrl, setSubmittedUrl] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeInfoModal, setActiveInfoModal] = useState<"faq" | "pricing" | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isInputFocused, setIsInputFocused] = useState<boolean>(false);

  // API Integration States
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isPending, setIsPending] = useState<boolean>(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [analysisData, setAnalysisData] = useState<any>(null);

  // FAQ accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const hamburgerButtonRef = useRef<HTMLButtonElement>(null);
  const shouldReduceMotion = useReducedMotion();

  const urlValidation = React.useMemo(() => validateClientUrl(url), [url]);

  const scrollToInput = () => {
    if (activeInfoModal) setActiveInfoModal(null);
    if (mobileMenuOpen) setMobileMenuOpen(false);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.scrollIntoView({
          behavior: shouldReduceMotion ? "auto" : "smooth",
          block: "center",
        });
        inputRef.current.focus();
      }
    }, 60);
  };

  const handleSectionNavigate = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    e.preventDefault();
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    const targetId = href.replace(/^#/, "");
    const element = document.getElementById(targetId);
    if (element) {
      setTimeout(() => {
        element.scrollIntoView({
          behavior: shouldReduceMotion ? "auto" : "smooth",
          block: "start",
        });
      }, mobileMenuOpen ? 120 : 0);
    }
  };

  // Escape key handling for mobile menu and info modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
          hamburgerButtonRef.current?.focus();
        }
        if (activeInfoModal) {
          setActiveInfoModal(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen, activeInfoModal]);

  // Close mobile overlay automatically on desktop resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  // Prevent background scrolling when mobile menu or modal is open
  useEffect(() => {
    if (mobileMenuOpen || activeInfoModal) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [mobileMenuOpen, activeInfoModal]);

  const handleAnalyze = async (e?: React.FormEvent, overrideUrl?: string) => {
    if (e) e.preventDefault();
    const targetUrl = (overrideUrl || url || submittedUrl).trim();

    if (!targetUrl) {
      setErrorMessage("Please enter a website URL");
      scrollToInput();
      return;
    }

    const validation = validateClientUrl(targetUrl);
    if (!validation.isValid || !validation.normalizedUrl) {
      setErrorMessage(
        validation.message || "Please enter a valid website URL (e.g. yourproduct.com)"
      );
      scrollToInput();
      return;
    }

    const normalizedTargetUrl = validation.normalizedUrl;

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const verifyRes = await fetch("/api/check/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedTargetUrl }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        setIsVerifying(false);
        setErrorMessage(
          verifyData.message ||
            "Website is unreachable. Please verify the domain and ensure the site is online."
        );
        return;
      }
    } catch (err: unknown) {
      console.error("Reachability check network error:", err);
      setIsVerifying(false);
      setErrorMessage(
        "Unable to verify website reachability. Please check your network and try again."
      );
      return;
    }

    setIsVerifying(false);
    setSubmittedUrl(normalizedTargetUrl);
    setBackendError(null);
    setAnalysisData(null);
    setErrorMessage(null);
    setIsPending(true);
    setCurrentView("scan");

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedTargetUrl }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const mapped = mapBackendToFrontend(
          data.analysis,
          normalizedTargetUrl,
          data.snapshot
        );
        setAnalysisData(mapped);
      } else {
        const errorMsg =
          data.message ||
          data.error ||
          "Failed to analyze website. Verify if the domain is reachable.";
        setBackendError(errorMsg);
      }
    } catch (err: unknown) {
      console.error("API error:", err);
      setBackendError(
        "An unexpected server or connection error occurred. Please try again."
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-100 selection:text-blue-900 flex flex-col overflow-x-hidden">
      <AnimatePresence mode="wait">
        {currentView === "landing" ? (
          <motion.div
            key="landing"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full min-h-screen flex flex-col"
          >
            {/* STICKY HEADER */}
            <motion.header
              initial={shouldReduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: EASE_OUT_EXPO }}
              className="w-full bg-white/90 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50 transition-colors"
            >
              <div className="max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8 h-[64px] sm:h-[72px] flex items-center justify-between gap-4">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    if (mobileMenuOpen) setMobileMenuOpen(false);
                    window.scrollTo({
                      top: 0,
                      behavior: shouldReduceMotion ? "auto" : "smooth",
                    });
                  }}
                  className="flex items-center gap-2.5 shrink-0 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded-lg"
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-sm tracking-tighter shadow-xs transition-transform duration-200 group-hover:scale-[1.04]">
                    P
                  </div>
                  <span className="text-xl font-bold tracking-tight text-slate-950">
                    Percept
                  </span>
                </a>

                {/* Desktop Navigation */}
                <nav
                  aria-label="Primary Navigation"
                  className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600"
                >
                  {NAV_ITEMS.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleSectionNavigate(e, item.href)}
                      className="relative py-1 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-[#246BFD] after:rounded-full after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>

                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
                  <button
                    onClick={scrollToInput}
                    className="group rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.97] text-white text-xs sm:text-sm font-medium px-4 sm:px-5 py-2 sm:py-2.5 transition-all duration-200 inline-flex items-center gap-1.5 shadow-xs hover:shadow-md hover:shadow-blue-500/15 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2"
                  >
                    <span>Try for free</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>

                  <button
                    ref={hamburgerButtonRef}
                    type="button"
                    onClick={() => setMobileMenuOpen((prev) => !prev)}
                    className="md:hidden w-10 h-10 rounded-xl text-slate-800 hover:bg-slate-100 active:scale-95 transition-all flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
                    aria-label={
                      mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
                    }
                    aria-expanded={mobileMenuOpen}
                    aria-controls="mobile-navigation-overlay"
                  >
                    <AnimatedHamburgerIcon
                      isOpen={mobileMenuOpen}
                      reducedMotion={!!shouldReduceMotion}
                    />
                  </button>
                </div>
              </div>
            </motion.header>

            {/* MOBILE HAMBURGER MENU — FIXED BLURRED OVERLAY (DOES NOT PUSH CONTENT) */}
            <AnimatePresence>
              {mobileMenuOpen && (
                <div
                  id="mobile-navigation-overlay"
                  role="dialog"
                  aria-modal="true"
                  aria-label="Mobile Navigation"
                  className="fixed inset-0 top-[64px] sm:top-[72px] z-40 md:hidden flex flex-col"
                >
                  {/* Blurred & Dimmed Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.05 : 0.25,
                      ease: "easeOut",
                    }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 top-[64px] sm:top-[72px] bg-slate-950/25 backdrop-blur-[16px] [-webkit-backdrop-filter:blur(16px)]"
                  />

                  {/* Translucent Floating Menu Surface */}
                  <motion.div
                    initial={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -14, scale: 0.985 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={
                      shouldReduceMotion
                        ? { opacity: 0 }
                        : { opacity: 0, y: -10, scale: 0.985 }
                    }
                    transition={{
                      duration: shouldReduceMotion ? 0.05 : 0.32,
                      ease: EASE_OUT_EXPO,
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative z-10 w-full bg-white/92 backdrop-blur-2xl border-b border-slate-200/80 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] rounded-b-3xl px-5 pt-4 pb-6 overflow-y-auto max-h-[calc(100dvh-64px)]"
                  >
                    <motion.nav
                      initial="hidden"
                      animate="visible"
                      exit="hidden"
                      variants={{
                        hidden: {},
                        visible: {
                          transition: {
                            staggerChildren: shouldReduceMotion ? 0 : 0.05,
                            delayChildren: shouldReduceMotion ? 0 : 0.04,
                          },
                        },
                      }}
                      aria-label="Mobile Navigation"
                      className="flex flex-col space-y-1"
                    >
                      {NAV_ITEMS.map((item) => (
                        <motion.a
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleSectionNavigate(e, item.href)}
                          variants={{
                            hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 10 },
                            visible: {
                              opacity: 1,
                              y: 0,
                              transition: { duration: 0.28, ease: EASE_OUT_EXPO },
                            },
                          }}
                          className="group flex items-center justify-between min-h-[48px] px-4 py-3 rounded-2xl text-base font-semibold text-slate-900 hover:bg-slate-100/90 active:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD]"
                        >
                          <span>{item.label}</span>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-[#246BFD] group-hover:translate-x-0.5 transition-all" />
                        </motion.a>
                      ))}

                      <motion.div
                        variants={{
                          hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 12 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: {
                              duration: 0.32,
                              delay: shouldReduceMotion ? 0 : 0.04,
                              ease: EASE_OUT_EXPO,
                            },
                          },
                        }}
                        className="pt-3 mt-2 border-t border-slate-200/70"
                      >
                        <button
                          type="button"
                          onClick={scrollToInput}
                          className="group w-full min-h-[48px] rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white text-sm font-semibold px-6 py-3 transition-all inline-flex items-center justify-center gap-2 shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2"
                        >
                          <span>Try for free</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>
                      </motion.div>
                    </motion.nav>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <main className="flex-1 w-full max-w-[1180px] mx-auto px-4 sm:px-6 md:px-8">
              {/* HERO SECTION */}
              <section className="pt-7 pb-11 sm:pt-12 sm:pb-16 md:pt-16 md:pb-20 lg:pt-20 lg:pb-22 grid grid-cols-1 lg:grid-cols-12 gap-9 sm:gap-10 lg:gap-12 items-center">
                <div className="lg:col-span-6 flex flex-col items-start text-left min-w-0">
                  {/* 1. Eyebrow with subtle blur-to-sharp entrance */}
                  <motion.div
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: 8, filter: "blur(4px)" }
                    }
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                      duration: 0.5,
                      delay: 0.05,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold tracking-wider text-[#246BFD] uppercase bg-[#EAF2FF] mb-4 sm:mb-5 border border-blue-100"
                  >
                    WEBSITE INTELLIGENCE FOR BUILDERS
                  </motion.div>

                  {/* 2. Staggered Hero Headline Lines */}
                  <h1 className="text-[34px] min-[375px]:text-4xl sm:text-5xl lg:text-[60px] font-extrabold text-[#101828] tracking-tight leading-[1.08] mb-4 sm:mb-5 [text-wrap:balance]">
                    <motion.span
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.52,
                        delay: 0.11,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="block"
                    >
                      Your website
                    </motion.span>
                    <motion.span
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.52,
                        delay: 0.19,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="block"
                    >
                      tells a story.
                    </motion.span>
                    <motion.span
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.56,
                        delay: 0.28,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="block text-[#246BFD]"
                    >
                      Is it the right one?
                    </motion.span>
                  </h1>

                  {/* 3. Supporting Text */}
                  <motion.p
                    initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.52,
                      delay: 0.35,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="text-[15px] sm:text-lg text-[#526078] leading-relaxed mb-6 sm:mb-7 max-w-lg font-normal"
                  >
                    Understand what your website communicates, where visitors may lose trust, and what you should improve first.
                  </motion.p>

                  {/* 4. URL Input Pill with Spring-like Entrance & Focus Transition */}
                  <motion.form
                    onSubmit={handleAnalyze}
                    initial={
                      shouldReduceMotion
                        ? false
                        : { opacity: 0, y: 14, scale: 0.975 }
                    }
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.55,
                      delay: 0.42,
                      ease: EASE_OUT_EXPO,
                    }}
                    className="w-full max-w-lg"
                  >
                    <div
                      className={`relative flex items-center bg-white rounded-full border transition-all duration-200 p-1.5 pl-4 sm:pl-5 min-h-[54px] sm:min-h-[60px] ${
                        errorMessage || urlValidation.status === "invalid"
                          ? "border-rose-400 ring-4 ring-rose-100/80 shadow-sm"
                          : urlValidation.status === "valid"
                          ? "border-emerald-500 ring-4 ring-emerald-100/80 shadow-md"
                          : isInputFocused
                          ? "border-[#246BFD] ring-4 ring-blue-100/90 shadow-[0_10px_30px_-6px_rgba(36,107,253,0.18)]"
                          : "border-[#DCE6F7] hover:border-blue-300/90 shadow-[0_8px_26px_-6px_rgba(36,107,253,0.10)]"
                      }`}
                    >
                      <Link2
                        className={`w-4 h-4 sm:w-5 sm:h-5 shrink-0 mr-2.5 sm:mr-3 transition-colors duration-200 ${
                          isInputFocused ? "text-[#246BFD]" : "text-slate-400"
                        }`}
                      />
                      <input
                        ref={inputRef}
                        type="text"
                        disabled={isVerifying}
                        value={url}
                        onFocus={() => setIsInputFocused(true)}
                        onBlur={() => setIsInputFocused(false)}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          if (errorMessage) setErrorMessage(null);
                        }}
                        placeholder="https://yourwebsite.com"
                        className="w-full min-w-0 bg-transparent text-slate-900 placeholder:text-slate-400 text-sm sm:text-base outline-none font-normal pr-2 disabled:opacity-75"
                        aria-label="Website URL"
                      />
                      <button
                        type="submit"
                        disabled={
                          isVerifying ||
                          urlValidation.status === "invalid" ||
                          !url.trim()
                        }
                        className={`group w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2 ${
                          urlValidation.status === "invalid" || !url.trim()
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                            : isVerifying
                            ? "bg-[#246BFD] text-white opacity-90 cursor-wait"
                            : "bg-[#246BFD] hover:bg-blue-600 hover:scale-[1.04] active:scale-[0.96] text-white shadow-sm hover:shadow-md hover:shadow-blue-500/20"
                        }`}
                        aria-label="Analyse website"
                        title="Analyse website"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                        ) : (
                          <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                        )}
                      </button>
                    </div>

                    <AnimatePresence mode="wait">
                      {(errorMessage || urlValidation.status === "invalid") && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2 }}
                          className="text-rose-600 text-xs sm:text-sm mt-2 font-medium pl-2"
                        >
                          {errorMessage || urlValidation.message}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.form>

                  {/* 5. Reassurance Indicators Stagger */}
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: {},
                      visible: {
                        transition: {
                          staggerChildren: shouldReduceMotion ? 0 : 0.06,
                          delayChildren: shouldReduceMotion ? 0 : 0.48,
                        },
                      },
                    }}
                    className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-xs text-[#526078] font-medium"
                  >
                    {["Free preview", "No signup", "No credit card"].map((label) => (
                      <motion.span
                        key={label}
                        variants={{
                          hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 8 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.4, ease: EASE_OUT_EXPO },
                          },
                        }}
                        className="flex items-center gap-1.5 whitespace-nowrap"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{label}</span>
                      </motion.span>
                    ))}
                  </motion.div>
                </div>

                {/* 6. Hero Dashboard Preview (Untruncated Signal Labels & Depth Entrance) */}
                <motion.div
                  initial={
                    shouldReduceMotion
                      ? false
                      : { opacity: 0, y: 22, scale: 0.98 }
                  }
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{
                    duration: 0.65,
                    delay: 0.24,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="lg:col-span-6 w-full flex justify-center min-w-0"
                >
                  <div className="w-full max-w-[540px] bg-white border border-[#E3EAF5] rounded-3xl p-4 sm:p-6 shadow-[0_20px_50px_-15px_rgba(16,24,40,0.10)] relative overflow-hidden bg-gradient-to-b from-white to-[#F5F8FF]/55">
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-bold">
                          P
                        </div>
                        <span className="font-bold text-slate-900 text-sm">
                          Percept
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md font-medium">
                          example.com
                        </span>
                      </div>
                    </div>

                    {/* Mini Score & Verdict */}
                    <div className="bg-white border border-[#E3EAF5] rounded-2xl p-3.5 sm:p-4 mb-3.5 shadow-xs flex items-center gap-3.5 sm:gap-4">
                      <div className="relative w-15 h-15 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                        <svg
                          className="w-full h-full transform -rotate-90"
                          viewBox="0 0 100 100"
                        >
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#f1f5f9"
                            strokeWidth="8"
                            fill="transparent"
                          />
                          <motion.circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="#f59e0b"
                            strokeWidth="8"
                            strokeDasharray="251.2"
                            initial={
                              shouldReduceMotion
                                ? { strokeDashoffset: 75 }
                                : { strokeDashoffset: 251.2 }
                            }
                            animate={{ strokeDashoffset: 75 }}
                            transition={{
                              duration: 1.1,
                              delay: 0.45,
                              ease: EASE_OUT_EXPO,
                            }}
                            strokeLinecap="round"
                            fill="transparent"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
                          <span className="text-base sm:text-lg font-bold text-slate-950 leading-none">
                            72
                          </span>
                          <span className="text-[9px] text-slate-400">/100</span>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 mb-1">
                          Needs work
                        </span>
                        <p className="text-xs text-slate-700 font-medium leading-snug">
                          The website clearly communicates its core offering, but lacks trust signals and a stronger call to action.
                        </p>
                      </div>
                    </div>

                    {/* 5 Signals Row — Responsive untruncated labels across all widths (320px+) */}
                    <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-3.5">
                      {[
                        { label: "Impression", score: 80 },
                        { label: "Audience", score: 70 },
                        { label: "Value", score: 85 },
                        { label: "Trust", score: 20 },
                        { label: "Action", score: 60 },
                      ].map((sig, i) => (
                        <motion.div
                          key={sig.label}
                          initial={
                            shouldReduceMotion ? false : { opacity: 0, y: 8 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: 0.4,
                            delay: 0.48 + i * 0.05,
                            ease: EASE_OUT_EXPO,
                          }}
                          className="bg-white border border-[#E3EAF5] rounded-xl px-1 py-2 sm:p-2 text-center shadow-2xs flex flex-col items-center justify-center min-w-0"
                        >
                          <span className="text-[9px] min-[375px]:text-[10px] sm:text-[10.5px] text-slate-500 font-medium leading-tight tracking-tight whitespace-nowrap block">
                            {sig.label}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                            {sig.score}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    {/* What your website is actually saying */}
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: 0.68,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="bg-white border border-[#E3EAF5] rounded-2xl p-3.5 mb-2.5 shadow-2xs"
                    >
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                        What your website is actually saying
                      </span>
                      <p className="text-xs text-slate-700 leading-normal">
                        This product appears to be a tool that helps people do something specific. The core offering is clear, but trust signals and proof points are limited.
                      </p>
                    </motion.div>

                    {/* If you change only one thing */}
                    <motion.div
                      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.45,
                        delay: 0.76,
                        ease: EASE_OUT_EXPO,
                      }}
                      className="bg-white border border-[#E3EAF5] rounded-2xl p-3.5 shadow-2xs"
                    >
                      <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                        If you change only one thing
                      </span>
                      <p className="text-xs text-slate-800 font-medium">
                        Strengthen the trust behind your main claim.
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              </section>

              {/* SECTION: THE PROBLEM */}
              <section
                id="product"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100"
              >
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      THE PROBLEM
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      You know your product. <br />
                      Your visitors don{"'"}t.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      You{"'"}ve spent hours building your product. But a new visitor sees only what{"'"}s on the page — and may miss what makes it valuable.
                    </p>
                  </Reveal>
                </div>

                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 max-w-4xl mx-auto items-stretch">
                  <Reveal y={18} delay={0.08} className="h-full">
                    <div className="h-full bg-[#F5F8FF] border border-[#E3EAF5] rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:border-blue-200">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
                          WHAT YOU WANT TO SAY
                        </span>
                        <h3 className="text-lg font-bold text-slate-950 mb-2.5">
                          Your complete product vision
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          All your features, benefits, use cases, and nuanced positioning perfectly understood in context.
                        </p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-200/60 text-xs text-slate-500 font-medium flex items-center justify-between">
                        <span>Intended message</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 hidden md:inline-block" />
                      </div>
                    </div>
                  </Reveal>

                  <Reveal y={18} delay={0.18} className="h-full">
                    <div className="h-full bg-white border border-[#E3EAF5] rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs transition-all duration-200 hover:border-blue-200 hover:shadow-sm">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-[#246BFD] block mb-2">
                          WHAT VISITORS MIGHT UNDERSTAND
                        </span>
                        <h3 className="text-lg font-bold text-slate-950 mb-2.5">
                          First-time stranger impression
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-700">
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> What is this product?
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> Is this actually for me?
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> Why should I trust this?
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="text-blue-600 font-semibold">?</span> What should I do next?
                          </li>
                        </ul>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                        Actual 5-second reality
                      </div>
                    </div>
                  </Reveal>
                </div>
              </section>

              {/* SECTION: WHAT PERCEPT REVEALS */}
              <section className="py-12 sm:py-14 md:py-20 border-t border-slate-100">
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      WHAT PERCEPT REVEALS
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      See your website from every important angle.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      Percept analyses your website through five key signals to understand what a first-time visitor actually sees.
                    </p>
                  </Reveal>
                </div>

                <StaggerContainer
                  staggerDelay={0.07}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4"
                >
                  {[
                    {
                      title: "First Impression",
                      question: "Is it clear and engaging?",
                      icon: Eye,
                    },
                    {
                      title: "Audience",
                      question: "Is this for me?",
                      icon: Users,
                    },
                    {
                      title: "Value",
                      question: "Why should I care?",
                      icon: Sparkles,
                    },
                    {
                      title: "Trust",
                      question: "Why should I believe it?",
                      icon: Shield,
                    },
                    {
                      title: "Action",
                      question: "What is the next step?",
                      icon: ArrowRight,
                    },
                  ].map((card, idx) => {
                    const IconComponent = card.icon;
                    return (
                      <StaggerItem key={idx} y={16}>
                        <div className="group h-full bg-white border border-[#E3EAF5] rounded-2xl p-5 flex flex-col justify-between shadow-2xs hover:border-blue-300 md:hover:-translate-y-1 hover:shadow-md transition-all duration-200">
                          <div>
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-[#246BFD] flex items-center justify-center mb-3.5 transition-transform duration-200 group-hover:scale-110 group-hover:bg-[#EAF2FF]">
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <h3 className="font-bold text-slate-950 text-sm mb-1">
                              {card.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {card.question}
                            </p>
                          </div>
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              </section>

              {/* SECTION: REAL PRODUCT PREVIEW */}
              <section className="py-12 sm:py-14 md:py-20 border-t border-slate-100">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10 items-center">
                  <div className="lg:col-span-5">
                    <Reveal y={10} blur>
                      <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                        REAL PRODUCT PREVIEW
                      </span>
                    </Reveal>
                    <Reveal y={14} delay={0.06}>
                      <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3.5 [text-wrap:balance]">
                        Not another generic website score.
                      </h2>
                    </Reveal>
                    <Reveal y={14} delay={0.12}>
                      <p className="text-[15px] sm:text-base text-[#526078] leading-relaxed mb-6 font-normal">
                        Get a clear, evidence-based diagnosis with specific findings and actionable recommendations based on what your website actually shows.
                      </p>
                    </Reveal>
                    <Reveal y={14} delay={0.18}>
                      <button
                        onClick={scrollToInput}
                        className="group rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white font-medium px-6 py-3 inline-flex items-center gap-2 shadow-xs hover:shadow-md hover:shadow-blue-500/15 transition-all duration-200 cursor-pointer text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2"
                      >
                        <span>Try it free</span>
                        <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>
                    </Reveal>
                  </div>

                  <Reveal
                    y={20}
                    scale={0.985}
                    delay={0.1}
                    className="lg:col-span-7"
                  >
                    <div className="bg-[#F5F8FF] border border-[#E3EAF5] rounded-3xl p-4 sm:p-6 shadow-[0_18px_40px_-15px_rgba(16,24,40,0.08)]">
                      <div className="bg-white border border-[#E3EAF5] rounded-2xl p-4 sm:p-5 shadow-xs">
                        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-bold text-sm text-slate-900 truncate">
                              Results · example.com
                            </span>
                          </div>
                          <span className="text-[11px] bg-slate-100 px-2.5 py-0.5 rounded text-slate-600 font-medium shrink-0">
                            Illustrative preview
                          </span>
                        </div>

                        <div className="flex items-center gap-3.5 sm:gap-4 mb-4 bg-slate-50 rounded-xl p-3 sm:p-3.5">
                          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                            <svg
                              className="w-full h-full transform -rotate-90"
                              viewBox="0 0 100 100"
                            >
                              <circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke="#e2e8f0"
                                strokeWidth="8"
                                fill="transparent"
                              />
                              <motion.circle
                                cx="50"
                                cy="50"
                                r="40"
                                stroke="#f59e0b"
                                strokeWidth="8"
                                strokeDasharray="251.2"
                                initial={
                                  shouldReduceMotion
                                    ? { strokeDashoffset: 82.9 }
                                    : { strokeDashoffset: 251.2 }
                                }
                                whileInView={{ strokeDashoffset: 82.9 }}
                                viewport={{ once: true, amount: 0.4 }}
                                transition={{
                                  duration: 1.0,
                                  delay: 0.2,
                                  ease: EASE_OUT_EXPO,
                                }}
                                strokeLinecap="round"
                                fill="transparent"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center tabular-nums">
                              <span className="text-base font-extrabold text-slate-900 leading-none">
                                67
                              </span>
                              <span className="text-[9px] text-slate-400">
                                /100
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                              Needs work
                            </span>
                            <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                              The website clearly communicates its core offering, but value proposition, trust signals and a stronger call to action could improve first-time visitor confidence.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2.5 text-xs text-slate-700">
                          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                            <strong className="text-blue-900 block mb-0.5 font-semibold">
                              What your website is actually saying:
                            </strong>
                            This product appears to be a tool that helps people do something specific. The core offering is clear, but trust signals and proof points are limited.
                          </div>
                          <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100">
                            <strong className="text-rose-900 block mb-0.5 font-semibold">
                              Risk found (Trust risk):
                            </strong>
                            Limited visible proof for key claims.
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>
                </div>
              </section>

              {/* SECTION: FROM DIAGNOSIS TO ACTION */}
              <section
                id="how-it-works"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100"
              >
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      FROM DIAGNOSIS TO ACTION
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      Know what to fix first.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      Percept helps you go from confusion to clarity with an understanding of what works, what doesn{"'"}t, and what to improve.
                    </p>
                  </Reveal>
                </div>

                <div className="relative max-w-4xl mx-auto">
                  {/* Subtle desktop connecting line behind the 3 step cards */}
                  <motion.div
                    initial={shouldReduceMotion ? false : { scaleX: 0, opacity: 0 }}
                    whileInView={{ scaleX: 1, opacity: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT_EXPO }}
                    className="hidden md:block absolute top-11 left-[16%] right-[16%] h-[1px] bg-gradient-to-r from-blue-100 via-blue-200 to-blue-100 origin-left z-0"
                    aria-hidden="true"
                  />

                  <StaggerContainer
                    staggerDelay={0.1}
                    className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
                  >
                    {[
                      {
                        step: "01",
                        title: "Understand",
                        desc: "See what your website communicates to visitors.",
                      },
                      {
                        step: "02",
                        title: "Discover",
                        desc: "Find where clarity, value or trust breaks down.",
                      },
                      {
                        step: "03",
                        title: "Improve",
                        desc: "Know which change deserves attention first.",
                      },
                    ].map((s, idx) => (
                      <StaggerItem key={idx} y={18}>
                        <div className="h-full bg-white border border-[#E3EAF5] rounded-3xl p-6 shadow-2xs flex flex-col justify-between hover:border-blue-300 md:hover:-translate-y-0.5 transition-all duration-200">
                          <div>
                            <span className="text-xs font-bold text-[#246BFD] bg-[#EAF2FF] px-2.5 py-1 rounded-md inline-block mb-3.5 tabular-nums border border-blue-100/80">
                              {s.step}
                            </span>
                            <h3 className="text-lg font-bold text-slate-950 mb-1.5">
                              {s.title}
                            </h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                              {s.desc}
                            </p>
                          </div>
                        </div>
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>
              </section>

              {/* SECTION: PRICING */}
              <section
                id="pricing"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100"
              >
                <div className="max-w-4xl mx-auto text-center mb-8 sm:mb-10 md:mb-12">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      PRICING
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mt-3.5 mb-3 [text-wrap:balance]">
                      Simple, transparent pricing.
                    </h2>
                  </Reveal>
                  <Reveal y={14} delay={0.12}>
                    <p className="text-[15px] sm:text-lg text-[#526078] max-w-2xl mx-auto leading-relaxed font-normal">
                      Start with a free preview. Upgrade anytime for a detailed, far deeper analysis and full recommendations.
                    </p>
                  </Reveal>
                </div>

                <StaggerContainer
                  staggerDelay={0.09}
                  className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto pt-2"
                >
                  {PRICING_PLANS.map((plan) => (
                    <StaggerItem key={plan.id} y={20} className="h-full">
                      <div
                        className={`h-full rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 ${
                          plan.popular
                            ? "bg-[#F5F8FF] border-2 border-[#246BFD] shadow-[0_16px_38px_-12px_rgba(36,107,253,0.16)] md:hover:-translate-y-1 relative"
                            : "bg-white border border-[#E3EAF5] shadow-xs hover:border-blue-300 md:hover:-translate-y-1 hover:shadow-md"
                        }`}
                      >
                        {plan.popular && (
                          <motion.span
                            initial={
                              shouldReduceMotion
                                ? false
                                : { opacity: 0, scale: 0.9, y: 4 }
                            }
                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{
                              duration: 0.35,
                              delay: 0.22,
                              ease: EASE_OUT_EXPO,
                            }}
                            className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#246BFD] text-white text-[10px] font-bold tracking-wider uppercase px-3 py-0.5 rounded-full shadow-xs whitespace-nowrap"
                          >
                            Most popular
                          </motion.span>
                        )}

                        <div>
                          <h3 className="font-bold text-slate-950 text-xl mb-1">
                            {plan.name}
                          </h3>
                          <p className="text-xs text-slate-500 mb-4">
                            {plan.tagline}
                          </p>

                          <div className="flex items-baseline gap-1 mb-5 pb-4 border-b border-slate-200/70 tabular-nums">
                            <span className="text-4xl font-extrabold text-slate-950">
                              ${plan.price}
                            </span>
                            <span className="text-xs text-slate-500">
                              /{plan.period}
                            </span>
                          </div>

                          <div className="space-y-2.5 mb-7 text-sm text-slate-700">
                            {plan.features.map((feat, i) => (
                              <div key={i} className="flex items-start gap-2.5">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{feat}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={scrollToInput}
                          className={`group w-full py-3 px-4 rounded-full text-sm font-semibold transition-all duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2 ${
                            plan.popular
                              ? "bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white shadow-xs hover:shadow-md hover:shadow-blue-500/20"
                              : "bg-slate-100 hover:bg-slate-200/90 active:scale-[0.98] text-slate-800"
                          }`}
                        >
                          <span>{plan.cta}</span>
                          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              </section>

              {/* SECTION: FAQ */}
              <section
                id="faq"
                className="scroll-mt-20 sm:scroll-mt-24 py-12 sm:py-14 md:py-20 border-t border-slate-100 max-w-3xl mx-auto px-1 sm:px-4"
              >
                <div className="text-center mb-8 sm:mb-10">
                  <Reveal y={10} blur>
                    <span className="inline-block text-[11px] font-bold tracking-widest text-[#246BFD] uppercase bg-[#EAF2FF] px-3 py-1 rounded-full border border-blue-100">
                      FAQ
                    </span>
                  </Reveal>
                  <Reveal y={14} delay={0.06}>
                    <h2 className="text-2xl min-[375px]:text-3xl font-extrabold text-[#101828] tracking-tight mt-3.5 [text-wrap:balance]">
                      Frequently asked questions
                    </h2>
                  </Reveal>
                </div>

                <Reveal y={16} delay={0.1}>
                  <div className="divide-y divide-slate-100 border-t border-b border-slate-100">
                    {FAQ_ITEMS.map((item, idx) => {
                      const isOpen = openFaqIndex === idx;
                      return (
                        <div key={idx} className="py-3.5 sm:py-4">
                          <button
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between gap-4 text-left py-1.5 group cursor-pointer bg-transparent border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] rounded-lg"
                            aria-expanded={isOpen}
                          >
                            <span className="font-bold text-slate-900 group-hover:text-[#246BFD] transition-colors text-[15px] sm:text-base">
                              {item.question}
                            </span>
                            <ChevronDown
                              className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                                isOpen
                                  ? "rotate-180 text-[#246BFD]"
                                  : "group-hover:text-slate-600"
                              }`}
                            />
                          </button>
                          <AnimatePresence initial={false}>
                            {isOpen && (
                              <motion.div
                                initial={
                                  shouldReduceMotion
                                    ? false
                                    : { height: 0, opacity: 0 }
                                }
                                animate={{ height: "auto", opacity: 1 }}
                                exit={
                                  shouldReduceMotion
                                    ? { opacity: 0 }
                                    : { height: 0, opacity: 0 }
                                }
                                transition={{
                                  duration: shouldReduceMotion ? 0.05 : 0.26,
                                  ease: EASE_OUT_EXPO,
                                }}
                                className="overflow-hidden"
                              >
                                <p className="pt-2 pb-1 text-sm text-[#526078] leading-relaxed">
                                  {item.answer}
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </Reveal>
              </section>

              {/* FINAL CTA & FOOTER */}
              <section className="pt-11 pb-8 sm:pt-14 sm:pb-10 md:pt-20 md:pb-12 border-t border-slate-100 text-center">
                <Reveal y={18}>
                  <div className="max-w-4xl mx-auto rounded-3xl bg-[#F5F8FF] border border-[#E3EAF5] p-7 sm:p-10 md:p-14 mb-8 sm:mb-10 shadow-xs">
                    <h2 className="text-2xl min-[375px]:text-3xl sm:text-4xl font-extrabold text-[#101828] tracking-tight mb-3.5 [text-wrap:balance]">
                      Your website deserves a second look.
                    </h2>
                    <p className="text-[15px] sm:text-base text-[#526078] max-w-xl mx-auto mb-6 sm:mb-7 font-normal">
                      Understand what your website communicates before your next visitor does.
                    </p>
                    <button
                      onClick={scrollToInput}
                      className="group rounded-full bg-[#246BFD] hover:bg-blue-600 active:scale-[0.98] text-white font-medium px-7 sm:px-8 py-3.5 sm:py-4 inline-flex items-center gap-2 shadow-sm hover:shadow-md hover:shadow-blue-500/20 transition-all duration-200 cursor-pointer text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#246BFD] focus-visible:ring-offset-2"
                    >
                      <span>Analyse your website</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </Reveal>

                <Reveal y={10} delay={0.08}>
                  <footer className="pt-6 pb-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#526078]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-950 text-white flex items-center justify-center text-xs font-bold">
                        P
                      </div>
                      <span className="font-bold text-slate-900">Percept</span>
                      <span>
                        © {new Date().getFullYear()} Percept. All rights reserved.
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-6">
                      {NAV_ITEMS.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          onClick={(e) => handleSectionNavigate(e, item.href)}
                          className="hover:text-slate-900 transition-colors underline-offset-4 hover:underline"
                        >
                          {item.label}
                        </a>
                      ))}
                    </div>
                  </footer>
                </Reveal>
              </section>
            </main>
          </motion.div>
        ) : currentView === "scan" ? (
          <motion.div
            key="scan"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="w-full min-h-screen"
          >
            <ScanScreen
              rawUrl={submittedUrl}
              isBackendReady={!isPending && analysisData !== null}
              backendError={backendError}
              onBackToLanding={() => {
                setCurrentView("landing");
                setTimeout(() => scrollToInput(), 100);
              }}
              onOpenFaq={() => {
                setActiveInfoModal("faq");
                setOpenFaqIndex(0);
              }}
              onOpenPricing={() => setActiveInfoModal("pricing")}
              onGoToResults={() => setCurrentView("results")}
            />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={shouldReduceMotion ? {} : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={shouldReduceMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="w-full min-h-screen"
          >
            <ResultsScreen
              rawUrl={submittedUrl}
              analysisData={analysisData || undefined}
              onBackToLanding={() => {
                setCurrentView("landing");
                setTimeout(() => scrollToInput(), 100);
              }}
              onRunNewCheck={() => {
                handleAnalyze();
              }}
              onOpenFaq={() => {
                setActiveInfoModal("faq");
                setOpenFaqIndex(0);
              }}
              onOpenPricing={() => setActiveInfoModal("pricing")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* FAQ MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "faq" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Frequently Asked Questions"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight">
                    Frequently Asked Questions
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Everything you need to know about website intelligence.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  aria-label="Close FAQ"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 overflow-y-auto pr-1 divide-y divide-slate-100 flex-1">
                {FAQ_ITEMS.map((item, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div key={idx} className="py-3.5 first:pt-2 last:pb-2">
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between gap-3 text-left py-1 group cursor-pointer bg-transparent border-0"
                        aria-expanded={isOpen}
                      >
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors text-sm sm:text-base">
                          {item.question}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                            isOpen ? "rotate-180 text-blue-600" : ""
                          }`}
                        />
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className="pt-2 pb-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                              {item.answer}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRICING MODAL / BOTTOM SHEET */}
      <AnimatePresence>
        {activeInfoModal === "pricing" && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pricing Plans"
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInfoModal(null)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
              className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 relative max-h-[85vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-950 text-xl tracking-tight">
                    Simple, Transparent Pricing
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                    Start with a free preview or get full reports.
                  </p>
                </div>
                <button
                  onClick={() => setActiveInfoModal(null)}
                  className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  aria-label="Close Pricing"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-y-auto flex-1 pr-1 pb-1">
                {PRICING_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 flex flex-col justify-between ${
                      plan.popular
                        ? "bg-[#F5F8FF] border-2 border-[#246BFD] shadow-sm relative"
                        : "bg-white border border-[#E3EAF5]"
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#246BFD] text-white text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap">
                        Most popular
                      </span>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-950 text-lg mb-1">
                        {plan.name}
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">{plan.tagline}</p>
                      <div className="flex items-baseline gap-1 mb-4 pb-3 border-b border-slate-100 tabular-nums">
                        <span className="text-3xl font-extrabold text-slate-950">
                          ${plan.price}
                        </span>
                        <span className="text-xs text-slate-500">
                          /{plan.period}
                        </span>
                      </div>
                      <div className="space-y-2 mb-6 text-xs text-slate-700">
                        {plan.features.map((feat, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={scrollToInput}
                      className={`group w-full py-2.5 px-4 rounded-full text-xs font-semibold transition-all inline-flex items-center justify-center gap-1.5 cursor-pointer ${
                        plan.popular
                          ? "bg-[#246BFD] hover:bg-blue-600 text-white"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-800"
                      }`}
                    >
                      <span>{plan.cta}</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
