export const LEGAL_CONFIG = {
  productName: "StrangerLens",
  tagline: "AI-Powered Website First-Impression & Homepage Communication Analyzer",
  // Update operatorLegalName and businessLocation with your exact registered entity or sole proprietor details if required during final Paddle account verification.
  operatorLegalName:
    process.env.NEXT_PUBLIC_OPERATOR_LEGAL_NAME || "StrangerLens",
  supportEmail:
    process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@strangerlens.com",
  billingSupportNote:
    "For order receipts, VAT/sales tax invoices, or payment inquiries, include the email address used at checkout and your order reference.",
  supportResponseWindow: "Within 24–48 business hours (Monday–Friday)",
  effectiveDate: "October 12, 2026",
  lastUpdated: "October 12, 2026",
  pricing: {
    freeTier: {
      name: "Free First-Impression Review",
      price: "$0",
      billingType: "Free (No account or card required)",
      summary:
        "Includes overall clarity score, 5 core signal scores, extracted homepage observations, biggest communication issue with page evidence, and #1 priority fix direction.",
    },
    singleReport: {
      name: "One Full Report",
      price: "$5 USD",
      billingType: "One-time purchase · No subscription",
      summary:
        "Unlocks all 15 diagnostic and action sections for 1 website scan, including Priority Fix Plan, Copy-Ready Improvements, First Few Seconds breakdown, Five Signal Deep Dive, Visitor Hesitation analysis, Communication Risk flags, and Recheck & Compare.",
    },
    threeReportPack: {
      name: "Three-Report Pack",
      price: "$12 USD",
      billingType: "One-time purchase · No subscription ($4 per report)",
      summary:
        "Unlocks 3 complete 15-section website reports for evaluating multiple websites or testing before-and-after homepage iterations.",
    },
  },
  merchantOfRecord: {
    name: "Paddle",
    disclosure:
      "Our order process is conducted by our online reseller and Merchant of Record, Paddle.com. Paddle.com is the Merchant of Record for all paid StrangerLens orders, provides customer service inquiries regarding billing, and handles payment processing, invoicing, and applicable sales tax / VAT.",
  },
  links: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Refund Policy", href: "/refund-policy" },
    { label: "Contact Support", href: "/contact" },
  ] as const,
};
