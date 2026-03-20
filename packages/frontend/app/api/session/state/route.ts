import { NextResponse } from 'next/server';
import { getState } from '@/app/server-lib/session';

export async function GET() {
  const state = getState();

  return NextResponse.json({
    identity: state.identity
      ? {
          commitment: '0x' + state.identity.commitment.toString(16).padStart(64, '0'),
          leafIndex: state.leafIndex,
          setIndex: null,
          merkleRoot: state.merkleRoot
            ? '0x' + state.merkleRoot.toString(16).padStart(64, '0')
            : null,
        }
      : null,
    credential: state.credential
      ? {
          attributes: {
            rating: state.platformData?.rating ?? 4.8,
            tripCount: state.platformData?.tripCount ?? 1547,
            platform: 'Uber',
          },
          threshold: {
            threshold: 3,
            totalSigners: 5,
          },
        }
      : null,
    proof: state.lastProof ?? null,
  });
}
