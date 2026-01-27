/**
 * Default Vault Endpoint
 *
 * Gets or creates a default vault for document storage.
 * GET /api/vaults/default
 */

import { NextRequest, NextResponse } from 'next/server';
import { vaultClient, InvalidApiKeyError } from '@/lib/vault-client';

export async function GET(request: NextRequest) {
  try {
    // Get API key from custom header
    const apiKey = request.headers.get('x-case-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 401 }
      );
    }

    // List all vaults
    const vaults = await vaultClient.listVaults(apiKey);

    // If user has vaults, return the first one (or most recently created)
    if (vaults.length > 0) {
      const defaultVault = vaults.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];

      return NextResponse.json({
        vaultId: defaultVault.id,
        name: defaultVault.name,
        totalObjects: defaultVault.totalObjects,
        isNew: false,
      });
    }

    // No vaults exist - create a new one
    const now = new Date();
    const vaultName = `Legal Documents - ${now.toLocaleDateString()}`;

    const newVault = await vaultClient.createVault(apiKey, vaultName);

    return NextResponse.json({
      vaultId: newVault.id,
      name: newVault.name,
      totalObjects: 0,
      isNew: true,
    });
  } catch (error: unknown) {
    console.error('Default vault endpoint error:', error);

    if (error instanceof InvalidApiKeyError) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to get/create vault',
      },
      { status: 500 }
    );
  }
}
