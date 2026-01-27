/**
 * Vault Documents Endpoint
 *
 * GET  /api/vaults/[id]/documents - List all documents in vault
 * POST /api/vaults/[id]/documents - Upload a new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { vaultClient, InvalidApiKeyError } from '@/lib/vault-client';

/**
 * GET - List all documents in the vault
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vaultId } = await params;
    const apiKey = request.headers.get('x-case-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 401 }
      );
    }

    // List all objects in the vault
    const objects = await vaultClient.listObjects(apiKey, vaultId);

    // Filter for markdown documents only
    const documents = objects.filter(
      (obj) => obj.contentType === 'text/markdown'
    );

    return NextResponse.json({
      vaultId,
      documents,
      count: documents.length,
    });
  } catch (error: unknown) {
    console.error('List documents error:', error);

    if (error instanceof InvalidApiKeyError) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to list documents',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Upload a new document to the vault
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vaultId } = await params;
    const apiKey = request.headers.get('x-case-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { filename, content, metadata, relativePath } = body;

    // Validate required fields
    if (!filename || !content) {
      return NextResponse.json(
        { error: 'filename and content are required' },
        { status: 400 }
      );
    }

    // Upload document using 3-step flow
    const vaultObject = await vaultClient.uploadDocument(apiKey, vaultId, {
      name: filename,
      content,
      mimeType: 'text/markdown',
      metadata,
      relativePath,
    });

    return NextResponse.json({
      success: true,
      document: vaultObject,
    });
  } catch (error: unknown) {
    console.error('Upload document error:', error);

    if (error instanceof InvalidApiKeyError) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upload document',
      },
      { status: 500 }
    );
  }
}
