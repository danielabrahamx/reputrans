import { NextResponse } from 'next/server';
import { getTreeState } from '@/app/server-lib/identity';
import { getContractAddresses } from '@/app/server-lib/ethereum';

export async function GET() {
  try {
    const tree = getTreeState();
    return NextResponse.json({
      status: 'ok',
      contracts: getContractAddresses(),
      tree: {
        root: '0x' + tree.root.toString(16).padStart(64, '0'),
        size: tree.size,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
