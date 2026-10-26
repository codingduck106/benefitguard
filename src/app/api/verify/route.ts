/**
 * POST /api/verify — Message verification endpoint.
 * 
 * SECURITY:
 * - Validates and limits all input sizes (Zod).
 * - Does not log raw message contents.
 * - Does not store submitted messages.
 * - Escapes no user content in responses (JSON responses are safe by default).
 * - Rate limited per IP; Claude calls have per-IP and global daily budgets (see rate-limit.ts).
 */

import { NextRequest, NextResponse } from 'next/server';
import { VerifyRequestSchema } from '@/lib/types';
import { contextOf, verifyMessage } from '@/lib/engine/verify';
import { runAdvisor } from '@/lib/ai/advisor';
import { clientIp, envLimit, takeToken } from '@/lib/rate-limit';

const MAX_REQUEST_SIZE = 10000; // bytes
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export async function POST(request: NextRequest) {
  try {
    const ip = clientIp(request);
    const limit = takeToken(`verify:${ip}`, envLimit('RATE_LIMIT_PER_MINUTE', 10), MINUTE);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many checks. Please wait a minute and try again.' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
      );
    }

    // Check content length to prevent abuse
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: 'Request too large. Maximum message size is 5,000 characters.' },
        { status: 413 }
      );
    }

    const body = await request.json();

    // Validate request with Zod
    const parseResult = VerifyRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      );
    }

    const validatedRequest = parseResult.data;

    // Run verification engine, then the optional AI advisor on top of it.
    // The advisor can only add findings; the rule engine re-derives the verdict.
    let result = verifyMessage(validatedRequest);
    // Past the AI budget, checks still run on rules only, which caps the AI bill.
    const aiAllowed =
      takeToken(`ai:${ip}`, envLimit('AI_LIMIT_PER_IP_PER_DAY', 20), DAY).ok &&
      takeToken('ai:all', envLimit('AI_LIMIT_PER_DAY', 500), DAY).ok;
    const advice = aiAllowed
      ? await runAdvisor(validatedRequest.messageContent, result.findings, contextOf(validatedRequest))
      : null;
    if (advice) {
      result = { ...verifyMessage(validatedRequest, advice.findings), aiAdvisor: advice.info };
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    // Do not log raw request contents
    console.error('Verification error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
