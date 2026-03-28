"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, loadState, saveState } from "../lib/api";

interface VerifyApiResponse {
  success: boolean;
  localVerification: boolean;
  onChainVerification: { verified: boolean; txHash: string; gasUsed: string } | null;
}

interface VerifyResponse {
  verified: boolean;
  txHash?: string;
  gasUsed?: number;
  proofGenerationTimeMs?: number;
  circuitConstraints?: number;
  gasCost?: string;
  anonymitySetSize?: number;
}

export default function VerifyPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const missingPrev = typeof window !== "undefined" && !loadState("proof");

  async function handleVerify() {
    setLoading(true);
    setError(null);
    try {
      const proofData = loadState("proof");
      const raw = await apiFetch<VerifyApiResponse>("/proof/verify", {
        method: "POST",
        body: JSON.stringify(proofData),
      });
      const res: VerifyResponse = {
        verified: raw.onChainVerification?.verified ?? raw.localVerification,
        txHash: raw.onChainVerification?.txHash,
        gasUsed: raw.onChainVerification?.gasUsed ? parseInt(raw.onChainVerification.gasUsed) : undefined,
      };
      setData(res);

      // Build shareable verifier URL — only the tx hash.
      // The shared-proof page independently verifies the tx on Base Sepolia.
      if (res.txHash) {
        const url = `${window.location.origin}/shared-proof?tx=${res.txHash}`;
        setShareUrl(url);
        saveState("verification", { txHash: res.txHash, verified: res.verified });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  if (missingPrev) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-400">
          Complete previous steps first.{" "}
          <Link href="/prove" className="underline cursor-pointer hover:text-amber-300 transition-colors duration-200">
            Go to Step 4
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Step label */}
      <div className="text-xs text-[#94A3B8] font-mono mb-1 tracking-widest uppercase">
        Step 5 of 5
      </div>
      <h1 className="text-3xl font-bold mb-2 text-white">On-Chain Verification</h1>
      <p className="text-[#94A3B8] mb-6">
        Submit the zero-knowledge proof to the on-chain verifier contract for cryptographic verification.
      </p>

      {/* Context callout */}
      <div className="bg-violet-500/[0.08] border border-violet-500/20 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-violet-400 text-xs font-bold">i</span>
          </div>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            The UltraPlonk proof is submitted to a Solidity verifier contract
            deployed on Base Sepolia. The contract checks the proof
            mathematically - no trust required, no personal data revealed.
          </p>
        </div>
      </div>

      {!data && (
        <button
          onClick={handleVerify}
          disabled={loading}
          className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          )}
          {loading ? "Verifying on Base Sepolia..." : "Verify on Base Sepolia"}
        </button>
      )}

      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-5">
          {/* Verification Result */}
          <div
            className={`border rounded-xl p-6 ${
              data.verified
                ? "bg-emerald-500/[0.08] border-emerald-500/25"
                : "bg-red-500/[0.08] border-red-500/25"
            }`}
          >
            <div className="flex items-center gap-4 mb-5">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                  data.verified
                    ? "bg-emerald-400/20 text-emerald-400"
                    : "bg-red-400/20 text-red-400"
                }`}
              >
                {data.verified ? "\u2713" : "\u2717"}
              </div>
              <span
                className={`text-2xl font-bold ${
                  data.verified ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {data.verified ? "Verified" : "Failed"}
              </span>
            </div>

            <div className="text-sm font-mono space-y-2 text-[#94A3B8]">
              {data.txHash && (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span>Tx Hash:</span>
                    <span className="text-emerald-400 break-all text-right max-w-xs">
                      {data.txHash}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Network:</span>
                    <span className="text-white">Base Sepolia Testnet</span>
                  </div>
                </>
              )}
              {data.gasUsed && (
                <div className="flex items-center justify-between gap-4">
                  <span>Gas Used:</span>
                  <span className="text-white">{data.gasUsed.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Privacy Split Panel */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#0F1829] border border-emerald-500/15 rounded-xl p-6">
              <h3 className="text-emerald-400 font-semibold mb-4">
                Insurer Learned
              </h3>
              <ul className="space-y-2.5 text-sm text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Rating exceeds 4.5 stars
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  More than 1,000 completed trips
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Platform type: Rideshare
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Credential issued by valid 3-of-5 committee
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  User is in on-chain anonymity set
                </li>
              </ul>
            </div>
            <div className="bg-[#0F1829] border border-red-500/15 rounded-xl p-6">
              <h3 className="text-red-400 font-semibold mb-4">
                Insurer Did NOT Learn
              </h3>
              <ul className="space-y-2.5 text-sm text-[#94A3B8]">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Exact rating (4.8)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Exact trip count (1,547)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Uber account or username
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Real name or identity
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Which member of the anonymity set they are
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">&#8226;</span>
                  Which signers participated
                </li>
              </ul>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-5">Performance Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-2xl font-bold text-white mb-1">
                  {data.proofGenerationTimeMs || "~800"}
                  <span className="text-sm text-[#94A3B8] ml-1">ms</span>
                </div>
                <div className="text-xs text-[#94A3B8]">
                  Proof Generation
                </div>
              </div>
              <div className="text-center p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-2xl font-bold text-white mb-1">
                  {data.circuitConstraints
                    ? data.circuitConstraints.toLocaleString()
                    : "~2,048"}
                </div>
                <div className="text-xs text-[#94A3B8]">
                  Circuit Constraints
                </div>
              </div>
              <div className="text-center p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-2xl font-bold text-white mb-1">
                  {data.gasCost || "~290K"}
                </div>
                <div className="text-xs text-[#94A3B8]">Gas Cost</div>
              </div>
              <div className="text-center p-4 bg-white/[0.02] rounded-lg border border-white/[0.05]">
                <div className="text-2xl font-bold text-white mb-1">1,024</div>
                <div className="text-xs text-[#94A3B8]">
                  Anonymity Set Size
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            {shareUrl && (
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  setUrlCopied(true);
                  setTimeout(() => setUrlCopied(false), 2000);
                }}
                className="bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium px-5 py-2.5 rounded-xl hover:bg-violet-500/20 transition-colors duration-200 cursor-pointer text-sm"
              >
                {urlCopied ? "Link copied \u2713" : "Share Your Proof"}
              </button>
            )}
            <a
              href="/dashboard"
              className="bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer text-sm inline-block"
            >
              Go to Dashboard &rarr;
            </a>
          </div>

          {/* Back to start */}
          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-[#94A3B8] hover:text-white text-sm transition-colors duration-200 cursor-pointer"
            >
              Back to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
