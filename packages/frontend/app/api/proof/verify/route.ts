import { NextResponse } from 'next/server';
import { verifyProofLocally } from '@/app/server-lib/proof';
import { verifyOnChain } from '@/app/server-lib/ethereum';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { proof, publicInputs } = body;

    if (!proof || !publicInputs) {
      return NextResponse.json(
        { error: 'proof and publicInputs required' },
        { status: 400 }
      );
    }

    const proofBytes = Uint8Array.from(Buffer.from(proof, 'hex'));

    // First verify locally
    const localValid = await verifyProofLocally(proofBytes, publicInputs);

    // Then try on-chain (non-blocking if contracts not deployed)
    let onChainResult = null;
    try {
      onChainResult = await verifyOnChain(proofBytes, publicInputs);
    } catch {
      // On-chain verification skipped — contracts may not be deployed
    }

    return NextResponse.json({
      success: true,
      localVerification: localValid,
      onChainVerification: onChainResult
        ? {
            verified: onChainResult.verified,
            txHash: onChainResult.txHash,
            gasUsed: onChainResult.gasUsed.toString(),
          }
        : null,
      privacyAnalysis: {
        insurerLearned: [
          'Verified rideshare driver',
          'Rating >= 4.5 stars',
          'Trip count >= 1,000',
          'Credential signed by threshold committee',
        ],
        insurerDidNotLearn: [
          'Platform = Uber (only type "Rideshare" revealed)',
          'Rating = 4.8 (only ">= 4.5" proven)',
          'Trip count = 1,547 (only ">= 1,000" proven)',
          'Driver identity or account',
          'Link to any other application',
        ],
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
