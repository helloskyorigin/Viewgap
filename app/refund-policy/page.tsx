import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/LegalLayout";
import { LEGAL_CONFIG } from "@/lib/legal-config";

export const metadata: Metadata = {
  title: `Refund Policy — ${LEGAL_CONFIG.productName}`,
  description:
    "StrangerLens 14-day refund policy for one-time Full Report ($5) and Three-Report Pack ($12) purchases.",
};

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      activePage="refund"
      badge="REFUND POLICY"
      title="Refund Policy"
      subtitle="Transparent, customer-friendly refund terms for all StrangerLens one-time report purchases."
    >
      {/* 1. Summary Callout */}
      <section className="bg-[#F5F8FF] border border-blue-200/80 rounded-2xl p-5 space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#246BFD] block">
          14-DAY REFUND POLICY · ONE-TIME PURCHASES
        </span>
        <h2 className="text-base sm:text-lg font-extrabold text-[#101828]">
          Simple 14-Day Refund Window &amp; Zero Recurring Charges
        </h2>
        <p className="text-xs sm:text-sm text-[#526078] leading-relaxed">
          All {LEGAL_CONFIG.productName} paid plans — the <strong>$5 Full Report</strong> and the{" "}
          <strong>$12 Three-Report Pack</strong> — are strictly one-time purchases with no recurring subscriptions. If you are unsatisfied with your purchase or experience a technical issue, you may request a refund within <strong>14 days</strong> of the transaction date.
        </p>
      </section>

      {/* 2. 14-Day Refund Eligibility */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          1. 14-Day Refund Window
        </h2>
        <p>
          In accordance with our Merchant of Record (<strong>{LEGAL_CONFIG.merchantOfRecord.name}</strong>) buyer protection standards and applicable consumer protection laws, you may request a full refund within <strong>fourteen (14) calendar days</strong> of your purchase date.
        </p>
        <p>We gladly issue full refunds within the 14-day window for any of the following:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-[#526078]">
          <li>
            <strong>Technical or Delivery Issues:</strong> If a report fails to unlock, fails to generate due to website fetch/extraction incompatibilities, or cannot be accessed via your email receipt.
          </li>
          <li>
            <strong>Accidental or Duplicate Purchases:</strong> If you were accidentally charged twice for the same report or selected the wrong package.
          </li>
          <li>
            <strong>Unused Three-Report Pack Credits:</strong> If you purchased the $12 Three-Report Pack and decide you no longer need the remaining reports within 14 days of purchase.
          </li>
          <li>
            <strong>Consumer Right to Cancel / Dissatisfaction:</strong> If you request a refund within 14 days of your order date and are not satisfied with the diagnostic report.
          </li>
        </ul>
      </section>

      {/* 3. How to Request a Refund */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          2. How to Request a Refund
        </h2>
        <p>
          Requesting a refund is fast and requires no complicated forms:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1.5">
            <span className="text-xs font-extrabold text-[#246BFD]">STEP 01</span>
            <h3 className="font-bold text-[#101828] text-sm">Email Our Support Team</h3>
            <p className="text-xs text-[#526078]">
              Send an email to{" "}
              <a
                href={`mailto:${LEGAL_CONFIG.supportEmail}?subject=StrangerLens%20Refund%20Request`}
                className="font-semibold text-[#246BFD] hover:underline"
              >
                {LEGAL_CONFIG.supportEmail}
              </a>{" "}
              with the subject line &ldquo;Refund Request&rdquo;.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1.5">
            <span className="text-xs font-extrabold text-[#246BFD]">STEP 02</span>
            <h3 className="font-bold text-[#101828] text-sm">Include Your Order Details</h3>
            <p className="text-xs text-[#526078]">
              Include the email address used at checkout and, if available, the {LEGAL_CONFIG.merchantOfRecord.name} receipt number or the website URL you analyzed.
            </p>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E3EAF5] rounded-2xl p-4 space-y-1.5">
            <span className="text-xs font-extrabold text-[#246BFD]">STEP 03</span>
            <h3 className="font-bold text-[#101828] text-sm">Refund Processing</h3>
            <p className="text-xs text-[#526078]">
              We review and approve eligible requests within {LEGAL_CONFIG.supportResponseWindow}. Refunds are returned to your original payment method via {LEGAL_CONFIG.merchantOfRecord.name} (typically appearing on your statement within 5–10 business days).
            </p>
          </div>
        </div>
      </section>

      {/* 4. Merchant of Record Processing */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          3. Merchant of Record &amp; Statutory Consumer Rights
        </h2>
        <p>
          {LEGAL_CONFIG.merchantOfRecord.disclosure} You may also initiate a billing or refund inquiry directly using the buyer support link in your {LEGAL_CONFIG.merchantOfRecord.name} email receipt.
        </p>
        <p className="text-xs sm:text-sm text-[#526078]">
          Nothing in this Refund Policy limits or affects any mandatory statutory consumer rights you may have under the laws of your country or region of residence (including EU, EEA, and UK consumer protection regulations).
        </p>
      </section>

      {/* 5. Contact */}
      <section className="space-y-3 pt-4 border-t border-slate-100">
        <h2 className="text-lg sm:text-xl font-extrabold text-[#101828] tracking-tight">
          4. Need Assistance Right Now?
        </h2>
        <p>
          Visit our{" "}
          <Link href="/contact" className="font-semibold text-[#246BFD] hover:underline">
            Contact Support
          </Link>{" "}
          page or email{" "}
          <a
            href={`mailto:${LEGAL_CONFIG.supportEmail}`}
            className="font-semibold text-[#246BFD] hover:underline"
          >
            {LEGAL_CONFIG.supportEmail}
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  );
}
