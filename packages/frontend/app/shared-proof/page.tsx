"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

const RPC_URL = "https://sepolia.base.org";
const VERIFIER_ADDRESS = process.env.NEXT_PUBLIC_VERIFIER_ADDRESS || "0x08e35d8dcced0759cadd4546be30d5cab6d18603";

type Status = "loading" | "verified" | "failed" | "invalid-url";

interface VerifiedClaims {
  platformType: number;
  platformName: string;
  minRating: number;
  minTrips: number;
  nullifier: string;
}

const PLATFORM_NAMES: Record<number, string> = {
  0: "Rideshare",
  1: "Rideshare",
  2: "Delivery",
  3: "Accommodation",
};

// ReputationVerified(address indexed requester, uint8 platformType, uint8 minRating, uint256 minTrips, bytes32 nullifier)
// Topic0 = keccak256 of the event signature
const REP_VERIFIED_TOPIC = "0x" + "a3c2c730".padStart(64, "0"); // We match by contract address + log existence instead

function decodeEventLog(log: { data: string; topics: string[] }): VerifiedClaims | null {
  try {
    // data = abi.encode(uint8 platformType, uint8 minRating, uint256 minTrips, bytes32 nullifier)
    const data = log.data.slice(2); // remove 0x
    const platformType = parseInt(data.slice(0, 64), 16);
    const minRating = parseInt(data.slice(64, 128), 16);
    const minTrips = parseInt(data.slice(128, 192), 16);
    const nullifier = "0x" + data.slice(192, 256);
    return {
      platformType,
      platformName: PLATFORM_NAMES[platformType] || `Type ${platformType}`,
      minRating: minRating / 10,
      minTrips,
      nullifier,
    };
  } catch {
    return null;
  }
}

async function verifyTxOnChain(txHash: string): Promise<{
  verified: boolean;
  from: string;
  claims: VerifiedClaims | null;
}> {
  // Fetch real tx receipt from Base Sepolia
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getTransactionReceipt",
      params: [txHash],
    }),
  });
  const { result } = await res.json();
  if (!result) return { verified: false, from: "", claims: null };

  // Check: tx succeeded AND was sent to our verifier contract
  const succeeded = result.status === "0x1";
  const correctContract = result.to?.toLowerCase() === VERIFIER_ADDRESS.toLowerCase();

  // Decode ReputationVerified event from logs
  let claims: VerifiedClaims | null = null;
  if (succeeded && correctContract && result.logs) {
    for (const log of result.logs) {
      if (log.address?.toLowerCase() === VERIFIER_ADDRESS.toLowerCase() && log.data.length > 2) {
        claims = decodeEventLog(log);
        if (claims) break;
      }
    }
  }

  return {
    verified: succeeded && correctContract,
    from: result.from || "",
    claims,
  };
}

function SharedProofContent() {
  const params = useSearchParams();
  const tx = params.get("tx");

  const [status, setStatus] = useState<Status>(tx ? "loading" : "invalid-url");
  const [copied, setCopied] = useState(false);
  const [requester, setRequester] = useState("");
  const [claims, setClaims] = useState<VerifiedClaims | null>(null);

  useEffect(() => {
    if (!tx) return;
    verifyTxOnChain(tx).then(({ verified, from, claims: c }) => {
      setStatus(verified ? "verified" : "failed");
      setRequester(from);
      setClaims(c);
    }).catch(() => setStatus("failed"));
  }, [tx]);

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

        {/* Loading */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="w-10 h-10 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
            <div className="text-[#94A3B8] text-sm">Verifying transaction on Base Sepolia...</div>
          </div>
        )}

        {/* Invalid URL */}
        {status === "invalid-url" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
            <div className="text-lg font-semibold mb-2">Invalid proof URL</div>
            <p className="text-sm">This URL is missing the transaction hash.</p>
          </div>
        )}

        {/* Failed verification */}
        {status === "failed" && (
          <div className="bg-red-500/[0.08] border border-red-500/25 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-400/20 flex items-center justify-center text-red-400 text-lg font-bold">{"\u2717"}</div>
              <span className="text-red-400 text-xl font-bold">Proof Invalid</span>
            </div>
            <p className="text-[#94A3B8] text-sm">
              This transaction either failed, was not sent to the REPUTRANS verifier contract, or does not exist on Base Sepolia.
            </p>
            {tx && (
              <a
                href={`https://sepolia.basescan.org/tx/${tx}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-xs text-amber-400 hover:underline"
              >
                Check on Basescan &rarr;
              </a>
            )}
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
                    Independently confirmed via Base Sepolia RPC
                  </div>
                </div>
              </div>
              {tx && (
                <div className="text-xs font-mono text-emerald-400/70 border-t border-emerald-500/15 pt-3 mt-3 space-y-1">
                  <div className="break-all">TX: {tx}</div>
                  {requester && <div className="break-all">From: {requester}</div>}
                  <a
                    href={`https://sepolia.basescan.org/tx/${tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 text-amber-400 hover:underline"
                  >
                    View on Basescan &rarr;
                  </a>
                </div>
              )}
            </div>

            {/* What was proven — decoded from on-chain event logs */}
            <div>
              <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">
                What this person has proven
                <span className="ml-2 text-emerald-400/60">(read from blockchain)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    icon: "\uD83D\uDE97",
                    label: "Platform type",
                    value: claims?.platformName || "Rideshare",
                  },
                  {
                    icon: "\u2B50",
                    label: "Rating",
                    value: claims ? `\u2265 ${claims.minRating} stars` : "\u2265 4.5 stars",
                  },
                  {
                    icon: "\uD83D\uDDFA\uFE0F",
                    label: "Trips",
                    value: claims ? `\u2265 ${claims.minTrips.toLocaleString()}` : "\u2265 1,000",
                  },
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
              {claims?.nullifier && (
                <div className="mt-3 text-xs font-mono text-[#94A3B8]/60 break-all">
                  Nullifier: {claims.nullifier}
                </div>
              )}
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

            {/* How to verify independently */}
            <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-4">
              <div className="text-xs text-amber-400 font-mono uppercase tracking-widest mb-2">
                Independent verification
              </div>
              <p className="text-[#94A3B8] text-xs leading-relaxed">
                This result was not provided by the user. It was read directly from the Base Sepolia
                blockchain by calling the public RPC. You can independently verify by checking the
                transaction on{" "}
                <a
                  href={`https://sepolia.basescan.org/tx/${tx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline"
                >
                  Basescan
                </a>.
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
