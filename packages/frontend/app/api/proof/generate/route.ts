import { NextResponse } from 'next/server';
import { computeNullifier } from '@/app/server-lib/identity';
import { pedersenHash } from '@/app/server-lib/pedersen';
import { generateProof } from '@/app/server-lib/proof';

// Mark as fluid (60s) for proof generation — Vercel Hobby is limited to 60s
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    // All state is passed from client — Vercel serverless has no shared memory
    const body = await request.json().catch(() => ({}));

    const {
      minRating = 45,
      minTrips = 1000,
      platformType = 0,
      // Identity fields passed from client sessionStorage
      masterSecret: masterSecretHex,
      derivedKey: derivedKeyHex,
      platformSecret: platformSecretHex,
      merkleProof,
      // Credential passed from client sessionStorage
      credential: credentialBody,
      // Platform data
      rating = 48,
      tripCount = 1547,
    } = body;

    if (!masterSecretHex || !derivedKeyHex || !platformSecretHex || !merkleProof || !credentialBody) {
      return NextResponse.json(
        { error: 'Complete steps 1-3 first (register, connect, issue credential)' },
        { status: 400 }
      );
    }

    const masterSecret = BigInt(masterSecretHex);
    const derivedKey = BigInt(derivedKeyHex);
    const storedRating = BigInt(rating);
    const storedTripCount = BigInt(tripCount);

    // Compute nullifier matching circuit: pedersen_hash([master_secret, platform_type])
    const nullifier = await computeNullifier(masterSecret, platformType);

    // Compute credential_message matching circuit
    const credentialMessage = await pedersenHash([
      storedRating,
      storedTripCount,
      0n,    // platform_id (Uber)
      derivedKey,
    ]);

    // Parse credential fields from client
    const sigRx = BigInt(credentialBody.signature.r.x);
    const sigRy = BigInt(credentialBody.signature.r.y);
    const sigS = BigInt(credentialBody.signature.s);
    const pkX = BigInt(credentialBody.groupPublicKey.x);
    const pkY = BigInt(credentialBody.groupPublicKey.y);

    const proofInputs = {
      nullifier: nullifier.toString(),
      anonymity_set_root: BigInt(merkleProof.root).toString(),
      platform_type: platformType.toString(),
      min_rating_threshold: minRating.toString(),
      min_trips_threshold: minTrips.toString(),
      master_secret: masterSecret.toString(),
      credential_pub_key_x: pkX.toString(),
      credential_pub_key_y: pkY.toString(),
      credential_signature_s: sigS.toString(),
      credential_signature_r8_x: sigRx.toString(),
      credential_signature_r8_y: sigRy.toString(),
      credential_message: credentialMessage.toString(),
      rating: storedRating.toString(),
      trip_count: storedTripCount.toString(),
      platform_id: '0',
      merkle_path: (merkleProof.path as string[]).map(p => BigInt(p).toString()),
      merkle_indices: (merkleProof.indices as number[]).map(i => i.toString()),
      platform_secret: BigInt(platformSecretHex).toString(),
    };

    const result = await generateProof(proofInputs);
    const proofHex = Buffer.from(result.proof).toString('hex');
    const nullifierHex = '0x' + nullifier.toString(16).padStart(64, '0');

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
