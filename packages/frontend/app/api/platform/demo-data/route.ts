import { NextResponse } from 'next/server';

export async function GET() {
  // Uber has no public API for driver stats.
  // These are hardcoded demo values, explicitly labelled as such.
  return NextResponse.json({
    platform: 'Uber',
    platformId: 0x00, // Uber = Rideshare type 0
    platformType: 0,  // Rideshare
    rating: 4.8,
    ratingEncoded: 48, // 48 = 4.8 * 10
    tripCount: 1547,
    driverSince: '2019-03-15',
    note: 'Demo data - Uber API is not public. Values are representative.',
  });
}
