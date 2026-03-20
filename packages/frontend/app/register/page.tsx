"use client";

import { useState } from "react";
import Link from "next/link";
import { apiFetch, truncate, saveState } from "../lib/api";

interface RegisterApiResponse {
  success: boolean;
  masterSecret?: string;
  derivedKey?: string;
  platformSecret?: string;
  merkleProof?: { path: string[]; indices: number[]; root: string };
  identity: {
    commitment: string;
    leafIndex: number;
    merkleRoot: string;
    setIndex: number;
  };
  onChain: { txHash: string; gasUsed: string } | null;
}

interface RegisterResponse {
  identityCommitment: string;
  leafIndex: number;
  merkleRoot: string;
  setIndex: number;
  txHash?: string;
  masterSecret?: string;
  derivedKey?: string;
  platformSecret?: string;
  merkleProof?: { path: string[]; indices: number[]; root: string };
}

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RegisterResponse | null>(null);
  const [keySaved, setKeySaved] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRegister() {
    setLoading(true);
    setError(null);
    try {
      const raw = await apiFetch<RegisterApiResponse>("/identity/register", {
        method: "POST",
      });
      const res: RegisterResponse = {
        identityCommitment: raw.identity.commitment,
        leafIndex: raw.identity.leafIndex,
        merkleRoot: raw.identity.merkleRoot,
        setIndex: raw.identity.setIndex,
        txHash: raw.onChain?.txHash,
        masterSecret: raw.masterSecret,
        derivedKey: raw.derivedKey,
        platformSecret: raw.platformSecret,
        merkleProof: raw.merkleProof,
      };
      setData(res);
      saveState("identity", res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Step label */}
      <div className="text-xs text-[#94A3B8] font-mono mb-1 tracking-widest uppercase">
        Step 1 of 5
      </div>
      <h1 className="text-3xl font-bold mb-2 text-white">Create Master Identity</h1>
      <p className="text-[#94A3B8] mb-6">
        Register your identity commitment into the on-chain anonymity set.
      </p>

      {/* Context callout */}
      <div className="bg-violet-500/[0.08] border border-violet-500/20 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-violet-400 text-xs font-bold">i</span>
          </div>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            You are creating a cryptographic master identity - a random secret
            and its hash. Only the hash goes on-chain, hidden in an anonymity
            set of 1,024. Your secret never leaves your device.
          </p>
        </div>
      </div>

      {!data && (
        <button
          onClick={handleRegister}
          disabled={loading}
          className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
          )}
          {loading ? "Registering..." : "Register"}
        </button>
      )}

      {error && (
        <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="mt-8 space-y-5">
          {/* Result card */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
              <h2 className="text-base font-semibold text-emerald-400">
                Identity Registered
              </h2>
            </div>
            <div className="space-y-3 text-sm font-mono border-t border-white/[0.06] pt-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#94A3B8]">Commitment:</span>
                <span className="text-white">{truncate(data.identityCommitment)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#94A3B8]">Leaf Index:</span>
                <span className="text-white">{data.leafIndex}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#94A3B8]">Merkle Root:</span>
                <span className="text-white">{truncate(data.merkleRoot)}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-[#94A3B8]">Set Index:</span>
                <span className="text-white">{data.setIndex}</span>
              </div>
              {data.txHash && (
                <>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#94A3B8]">Tx Hash:</span>
                    <span className="text-emerald-400">{truncate(data.txHash)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#94A3B8]">Network:</span>
                    <span className="text-white">Local Anvil (Sepolia fork)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Master key — shown once, copy to save */}
          {data.masterSecret && (
            <div className="bg-amber-500/[0.08] border border-amber-500/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-400 text-lg">&#128273;</span>
                <h2 className="text-base font-semibold text-amber-400">Your Master Key</h2>
                <span className="ml-auto text-xs text-[#94A3B8] bg-white/[0.05] px-2 py-0.5 rounded">
                  Shown once
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">
                This key is your identity. Save it somewhere safe — it cannot be recovered if lost.
              </p>
              <div className="bg-[#080C15] border border-white/[0.08] rounded-lg p-3 mb-3 font-mono text-xs text-white/70 break-all">
                {data.masterSecret}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(data.masterSecret!);
                  setCopied(true);
                  setKeySaved(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm font-medium py-2 rounded-lg hover:bg-amber-400/20 transition-colors duration-200 cursor-pointer"
              >
                {copied ? "Copied \u2713" : "Copy Key"}
              </button>
            </div>
          )}

          {/* Privacy note */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-4 text-sm text-[#94A3B8] flex items-start gap-3">
            <span className="text-amber-400 mt-0.5">&#9679;</span>
            Your master secret stays on your device. Only a cryptographic
            commitment (hash) goes on-chain, hidden in an anonymity set of
            1,024 members.
          </div>

          {keySaved && (
            <Link
              href="/connect"
              className="inline-block bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
            >
              Next: Connect Platform
            </Link>
          )}
          {!keySaved && data && (
            <p className="text-xs text-[#94A3B8]">Copy your key above to continue.</p>
          )}
        </div>
      )}
    </div>
  );
}
