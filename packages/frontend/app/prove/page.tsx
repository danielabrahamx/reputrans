"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, truncate, saveState, loadState } from "../lib/api";

interface ProofResponse {
  proof: string;
  publicInputs: string[];
  nullifierHash: string;
  proofSizeBytes: number;
  generationTimeMs: number;
  proving: string[];
}

// Raw API response from server
interface ProofApiResponse {
  success: boolean;
  proof: {
    data: string;
    publicInputs: string[];
    nullifier: string;
    generationTimeMs: number;
  };
  claim: { platformType: string; minRating: number; minTrips: number };
}

export default function ProvePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ProofResponse | null>(null);
  const [minRating, setMinRating] = useState("4.5");
  const [minTrips, setMinTrips] = useState("1000");
  const [platformType, setPlatformType] = useState("rideshare");
  const missingPrev =
    typeof window !== "undefined" && !loadState("credential");

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch<ProofApiResponse>("/proof/generate", {
        method: "POST",
        body: JSON.stringify({
          minRating: Math.round(parseFloat(minRating) * 10),
          minTrips: parseInt(minTrips),
          platformType: platformType === "rideshare" ? 0 : platformType === "delivery" ? 1 : 2,
        }),
      });
      const res: ProofResponse = {
        proof: raw.proof.data,
        publicInputs: raw.proof.publicInputs,
        nullifierHash: raw.proof.nullifier,
        proofSizeBytes: raw.proof.data.length / 2,
        generationTimeMs: raw.proof.generationTimeMs,
        proving: [
          `Platform type: ${raw.claim.platformType}`,
          `Rating ≥ ${raw.claim.minRating}`,
          `Trips ≥ ${raw.claim.minTrips.toLocaleString()}`,
          "Member of on-chain anonymity set",
        ],
      };
      setData(res);
      // Save only the fields that /proof/verify needs
      saveState("proof", { proof: raw.proof.data, publicInputs: raw.proof.publicInputs });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Proof generation failed");
    } finally {
      setLoading(false);
    }
  }

  if (missingPrev) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-400">
          Complete previous steps first.{" "}
          <Link href="/credential" className="underline cursor-pointer hover:text-amber-300 transition-colors duration-200">
            Go to Step 3
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Step label */}
      <div className="text-xs text-[#94A3B8] font-mono mb-1 tracking-widest uppercase">
        Step 4 of 5
      </div>
      <h1 className="text-3xl font-bold mb-2 text-white">Generate Zero-Knowledge Proof</h1>
      <p className="text-[#94A3B8] mb-6">
        Prove your reputation meets thresholds without revealing exact values.
      </p>

      {/* Context callout */}
      <div className="bg-violet-500/[0.08] border border-violet-500/20 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-violet-400 text-xs font-bold">i</span>
          </div>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            The ZK circuit proves you meet the thresholds without revealing your
            actual rating or trip count. The proof is ~2KB and verifiable
            on-chain. Map-to-Curve reduces circuit constraints from ~7,000 to
            just 30 - 10x cheaper verification.
          </p>
        </div>
      </div>

      {!data && (
        <div className="space-y-5">
          {/* Parameters card */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-white">Proof Parameters</h2>

            <div>
              <label htmlFor="minRating" className="block text-xs font-mono text-[#94A3B8] uppercase tracking-wider mb-2">
                Minimum Rating
              </label>
              <input
                id="minRating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={minRating}
                onChange={(e) => setMinRating(e.target.value)}
                className="bg-[#080C15] border border-white/[0.07] rounded-lg px-4 py-2.5 w-full text-white focus:outline-none focus:border-amber-400/40 transition-colors duration-200"
              />
            </div>

            <div>
              <label htmlFor="minTrips" className="block text-xs font-mono text-[#94A3B8] uppercase tracking-wider mb-2">
                Minimum Trips
              </label>
              <input
                id="minTrips"
                type="number"
                min="0"
                value={minTrips}
                onChange={(e) => setMinTrips(e.target.value)}
                className="bg-[#080C15] border border-white/[0.07] rounded-lg px-4 py-2.5 w-full text-white focus:outline-none focus:border-amber-400/40 transition-colors duration-200"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-[#94A3B8] uppercase tracking-wider mb-2">
                Platform Type
              </label>
              <select
                value={platformType}
                onChange={(e) => setPlatformType(e.target.value)}
                className="bg-[#080C15] border border-white/[0.07] rounded-lg px-4 py-2.5 w-full text-white focus:outline-none focus:border-amber-400/40 transition-colors duration-200 cursor-pointer"
              >
                <option value="rideshare" className="bg-[#080C15]">
                  Rideshare
                </option>
                <option value="delivery" className="bg-[#080C15]">
                  Delivery
                </option>
                <option value="hospitality" className="bg-[#080C15]">
                  Hospitality
                </option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            )}
            {loading ? "Generating Proof..." : "Generate Proof"}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-5">
          {/* Result card */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h2 className="text-base font-semibold text-emerald-400">
                Proof Generated
              </h2>
            </div>

            {/* Proving list */}
            <div className="mb-5 border-b border-white/[0.06] pb-5">
              <h3 className="text-xs font-mono text-[#94A3B8] uppercase tracking-wider mb-3">Proving:</h3>
              <ul className="space-y-2">
                {(data.proving || []).map((item, i) => (
                  <li key={i} className="text-sm text-white/80 flex items-center gap-2">
                    <span className="text-emerald-400 text-base leading-none">&#10003;</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-sm font-mono space-y-3 text-[#94A3B8]">
              <div className="flex items-center justify-between gap-4">
                <span>Generation Time:</span>
                <span className="text-white">{data.generationTimeMs}ms</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Nullifier Hash:</span>
                <span className="text-white">{truncate(data.nullifierHash)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span>Proof Size:</span>
                <span className="text-white">{data.proofSizeBytes} bytes</span>
              </div>
            </div>
          </div>

          <Link
            href="/verify"
            className="inline-block bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
          >
            Next: Verify On-Chain
          </Link>
        </div>
      )}
    </div>
  );
}
