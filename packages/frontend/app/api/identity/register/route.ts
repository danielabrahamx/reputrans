import { NextResponse } from 'next/server';
import { createMasterIdentity, registerIdentity } from '@/app/server-lib/identity';
import { getState, setState } from '@/app/server-lib/session';
import { registerOnChain } from '@/app/server-lib/ethereum';

export async function POST() {
  try {
    // Create master identity (U2SSO) — Pedersen commitment
    const identity = await createMasterIdentity();

    // Register in anonymity set (builds Pedersen Merkle tree)
    const { leafIndex, merkleRoot, setIndex } = await registerIdentity(identity);

    setState({ identity, leafIndex, merkleRoot });

    // Try on-chain registration (non-blocking if contracts not deployed)
    let txHash: string | null = null;
    let gasUsed: bigint | null = null;
    try {
      const onChain = await registerOnChain(identity.commitment, merkleRoot);
      txHash = onChain.txHash;
      gasUsed = onChain.gasUsed;
    } catch {
      // On-chain registration skipped — contracts may not be deployed
    }

    return NextResponse.json({
      success: true,
      identity: {
        commitment: '0x' + identity.commitment.toString(16).padStart(64, '0'),
        leafIndex,
        setIndex,
        merkleRoot: '0x' + merkleRoot.toString(16).padStart(64, '0'),
      },
      masterSecret: '0x' + identity.secret.toString(16).padStart(64, '0'),
      onChain: txHash ? { txHash, gasUsed: gasUsed?.toString() } : null,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
