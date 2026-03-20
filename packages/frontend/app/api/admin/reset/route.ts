import { NextResponse } from 'next/server';
import { resetState } from '@/app/server-lib/session';

export async function POST() {
  resetState();
  // Intentionally does NOT reset Merkle tree — anonymity set grows with each demo
  return NextResponse.json({ success: true });
}
