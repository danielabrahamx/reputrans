"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, saveState, loadState } from "../lib/api";

interface Signer {
  index: number;
  signed: boolean;
}

interface CredentialResponse {
  signature: {
    R: { x: string; y: string };
    S: string;
  };
  groupPublicKey: { x: string; y: string };
  signers: Signer[];
  threshold: string;
}

// Raw API response shape from server
interface CredentialApiResponse {
  success: boolean;
  credential: {
    signature: { r: { x: string; y: string }; s: string };
    groupPublicKey: { x: string; y: string };
    attributes: { rating: number; tripCount: number; platform: string };
  };
  threshold: { threshold: number; totalSigners: number; signerIndices: number[] };
}

export default function CredentialPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CredentialResponse | null>(null);
  const [showTechnical, setShowTechnical] = useState(false);
  const missingPrev = typeof window !== "undefined" && !loadState("platform");

  async function handleIssue() {
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch<CredentialApiResponse>("/credential/issue", {
        method: "POST",
      });
      const res: CredentialResponse = {
        signature: {
          R: { x: raw.credential.signature.r.x, y: raw.credential.signature.r.y },
          S: raw.credential.signature.s,
        },
        groupPublicKey: raw.credential.groupPublicKey,
        signers: raw.threshold.signerIndices.map((idx, i) => ({
          index: idx,
          signed: i < raw.threshold.threshold,
        })),
        threshold: `${raw.threshold.threshold}-of-${raw.threshold.totalSigners}`,
      };
      setData(res);
      saveState("credential", res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Credential issuance failed");
    } finally {
      setLoading(false);
    }
  }

  if (missingPrev) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-400">
          Complete previous steps first.{" "}
          <Link href="/connect" className="underline cursor-pointer hover:text-amber-300 transition-colors duration-200">
            Go to Step 2
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Step label */}
      <div className="text-xs text-[#94A3B8] font-mono mb-1 tracking-widest uppercase">
        Step 3 of 5
      </div>
      <h1 className="text-3xl font-bold mb-2 text-white">
        Certify Your Work History
      </h1>
      <p className="text-[#94A3B8] mb-6">
        An independent committee reviews your Uber data and signs off on it. This
        certified credential is what proves your reputation - to anyone, anywhere -
        without revealing who you are.
      </p>

      {/* Context callout */}
      <div className="bg-violet-500/[0.08] border border-violet-500/20 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-violet-400 text-xs font-bold">i</span>
          </div>
          <div className="text-sm text-[#94A3B8] leading-relaxed space-y-2">
            <p>
              The committee has <strong className="text-white/80">5 independent validators</strong>.
              At least 3 must agree before your credential is issued - so no single
              validator (not even Uber) can fake or revoke it on their own.
            </p>
            <p>
              In production, each validator runs inside a tamper-proof secure enclave
              (Intel TDX/SGX), so even the validators themselves cannot see your raw data.
            </p>
          </div>
        </div>
      </div>

      {!data && (
        <button
          onClick={handleIssue}
          disabled={loading}
          className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          )}
          {loading ? "Requesting certification..." : "Request Certification"}
        </button>
      )}

      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-5">
          {/* What was certified */}
          <div className="bg-emerald-500/[0.08] border border-emerald-500/25 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 text-lg font-bold">
                ✓
              </div>
              <div>
                <div className="text-emerald-400 font-semibold text-lg">Credential Issued</div>
                <div className="text-[#94A3B8] text-sm">Your Uber work history is now certified</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-emerald-500/15 pt-5">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">4.8★</div>
                <div className="text-xs text-[#94A3B8]">Driver Rating</div>
              </div>
              <div className="text-center border-x border-white/[0.06]">
                <div className="text-2xl font-bold text-white mb-1">1,547</div>
                <div className="text-xs text-[#94A3B8]">Completed Trips</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">Uber</div>
                <div className="text-xs text-[#94A3B8]">Platform</div>
              </div>
            </div>
          </div>

          {/* Signing Committee Panel */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-2">Who signed</h2>
            <p className="text-sm text-[#94A3B8] mb-5">
              3 of 5 validators agreed. The other 2 weren&apos;t needed - and none of them know your identity.
            </p>
            <div className="flex items-center gap-4">
              {(data.signers || []).map((signer) => (
                <div key={signer.index} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors duration-200 ${
                      signer.signed
                        ? "bg-emerald-500/20 border-emerald-500/60 text-emerald-400"
                        : "bg-white/[0.03] border-white/10 text-white/25"
                    }`}
                  >
                    {signer.signed ? "✓" : "·"}
                  </div>
                  <span className={`text-xs font-mono ${signer.signed ? "text-emerald-400" : "text-white/25"}`}>
                    {signer.signed ? "Signed" : "Not needed"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Technical details - collapsed by default */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl overflow-hidden">
            <button
              onClick={() => setShowTechnical(!showTechnical)}
              className="w-full flex items-center justify-between px-6 py-4 text-sm text-[#94A3B8] hover:text-white transition-colors duration-200 cursor-pointer"
            >
              <span>Technical details (cryptographic signature)</span>
              <span className="font-mono text-xs">{showTechnical ? "▲ hide" : "▼ show"}</span>
            </button>
            {showTechnical && (
              <div className="px-6 pb-5 space-y-3 border-t border-white/[0.06] pt-4">
                <p className="text-xs text-[#94A3B8] mb-3">
                  EdDSA signature on Baby Jubjub (BN254 embedded curve). Uses real
                  threshold signing - 3-of-5 Shamir secret sharing with Lagrange
                  interpolation. Verified inside the ZK circuit in Step 4.
                </p>
                <div className="text-xs font-mono space-y-2 text-[#94A3B8]">
                  <div className="flex items-center justify-between gap-4">
                    <span>Signature R.x:</span>
                    <span className="text-white/60">{data.signature.R.x.slice(0, 20)}…</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Signature S:</span>
                    <span className="text-white/60">{data.signature.S.slice(0, 20)}…</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Group public key:</span>
                    <span className="text-white/60">{data.groupPublicKey.x.slice(0, 20)}…</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Link
            href="/prove"
            className="inline-block bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
          >
            Next: Generate Zero-Knowledge Proof
          </Link>
        </div>
      )}
    </div>
  );
}
