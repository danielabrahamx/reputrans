import { NextResponse } from 'next/server';
import { getState, setState } from '@/app/server-lib/session';
import { getMerkleProof, computeNullifier } from '@/app/server-lib/identity';
import { pedersenHash } from '@/app/server-lib/pedersen';
import { generateProof } from '@/app/server-lib/proof';

// Mark as fluid (60s) for proof generation — Vercel Hobby is limited to 60s
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const state = getState();
    if (!state.identity || !state.credential || state.leafIndex === null) {
      return NextResponse.json(
        { error: 'Complete steps 1-3 first (register, connect, issue credential)' },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      minRating = 45,
      minTrips = 1000,
      platformType = 0,
    } = body;

    // Get Merkle proof for this identity
    const { path, indices, root } = getMerkleProof(state.leafIndex);

    // Compute nullifier matching circuit: pedersen_hash([master_secret, platform_type])
    const nullifier = await computeNullifier(state.identity.secret, platformType);

    // Compute credential_message matching circuit
    const storedRating = BigInt(state.platformData?.rating ?? 48);
    const storedTripCount = BigInt(state.platformData?.tripCount ?? 1547);

    const credentialMessage = await pedersenHash([
      storedRating,
      storedTripCount,
      0n,    // platform_id (Uber)
      state.identity.derivedKey,
    ]);

    const proofInputs = {
      nullifier: nullifier.toString(),
      anonymity_set_root: root.toString(),
      platform_type: platformType.toString(),
      min_rating_threshold: minRating.toString(),
      min_trips_threshold: minTrips.toString(),
      master_secret: state.identity.secret.toString(),
      credential_pub_key_x: state.credential.groupPublicKey.x.toString(),
      credential_pub_key_y: state.credential.groupPublicKey.y.toString(),
      credential_signature_s: state.credential.signature.s.toString(),
      credential_signature_r8_x: state.credential.signature.r.x.toString(),
      credential_signature_r8_y: state.credential.signature.r.y.toString(),
      credential_message: credentialMessage.toString(),
      rating: storedRating.toString(),
      trip_count: storedTripCount.toString(),
      platform_id: '0',
      merkle_path: path.map((p) => p.toString()),
      merkle_indices: indices.map((i) => i.toString()),
      platform_secret: state.identity.platformSecret.toString(),
    };

    const result = await generateProof(proofInputs);
    const proofHex = Buffer.from(result.proof).toString('hex');
    const nullifierHex = '0x' + nullifier.toString(16).padStart(64, '0');

    setState({
      lastProof: {
        proof: proofHex,
        publicInputs: result.publicInputs,
        nullifier: nullifierHex,
        generationTimeMs: result.generationTimeMs,
      },
    });

    return NextResponse.json({
      success: true,
      proof: {
        data: proofHex,
        publicInputs: result.publicInputs,
        nullifier: nullifierHex,
        generationTimeMs: result.generationTimeMs,
      },
      claim: {
        platformType: platformType === 0 ? 'Rideshare' : 'Homeshare',
        minRating: minRating / 10,
        minTrips,
      },
    });
  } catch (error) {
    console.error('Proof generation error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
