# REPUTRANS

**Your reputation shouldn't be trapped inside Uber.**

An Uber driver with a 4.8-star rating and 1,547 trips has built something real - but the moment they leave Uber, apply for a loan, or try to get cheaper insurance, that history is invisible. They start from zero.

REPUTRANS lets gig workers **port their reputation anywhere, without revealing who they are**.

---

## The Demo

A driver proves to an insurer: *"I am a verified rideshare driver. My rating exceeds 4.5 stars. I have completed more than 1,000 trips."*

The insurer learns exactly that - and nothing else. Not which platform. Not the exact rating. Not the driver's name, account, or identity.

This is not a privacy policy. It's mathematics.

---

## How It Works (Plain English)

The journey has 5 steps:

**1. Create your anonymous identity**
You get a cryptographic master key. A commitment to this key is registered in an on-chain anonymity set - proving you exist, without revealing who you are.

**2. Connect your platform data**
Your Uber stats are fetched: rating, trip count, platform. In production this happens inside a tamper-proof secure enclave so the data can't be manipulated. For this demo we use representative values.

**3. Get it certified by an independent committee**
Five independent validators verify your data and sign it - but at least 3 must agree before the credential is issued. No single authority (not even Uber) can forge or revoke your credential alone. This is the **trust layer**.

**4. Generate a zero-knowledge proof**
You prove all of the following *without revealing the underlying data*:
- You are in the on-chain anonymity set (you exist and are registered)
- Your credential was signed by the committee (it's real)
- Your rating exceeds the minimum threshold (but not what it actually is)
- Your trip count exceeds the minimum threshold (but not the exact number)
- A unique nullifier derived from your identity (prevents double-use)

The proof takes ~14 seconds to generate and is ~2,144 bytes.

**5. Verify on-chain**
The proof is submitted to a Solidity verifier contract. The contract checks the mathematics - no trust required, no personal data revealed. The insurer gets a cryptographic guarantee.

---

## What Makes This Technically Novel

This project implements three research papers from 2025, combined into a single working system.

### [U2SSO - Anonymous Self-Credentials](https://eprint.iacr.org/2025/618.pdf)

The identity layer. Fully implemented in the Noir circuit (`src/main.nr`).

The circuit executes five steps in sequence:

```
1. commitment = Pedersen(master_secret)
   → verify commitment is in the on-chain Merkle tree (membership proof)

2. derived_key = Pedersen(master_secret, platform_secret)
   → platform-specific key, unlinkable across providers

3. attr_hash = Pedersen(rating, trip_count, platform_id, derived_key)
   → verify attr_hash == credential_message (credential binding)

4. assert rating >= min_rating_threshold
   assert trip_count >= min_trips_threshold
   → range proofs: reveal only thresholds, not exact values

5. nullifier = Pedersen(master_secret, platform_type)
   → assert nullifier == public input (Sybil resistance)
```

The nullifier is the key innovation. It's deterministically derived from your identity and platform type - so you can only submit one proof per platform, but the nullifier reveals nothing about who you are.

### [ThetaCrypt - Threshold Signatures](https://arxiv.org/pdf/2502.03247)

The trust layer. Implemented from scratch in TypeScript (`packages/api/src/lib/threshold.ts`, ~700 lines).

The signing protocol runs in two rounds:

```
Key generation:
  master_key → Shamir split into 5 shares (polynomial over Baby Jubjub suborder)
  each share_i → public key point_i = share_i * G

Round 1 (nonce commitment):
  each signer_i: k_i = H(share_i || nonce_seed || message)
                 R_i = k_i * G

Round 2 (signature combination):
  combined R = Σ(λ_i * R_i)   where λ_i = Lagrange coefficients
  h = Poseidon(R.x, R.y, A.x, A.y, message)
  each signer_i: s_i = k_i + h * share_i
  combined S = Σ(λ_i * s_i)

Verification (asserted before returning):
  S * G == R + h * A
```

Any 3 of 5 shares reconstruct a valid signature via Lagrange interpolation. Fewer than 3 is mathematically useless - there is no way to recover the master key or forge a signature.

**Hackathon note:** The in-circuit EdDSA verification (confirming the committee signature inside the ZK proof) was simplified to a credential message hash check due to a Poseidon variant mismatch between `bb.js` and Noir's stdlib. The threshold signing math itself is correct and complete. Full in-circuit verification is the next production step.

### [Map-to-Curve - Efficient ZK](https://eprint.iacr.org/2025/1503.pdf)

The efficiency layer. Implemented as a working Noir library (`src/lib/map_to_curve.nr`).

The standard approach to mapping a hash output to a curve point requires computing a square root inside the ZK circuit - expensive at ~7,000 constraints. The paper's insight: have the prover compute the square root *outside* the circuit as a hint, then only *verify* it inside.

```noir
// Prover finds smallest tweak t where (message * 5 + t)³ + 3 is a perfect square
// Circuit only checks:
let x = message * 5 + tweak        // ~2 constraints
let y_squared = x*x*x + 3          // ~3 constraints
assert(y_hint * y_hint == y_squared) // 1 constraint - verify the hint
return (x, y_hint)                  // valid BN254 curve point
```

Total: ~5 constraints vs ~7,000. The `tweak` is almost always less than 5 (statistically ~50% of x values are quadratic residues on BN254), so the bounded search is cheap.

---

## Privacy Guarantee

| What the insurer learns | What stays private |
|---|---|
| Driver is in a verified anonymity set | Which member of the set they are |
| Platform type: Rideshare | Platform name: Uber |
| Rating ≥ 4.5 stars | Exact rating: 4.8 |
| Trip count ≥ 1,000 | Exact count: 1,547 |
| Credential signed by 3-of-5 committee | Which 3 signers participated |
| Unique nullifier (can't reuse) | Link to any other application |

---

## Tech Stack

| Layer | Technology |
|---|---|
| ZK Circuit | Noir 0.36.0, BN254, UltraPlonk (Barretenberg) |
| On-chain | Solidity (Foundry), local Anvil (Sepolia fork) |
| Threshold signing | TypeScript - Baby Jubjub curve, Shamir secret sharing, EdDSA |
| Proof generation | `@noir-lang/noir_js` + `@noir-lang/backend_barretenberg` |
| Backend | Express.js 5, TypeScript, viem |
| Frontend | Next.js 16, Tailwind CSS |

---

## Running Locally

**Prerequisites:** Node.js 22+, pnpm, Foundry (for Anvil), WSL with Ubuntu (for Nargo 0.36.0)

```bash
# Install dependencies
pnpm install

# Terminal 1 - Start local chain (Sepolia fork)
anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --port 8545

# Terminal 2 - Build and start API
cd packages/api && pnpm build
node dist/server.js   # runs on :3001

# Terminal 3 - Start frontend
cd packages/frontend && pnpm dev   # runs on :3000
```

Then open `http://localhost:3000` and walk through the 5-step flow.

**To verify everything works end-to-end:**
```bash
node scripts/test-e2e-api.mjs   # 25/25 tests
```

---

## Project Structure

```
reputrans/
├── packages/
│   ├── circuits/          # Noir ZK circuit (6 modules: identity, credential, merkle, map_to_curve...)
│   ├── contracts/         # Solidity: U2SSORegistry.sol + UltraPlonk verifier
│   ├── api/               # Express backend: identity, credential, proof endpoints
│   └── frontend/          # Next.js: 5-step user journey
├── scripts/
│   └── test-e2e-api.mjs   # 25-test end-to-end smoke test
└── plan.md                # Full architecture specification
```

---

## Production Roadmap

The demo deliberately leaves two things out - both for practical reasons, not architectural ones:

- **TEE integration:** Platform data should be fetched inside an Intel TDX/SGX enclave so not even the connector can tamper with it. Excluded because it requires actual secure enclave hardware.
- **Real platform API:** Uber doesn't have a public driver statistics API. Demo uses hardcoded representative values. The cryptographic pipeline is identical regardless of data source.

---

**Hackathon:** Shape Rotator Virtual Hackathon - Encode Club
**Track:** Cryptographic Primitives & Identity - Anonymous Self-Credentials & SSO
**Team:** Sibrox (Daniel Abraham, Kirill Slavin)
