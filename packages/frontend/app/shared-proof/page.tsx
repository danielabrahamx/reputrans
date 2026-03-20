"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Status = "verified" | "failed" | "invalid-url";

function SharedProofContent() {
  const params = useSearchParams();

  const tx = params.get("tx");
  const verified = params.get("verified");

  let initialStatus: Status = "invalid-url";
  if (verified) {
    initialStatus = verified === "true" ? "verified" : "failed";
  }

  const [status] = useState<Status>(initialStatus);
  const [copied, setCopied] = useState(false);

  return (
    <div className="min-h-screen bg-[#080C15] text-white">
      {/* Minimal nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080C15]/95 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-base font-bold tracking-widest text-white">REPUTRANS</span>
          <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.05] px-3 py-1 rounded-full border border-white/[0.08]">
            Verifier View
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">

        {/* Invalid URL */}
        {status === "invalid-url" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
            <div className="text-lg font-semibold mb-2">Invalid proof URL</div>
            <p className="text-sm">This URL is missing required proof data.</p>
          </div>
        )}

        {/* Failed verification */}
        {status === "failed" && (
          <div className="bg-red-500/[0.08] border border-red-500/25 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-400/20 flex items-center justify-center text-red-400 text-lg font-bold">{"\u2717"}</div>
              <span className="text-red-400 text-xl font-bold">Proof Invalid</span>
            </div>
            <p className="text-[#94A3B8] text-sm">This proof did not pass on-chain verification.</p>
          </div>
        )}

        {/* Verified */}
        {status === "verified" && (
          <div className="space-y-5">

            {/* Verification badge */}
            <div className="bg-emerald-500/[0.08] border border-emerald-500/25 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 text-lg font-bold">{"\u2713"}</div>
                <div>
                  <div className="text-emerald-400 font-semibold text-lg">Proof Verified On-Chain</div>
                  <div className="text-[#94A3B8] text-xs mt-0.5">
                    Confirmed · Anvil Sepolia Fork
                  </div>
                </div>
              </div>
              {tx && (
                <div className="text-xs font-mono text-emerald-400/70 border-t border-emerald-500/15 pt-3 mt-3 break-all">
                  TX: {tx}
                </div>
              )}
            </div>

            {/* What was proven */}
            <div>
              <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">
                What this person has proven
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "\uD83D\uDE97", label: "Platform type", value: "Rideshare" },
                  { icon: "\u2B50", label: "Rating", value: "\u2265 4.5 stars" },
                  { icon: "\uD83D\uDDFA\uFE0F", label: "Trips", value: "\u2265 1,000" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center"
                  >
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-[#94A3B8] text-xs mb-1">{item.label}</div>
                    <div className="text-white font-semibold text-sm">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* What was NOT revealed */}
            <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-5">
              <div className="text-xs text-violet-400 font-mono uppercase tracking-widest mb-3">
                Not revealed to you
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Driver identity",
                  "Exact rating (e.g. 4.8)",
                  "Exact trip count",
                  "Which platform (Uber/Lyft)",
                  "Account or name",
                ].map((item) => (
                  <span
                    key={item}
                    className="text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.07] text-[#94A3B8]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Credential provenance */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-2">
                Credential signed by
              </div>
              <div className="text-white text-sm font-medium mb-1">3-of-5 threshold committee</div>
              <div className="text-[#94A3B8] text-xs mb-2">ThetaCrypt EdDSA · Baby Jubjub curve</div>
              <p className="text-[#94A3B8] text-xs leading-relaxed">
                No single validator — including the platform — can forge or revoke this credential alone.
              </p>
            </div>

            {/* Copy link */}
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="text-sm text-[#94A3B8] hover:text-amber-400 transition-colors duration-200 cursor-pointer"
              >
                {copied ? "Link copied!" : "Copy this verification link"}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default function SharedProofPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080C15] text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
      </div>
    }>
      <SharedProofContent />
    </Suspense>
  );
}
