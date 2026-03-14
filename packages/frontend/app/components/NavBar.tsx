"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const steps = [
  { href: "/register", label: "Register" },
  { href: "/connect", label: "Connect" },
  { href: "/credential", label: "Credential" },
  { href: "/prove", label: "Prove" },
  { href: "/verify", label: "Verify" },
];

const stepPaths = steps.map((s) => s.href);

export default function NavBar() {
  const pathname = usePathname();
  const currentIndex = stepPaths.indexOf(pathname);
  const isStepPage = currentIndex !== -1;

  // Progress bar fill: 0% at step 1, 25% at step 2, ..., 100% at step 5
  const progressPercent = isStepPage ? (currentIndex / (steps.length - 1)) * 100 : 0;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080C15]/95 backdrop-blur border-b border-white/[0.07]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="text-base font-bold tracking-widest text-white cursor-pointer transition-colors duration-200 hover:text-amber-400">
          REPUTRANS
        </Link>

        {isStepPage ? (
          /* Step progress indicator */
          <div className="flex items-center gap-0">
            {steps.map((step, i) => {
              const isPast = i < currentIndex;
              const isCurrent = i === currentIndex;
              const isFuture = i > currentIndex;

              return (
                <div key={step.href} className="flex items-center">
                  {/* Connector line (not before first step) */}
                  {i > 0 && (
                    <div
                      className={`h-px w-6 md:w-10 ${
                        isPast || isCurrent ? "bg-amber-400/60" : "bg-white/10"
                      }`}
                    />
                  )}
                  <Link
                    href={step.href}
                    className="flex flex-col items-center gap-1 cursor-pointer"
                  >
                    {/* Numbered circle */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border transition-colors duration-200 ${
                        isCurrent
                          ? "bg-amber-400 border-amber-400 text-black"
                          : isPast
                          ? "bg-amber-400/20 border-amber-400/50 text-amber-400"
                          : "bg-white/5 border-white/15 text-white/25"
                      }`}
                    >
                      {i + 1}
                    </div>
                    {/* Step name - only show on medium+ screens */}
                    <span
                      className={`hidden md:block text-[10px] font-medium transition-colors duration-200 ${
                        isCurrent
                          ? "text-amber-400"
                          : isPast
                          ? "text-amber-400/60"
                          : isFuture
                          ? "text-white/20"
                          : "text-white/40"
                      }`}
                    >
                      {step.label}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          /* Home page: just a subtle tagline */
          <span className="text-xs text-[#94A3B8] tracking-wider font-mono hidden sm:block">
            ZK Reputation Portability
          </span>
        )}
      </div>

      {/* Progress bar - only on step pages */}
      {isStepPage && (
        <div className="h-[2px] bg-white/5">
          <div
            className="h-full bg-amber-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
    </nav>
  );
}
