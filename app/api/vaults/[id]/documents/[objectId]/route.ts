/**
 * Individual Vault Document Endpoint
 *
 * GET    /api/vaults/[id]/documents/[objectId] - Get document with content
 * PATCH  /api/vaults/[id]/documents/[objectId] - Update document metadata/content
 * DELETE /api/vaults/[id]/documents/[objectId] - Delete document
 */

import { NextRequest, NextResponse } from 'next/server';
import { vaultClient, InvalidApiKeyError } from '@/lib/vault-client';

/**
 * GET - Fetch a single document with its content
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; objectId: string }> }
) {
  try {
    const { id: vaultId, objectId } = await params;
    const apiKey = request.headers.get('x-case-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 401 }
      );
    }

    // Get object metadata
    const object = await vaultClient.getObject(apiKey, vaultId, objectId);

    // Download content
    const content = await vaultClient.downloadObject(apiKey, vaultId, objectId);

    return NextResponse.json({
      object,
      content,
    });
  } catch (error: unknown) {
    console.error('Get document error:', error);

    if (error instanceof InvalidApiKeyError) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to get document',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update document metadata or content
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; objectId: string }> }
) {
  try {
    const { id: vaultId, objectId } = await params;
    const apiKey = request.headers.get('x-case-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { filename, metadata, relativePath, content } = body;

    // If content is being updated, we need to re-upload
    if (content) {
      // For content updates, delete old and create new with same metadata
      const currentObject = await vaultClient.getObject(
        apiKey,
        vaultId,
        objectId
      );

      // Upload new content
      const updatedObject = await vaultClient.uploadDocument(apiKey, vaultId, {
        name: filename || currentObject.filename,
        content,
        mimeType: 'text/markdown',
        metadata: metadata || currentObject.metadata,
        relativePath: relativePath || currentObject.relative_path,
      });

      // Delete old object
      await vaultClient.deleteObject(apiKey, vaultId, objectId, true);

      return NextResponse.json({
        success: true,
        document: updatedObject,
      });
    }

    // Otherwise just update metadata
    const updates: {
      filename?: string;
      metadata?: Record<string, unknown>;
      relative_path?: string;
    } = {};
    if (filename) updates.filename = filename;
    if (metadata) updates.metadata = metadata;
    if (relativePath) updates.relative_path = relativePath;

    const updatedObject = await vaultClient.updateObject(
      apiKey,
      vaultId,
      objectId,
      updates
    );

    return NextResponse.json({
      success: true,
      document: updatedObject,
    });
  } catch (error: unknown) {
    console.error('Update document error:', error);

    if (error instanceof InvalidApiKeyError) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to update document',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove a document from the vault
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; objectId: string }> }
) {
  try {
    const { id: vaultId, objectId } = await params;
    const apiKey = request.headers.get('x-case-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not provided' },
        { status: 401 }
      );
    }

    // Delete the object
    await vaultClient.deleteObject(apiKey, vaultId, objectId, true);

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Delete document error:', error);

    if (error instanceof InvalidApiKeyError) {
      return NextResponse.json(
        { error: 'Invalid or expired API key' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to delete document',
      },
      { status: 500 }
    );
  }
}
