/**
 * API Key Validation Endpoint
 *
 * Validates a Case.dev API key by attempting to authenticate with the vault API.
 * POST /api/vaults/validate
 */

import { NextRequest, NextResponse } from 'next/server';
import { vaultClient } from '@/lib/vault-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    // Validate input
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json(
        {
          valid: false,
          error: 'API key is required',
        },
        { status: 400 }
      );
    }

    // Check basic format
    if (!apiKey.startsWith('sk_case_')) {
      return NextResponse.json(
        {
          valid: false,
          error: 'Invalid API key format. Key should start with sk_case_',
        },
        { status: 400 }
      );
    }

    // Validate with case.dev API
    try {
      const isValid = await vaultClient.validateApiKey(apiKey);

      if (isValid) {
        return NextResponse.json({
          valid: true,
          message: 'API key is valid',
        });
      } else {
        return NextResponse.json({
          valid: false,
          error: 'API key is invalid or expired',
        });
      }
    } catch (error: unknown) {
      // Handle network or other errors
      console.error('API key validation error:', error);

      return NextResponse.json(
        {
          valid: false,
          error: 'Unable to validate API key. Please check your connection.',
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error('Validation endpoint error:', error);

    return NextResponse.json(
      {
        valid: false,
        error: 'Invalid request format',
      },
      { status: 400 }
    );
  }
}
