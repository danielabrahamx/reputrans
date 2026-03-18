"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch, saveState, loadState } from "../lib/api";

interface PlatformData {
  platform: string;
  rating: number;
  tripCount: number;
  driverSince: string;
}

export default function ConnectPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PlatformData | null>(null);
  const [missingPrev, setMissingPrev] = useState(false);
  const [customRating, setCustomRating] = useState<string>("4.8");
  const [customTrips, setCustomTrips] = useState<string>("1547");

  useEffect(() => {
    const identity = loadState("identity");
    if (!identity) {
      setMissingPrev(true);
      setLoading(false);
      return;
    }

    apiFetch<PlatformData>("/platform/demo-data")
      .then((res) => {
        setData(res);
        saveState("platform", res);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Failed to load platform data");
      })
      .finally(() => setLoading(false));
  }, []);

  if (missingPrev) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-amber-400">
          Complete previous steps first.{" "}
          <Link href="/register" className="underline cursor-pointer hover:text-amber-300 transition-colors duration-200">
            Go to Step 1
          </Link>
        </div>
      </div>
    );
  }

  function renderStars(rating: number) {
    const full = Math.floor(rating);
    const partial = rating - full;
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < full) {
        stars.push(<span key={i} className="text-amber-400 text-xl">★</span>);
      } else if (i === full && partial > 0) {
        stars.push(<span key={i} className="text-amber-400/50 text-xl">★</span>);
      } else {
        stars.push(<span key={i} className="text-white/20 text-xl">★</span>);
      }
    }
    return stars;
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Step label */}
      <div className="text-xs text-[#94A3B8] font-mono mb-1 tracking-widest uppercase">
        Step 2 of 5
      </div>
      <h1 className="text-3xl font-bold mb-2 text-white">Your Uber Work History</h1>
      <p className="text-[#94A3B8] mb-6">
        This is the reputation data you&apos;ve built up on Uber. In the next step, an independent committee will certify it - so you can prove it to anyone, without ever revealing your identity.
      </p>

      {/* Context callout */}
      <div className="bg-violet-500/[0.08] border border-violet-500/20 rounded-xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-violet-400 text-xs font-bold">i</span>
          </div>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            In production, your platform data would be fetched inside a tamper-proof
            secure enclave (Intel TDX/SGX) - meaning the data can&apos;t be tampered with
            before it&apos;s certified. For this demo, we use representative values.
            The architecture is identical.
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-3 text-[#94A3B8]">
          <div className="w-5 h-5 border-2 border-white/20 border-t-amber-400 rounded-full animate-spin" />
          Loading your platform data...
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-5">
          {/* Platform card */}
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white/[0.06] rounded-xl flex items-center justify-center text-lg font-bold text-white">
                U
              </div>
              <div>
                <div className="font-semibold text-lg text-white">{data.platform}</div>
                <div className="text-[#94A3B8] text-sm">
                  Driver since {data.driverSince.slice(0, 4)}
                </div>
              </div>
              <div className="ml-auto">
                <span className="text-xs font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-3 py-1">
                  Demo data
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 border-t border-white/[0.06] pt-6">
              <div>
                <div className="text-[#94A3B8] text-xs font-mono uppercase tracking-wider mb-2">Rating</div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-white">{data.rating}</span>
                  <div className="flex">{renderStars(data.rating)}</div>
                </div>
              </div>
              <div>
                <div className="text-[#94A3B8] text-xs font-mono uppercase tracking-wider mb-2">Total Trips</div>
                <div className="text-3xl font-bold text-white">
                  {data.tripCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* What happens next */}
          <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-emerald-400 text-xs">→</span>
              </div>
              <div>
                <p className="text-sm text-white font-medium mb-1">Next: Get this certified</p>
                <p className="text-sm text-[#94A3B8] leading-relaxed">
                  An independent committee of 5 validators will verify this data and sign off on it.
                  This certified credential is what you&apos;ll use to prove your reputation - without
                  anyone ever finding out it&apos;s you.
                </p>
              </div>
            </div>
          </div>

          {/* Editable thresholds for demo — these become the credential */}
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
            <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-4">
              Adjust values for demo
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Rating (e.g. 4.8)</label>
                <input
                  type="number"
                  min="1.0"
                  max="5.0"
                  step="0.1"
                  value={customRating}
                  onChange={(e) => setCustomRating(e.target.value)}
                  className="w-full bg-[#0F1829] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] block mb-1">Trip count</label>
                <input
                  type="number"
                  min="1"
                  max="99999"
                  step="1"
                  value={customTrips}
                  onChange={(e) => setCustomTrips(e.target.value)}
                  className="w-full bg-[#0F1829] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50"
                />
              </div>
            </div>
            <p className="text-xs text-[#94A3B8] mt-3 leading-relaxed">
              These will be certified by the threshold committee. The ZK proof will prove you meet the minimum thresholds — not the exact values.
            </p>
          </div>

          <button
            onClick={() => {
              const ratingInt = Math.round(parseFloat(customRating) * 10);
              const tripInt = parseInt(customTrips, 10);
              saveState('customStats', { rating: ratingInt, tripCount: tripInt });
              window.location.href = '/credential';
            }}
            className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
          >
            Next: Certify This Data
          </button>
        </div>
      )}
    </div>
  );
}
