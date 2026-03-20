import { NextResponse } from 'next/server';
import { getState, setState } from '@/app/server-lib/session';
import { pedersenHash } from '@/app/server-lib/pedersen';
import { issueThresholdCredential, getSignerDetails } from '@/app/server-lib/credential';

export async function POST(request: Request) {
  try {
    const state = getState();
    if (!state.identity) {
      return NextResponse.json(
        { error: 'Register identity first (POST /api/identity/register)' },
        { status: 400 }
      );
    }

    // Accept optional custom stats from frontend (editable on Step 2)
    const body = await request.json().catch(() => ({}));
    const rawRating = body?.rating;
    const rawTripCount = body?.tripCount;

    // Validate if provided
    let rating = 48; // default: 4.8 stars encoded as integer
    let tripCount = 1547; // default
    if (rawRating !== undefined) {
      const r = Number(rawRating);
      if (!Number.isInteger(r) || r < 10 || r > 50) {
        return NextResponse.json(
          { error: 'rating must be integer 10–50 (e.g. 48 = 4.8 stars)' },
          { status: 400 }
        );
      }
      rating = r;
    }
    if (rawTripCount !== undefined) {
      const t = Number(rawTripCount);
      if (!Number.isInteger(t) || t < 1 || t > 99999) {
        return NextResponse.json(
          { error: 'tripCount must be integer 1–99999' },
          { status: 400 }
        );
      }
      tripCount = t;
    }

    const attrs = {
      rating,
      tripCount,
      platformId: 0x00, // Uber
      derivedKey: state.identity.derivedKey,
    };

    // Pre-compute credential_message matching circuit:
    // attr_hash = pedersen_hash([rating, trip_count, platform_id, derived_key])
    const credMsg = await pedersenHash([
      BigInt(rating),
      BigInt(tripCount),
      0n,
      state.identity.derivedKey,
    ]);

    const credential = await issueThresholdCredential(attrs, credMsg);
    const signerDetails = getSignerDetails();

    setState({
      credential,
      credentialMessage: credMsg,
      platformData: { rating, tripCount, platformId: 0, platformType: 0 },
    });

    return NextResponse.json({
      success: true,
      credential: {
        attributes: {
          rating: attrs.rating / 10,
          tripCount: attrs.tripCount,
          platform: 'Uber',
        },
        signature: {
          r: {
            x: '0x' + credential.signature.r.x.toString(16).padStart(64, '0'),
            y: '0x' + credential.signature.r.y.toString(16).padStart(64, '0'),
          },
          s: '0x' + credential.signature.s.toString(16).padStart(64, '0'),
        },
        groupPublicKey: signerDetails.groupPublicKey,
      },
      threshold: signerDetails,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
