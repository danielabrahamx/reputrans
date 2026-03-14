import Link from "next/link";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Ambient glow elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber-400/[0.06] blur-[120px]" />
        <div className="absolute top-60 -right-40 w-[400px] h-[400px] rounded-full bg-violet-500/[0.05] blur-[100px]" />
        <div className="absolute top-80 -left-40 w-[350px] h-[350px] rounded-full bg-amber-400/[0.04] blur-[100px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-24">
        {/* Hero */}
        <section className="mb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-full px-4 py-1.5 text-xs font-mono text-amber-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-glow" />
            Shape Rotator Hackathon - Encode Club
          </div>

          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 leading-none">
            REPUTRANS
          </h1>
          <p className="text-2xl md:text-3xl font-light text-[#94A3B8] mb-4 leading-snug">
            Privacy-Preserving Reputation Transfer
          </p>
          <p className="text-base text-[#94A3B8]/70 mb-10 max-w-2xl mx-auto leading-relaxed">
            Your Uber rating is trapped inside Uber. Your Airbnb reviews live
            inside Airbnb. REPUTRANS lets you prove your reputation to lenders
            and insurers - without revealing your identity.
          </p>

          <Link
            href="/register"
            className="inline-block bg-amber-400 text-black font-semibold px-10 py-4 rounded-xl hover:bg-amber-300 transition-colors duration-200 text-lg cursor-pointer shadow-lg shadow-amber-400/20"
          >
            Start Demo
          </Link>
        </section>

        {/* Feature cards */}
        <section className="mb-24">
          <h2 className="text-sm font-mono text-[#94A3B8] tracking-widest uppercase mb-8 text-center">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {/* U2SSO */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6 hover:border-violet-500/30 transition-colors duration-200">
              <div className="w-10 h-10 rounded-lg bg-violet-500/15 flex items-center justify-center mb-4">
                <span className="text-violet-400 font-mono text-sm font-bold">U2</span>
              </div>
              <div className="text-xs font-mono text-violet-400 mb-2 tracking-wider">U2SSO</div>
              <h3 className="text-base font-semibold text-white mb-2">
                Anonymous Self-Credentials
              </h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                Master identity hidden in an anonymity set of 1,024. Unlinkable
                across providers. Sybil-resistant without revealing who you are.
              </p>
            </div>

            {/* Map-to-Curve */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6 hover:border-amber-400/30 transition-colors duration-200">
              <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center mb-4">
                <span className="text-amber-400 font-mono text-sm font-bold">M2C</span>
              </div>
              <div className="text-xs font-mono text-amber-400 mb-2 tracking-wider">Map-to-Curve</div>
              <h3 className="text-base font-semibold text-white mb-2">
                10x Cheaper ZK Proofs
              </h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                30 constraints vs ~7,000 standard. Optimized BN254 hash-to-curve
                for dramatically cheaper on-chain verification.
              </p>
            </div>

            {/* ThetaCrypt */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6 hover:border-emerald-400/30 transition-colors duration-200">
              <div className="w-10 h-10 rounded-lg bg-emerald-400/10 flex items-center justify-center mb-4">
                <span className="text-emerald-400 font-mono text-sm font-bold">TC</span>
              </div>
              <div className="text-xs font-mono text-emerald-400 mb-2 tracking-wider">ThetaCrypt</div>
              <h3 className="text-base font-semibold text-white mb-2">
                Threshold EdDSA (3-of-5)
              </h3>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                No single server can forge or revoke credentials. Real t-of-n
                threshold signing using BN254 + Shamir secret sharing.
              </p>
            </div>
          </div>
        </section>

        {/* Use Case */}
        <section className="mb-24">
          <h2 className="text-sm font-mono text-[#94A3B8] tracking-widest uppercase mb-8 text-center">
            Core Use Case
          </h2>
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/[0.04] rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center text-2xl font-bold text-white/80">
                  U
                </div>
                <div>
                  <div className="font-semibold text-white">Uber Driver</div>
                  <div className="text-sm text-[#94A3B8]">4.9 stars · 500+ trips</div>
                </div>
                <div className="ml-auto flex items-center gap-2 text-xs text-amber-400 font-mono">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  ZK Proof
                </div>
              </div>
              <p className="text-[#94A3B8] leading-relaxed mb-4">
                An Uber driver with 4.9 stars wants cheaper insurance. Currently
                those ratings are siloed inside Uber. With REPUTRANS, the driver
                proves{" "}
                <span className="text-white font-medium">
                  &ldquo;I have 4.9 stars, 500+ trips&rdquo;
                </span>{" "}
                to an insurer -{" "}
                <span className="text-emerald-400 font-medium">
                  without revealing their Uber account, name, or identity
                </span>
                .
              </p>
              <p className="text-[#94A3B8] text-sm leading-relaxed">
                The insurer pre-approves policy terms first. The user then shares
                a ZK proof. The insurer gets only what they need - the user
                keeps everything else.
              </p>
            </div>
          </div>
        </section>

        {/* Research Papers */}
        <section>
          <h2 className="text-sm font-mono text-[#94A3B8] tracking-widest uppercase mb-6 text-center">
            Research Papers
          </h2>
          <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
            <a
              href="https://eprint.iacr.org/2025/618.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer group"
            >
              <div>
                <span className="text-xs font-mono text-violet-400 mr-3">[1]</span>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors duration-200">
                  U2SSO - Universal Unlinkable SSO
                </span>
              </div>
              <span className="text-xs text-[#94A3B8]/40 font-mono hidden sm:block">
                eprint.iacr.org/2025/618
              </span>
            </a>
            <a
              href="https://arxiv.org/pdf/2502.03247"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer group"
            >
              <div>
                <span className="text-xs font-mono text-emerald-400 mr-3">[2]</span>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors duration-200">
                  ThetaCrypt - Threshold Cryptography
                </span>
              </div>
              <span className="text-xs text-[#94A3B8]/40 font-mono hidden sm:block">
                arxiv.org/2502.03247
              </span>
            </a>
            <a
              href="https://eprint.iacr.org/2025/1503.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors duration-200 cursor-pointer group"
            >
              <div>
                <span className="text-xs font-mono text-amber-400 mr-3">[3]</span>
                <span className="text-sm text-white/70 group-hover:text-white transition-colors duration-200">
                  Map-to-Curve - Optimized BN254 Hash
                </span>
              </div>
              <span className="text-xs text-[#94A3B8]/40 font-mono hidden sm:block">
                eprint.iacr.org/2025/1503
              </span>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
