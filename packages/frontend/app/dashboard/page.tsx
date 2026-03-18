"use client";

import { useEffect, useState } from "react";
import { apiFetch, loadState, clearAllState } from "../lib/api";

interface VerificationData {
  txHash: string;
  verified: boolean;
}

interface SessionState {
  identity: {
    commitment: string;
    leafIndex: number | null;
    setIndex: number | null;
    merkleRoot: string | null;
  } | null;
  credential: {
    attributes: { rating: number; tripCount: number; platform: string } | null;
    threshold: { threshold: number; totalSigners: number } | null;
  } | null;
  proof: {
    nullifier: string;
    generationTimeMs: number;
    proofSizeBytes: number;
  } | null;
}

function truncate(hex: string, chars = 8): string {
  if (!hex || hex.length <= chars * 2 + 5) return hex;
  return hex.slice(0, chars + 2) + '...' + hex.slice(-6);
}

export default function DashboardPage() {
  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [verification, setVerification] = useState<VerificationData | null>(null);

  // Merge server state with sessionStorage snapshots.
  // GET /session/state returns setIndex: null and merkleRoot: null (Stream D omits them
  // since they're not stored as module-level vars on the server). The registration response
  // does include them, and they're saved to sessionStorage via saveState('identity', ...) in
  // register/page.tsx. We merge them here so the dashboard can display them.
  useEffect(() => {
    apiFetch<SessionState>('/session/state')
      .then((serverState) => {
        const storedIdentity = loadState('identity') as any;
        if (serverState.identity && storedIdentity) {
          // Override nulls from server with sessionStorage values from registration
          serverState.identity.setIndex = storedIdentity.setIndex ?? serverState.identity.setIndex ?? null;
          serverState.identity.merkleRoot = storedIdentity.merkleRoot ?? serverState.identity.merkleRoot ?? null;
        }
        setState(serverState);
      })
      .catch(() => setState(null))
      .finally(() => setLoading(false));

    const v = loadState<VerificationData>('verification');
    if (v) setVerification(v);
  }, []);

  async function handleReset() {
    setResetting(true);
    try {
      await apiFetch('/admin/reset', { method: 'POST' });
    } catch {
      // Best-effort — clear frontend state regardless
    }
    clearAllState();
    window.location.href = '/register';
  }

  const isEmpty = !state?.identity && !state?.credential && !state?.proof;

  return (
    <div className="min-h-screen bg-[#080C15] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080C15]/95 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-base font-bold tracking-widest text-white hover:text-amber-400 transition-colors duration-200">
            REPUTRANS
          </a>
          <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.05] px-3 py-1 rounded-full border border-white/[0.08]">
            Dashboard
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        <div className="text-xs text-[#94A3B8] font-mono mb-1 tracking-widest uppercase">
          Your identity
        </div>
        <h1 className="text-3xl font-bold mb-8 text-white">Dashboard</h1>

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#94A3B8] text-sm">Loading your identity...</p>
          </div>
        )}

        {!loading && isEmpty && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-8 text-center">
            <p className="text-[#94A3B8] mb-5">No active identity found.</p>
            <a
              href="/register"
              className="inline-block bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
            >
              Start your journey
            </a>
          </div>
        )}

        {!loading && !isEmpty && (
          <div className="space-y-5">

            {/* Identity card */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider font-mono">Identity</h2>
              </div>
              {state?.identity ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Commitment</span>
                    <span className="text-white">{truncate(state.identity.commitment)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Leaf index</span>
                    <span className="text-white">{state.identity.leafIndex ?? '—'}</span>
                  </div>
                  {state.identity.setIndex !== null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#94A3B8]">Set index</span>
                      <span className="text-white">{state.identity.setIndex}</span>
                    </div>
                  )}
                  {state.identity.merkleRoot && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#94A3B8]">Merkle root</span>
                      <span className="text-white">{truncate(state.identity.merkleRoot)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">
                  Not registered.{' '}
                  <a href="/register" className="text-amber-400 underline">Register</a>
                </p>
              )}
            </div>

            {/* Credential card */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${state?.credential ? 'bg-violet-400' : 'bg-white/20'}`} />
                <h2 className={`text-sm font-semibold uppercase tracking-wider font-mono ${state?.credential ? 'text-violet-400' : 'text-white/30'}`}>
                  Credential
                </h2>
              </div>
              {state?.credential?.attributes ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Platform</span>
                    <span className="text-white">{state.credential.attributes.platform} (Rideshare)</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Rating</span>
                    <span className="text-white">{(state.credential.attributes.rating / 10).toFixed(1)}★</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Trip count</span>
                    <span className="text-white">{state.credential.attributes.tripCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Signed by</span>
                    <span className="text-white">{state.credential.threshold?.threshold}-of-{state.credential.threshold?.totalSigners} committee</span>
                  </div>
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">
                  Not yet issued.{' '}
                  {state?.identity && <a href="/credential" className="text-amber-400 underline">Issue credential</a>}
                </p>
              )}
            </div>

            {/* Proof card */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${state?.proof ? 'bg-amber-400' : 'bg-white/20'}`} />
                <h2 className={`text-sm font-semibold uppercase tracking-wider font-mono ${state?.proof ? 'text-amber-400' : 'text-white/30'}`}>
                  ZK Proof
                </h2>
              </div>
              {state?.proof ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Nullifier</span>
                    <span className="text-white">{truncate(state.proof.nullifier)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Generation time</span>
                    <span className="text-white">{(state.proof.generationTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Proof size</span>
                    <span className="text-white">{state.proof.proofSizeBytes.toLocaleString()} bytes</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Status</span>
                    <span className="text-emerald-400">Verified on-chain</span>
                  </div>
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">
                  Not yet generated.{' '}
                  {state?.credential && <a href="/prove" className="text-amber-400 underline">Generate proof</a>}
                </p>
              )}
            </div>

            {/* Share proof link */}
            {verification && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    const params = new URLSearchParams({
                      tx: verification.txHash,
                      verified: String(verification.verified),
                    });
                    const url = `${window.location.origin}/shared-proof?${params.toString()}`;
                    navigator.clipboard.writeText(url);
                    setShareCopied(true);
                    setTimeout(() => setShareCopied(false), 2000);
                  }}
                  className="bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium px-5 py-2.5 rounded-xl hover:bg-violet-500/20 transition-colors duration-200 cursor-pointer text-sm"
                >
                  {shareCopied ? 'Link copied!' : 'Share Your Proof'}
                </button>
              </div>
            )}

            {/* Demo reset */}
            <div className="pt-4 border-t border-white/[0.06]">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-xs text-[#94A3B8] hover:text-red-400 transition-colors duration-200 cursor-pointer disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Reset demo → start fresh'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
