/**
 * GET /api/samples — Returns sample test messages.
 */

import { NextResponse } from 'next/server';
import { getSampleMessages } from '@/lib/data-access';

export async function GET() {
  const samples = getSampleMessages();
  return NextResponse.json({ samples }, { status: 200 });
}
