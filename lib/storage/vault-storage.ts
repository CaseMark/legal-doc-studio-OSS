/**
 * Vault Storage Adapter
 *
 * Implements the same interface as document-db.ts but uses case.dev vaults
 * for server-side storage instead of browser IndexedDB.
 *
 * This is a drop-in replacement that allows switching storage backends
 * without changing UI components.
 */

import type { GeneratedDocument } from '@/lib/types';
import type { VaultObject } from '@/lib/vault-client';
import {
  getApiKey,
  getVaultId,
  saveVaultId,
} from '@/lib/api-key-storage';

const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get or create the default vault ID
 * Caches the vault ID in localStorage
 */
async function getOrCreateVaultId(): Promise<string> {
  if (!isBrowser()) {
    throw new Error('Vault storage is only available in the browser');
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set up your API key.');
  }

  // Check cache first
  const cachedVaultId = getVaultId();
  if (cachedVaultId) {
    return cachedVaultId;
  }

  // Call API to get or create vault
  const response = await fetch('/api/vaults/default', {
    headers: {
      'x-case-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get default vault');
  }

  const data = await response.json();
  const vaultId = data.vaultId;

  // Cache for future use
  saveVaultId(vaultId);

  return vaultId;
}

/**
 * Convert VaultObject to GeneratedDocument
 */
function vaultObjectToDocument(
  obj: VaultObject,
  content: string
): GeneratedDocument {
  const metadata = obj.metadata || {};

  return {
    id: (metadata.documentId as string) || obj.id,
    templateId: (metadata.templateId as string) || '',
    templateName: (metadata.templateName as string) || '',
    name: (metadata.documentName as string) || obj.filename,
    content,
    variables: (metadata.variables as Record<string, string | number | boolean>) || {},
    format: 'markdown',
    status: (metadata.status as 'draft' | 'final' | 'archived') || 'draft',
    createdAt: new Date(metadata.createdAt as string || obj.createdAt),
    updatedAt: new Date(metadata.updatedAt as string || obj.createdAt),
  };
}

/**
 * Convert GeneratedDocument to vault upload format
 */
function documentToVaultFormat(doc: GeneratedDocument) {
  return {
    filename: `${doc.templateName}_${Date.now()}.md`,
    content: doc.content,
    metadata: {
      documentId: doc.id,
      templateId: doc.templateId,
      templateName: doc.templateName,
      documentName: doc.name,
      status: doc.status,
      variables: doc.variables,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    },
    relativePath: `templates/${doc.templateId}/`,
  };
}

// ============================================================================
// Document CRUD Operations
// ============================================================================

/**
 * Save a generated document to vault
 */
export async function saveDocument(
  document: GeneratedDocument
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const vaultId = await getOrCreateVaultId();
    const vaultFormat = documentToVaultFormat(document);

    const response = await fetch(`/api/vaults/${vaultId}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-case-api-key': apiKey,
      },
      body: JSON.stringify(vaultFormat),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save document');
    }

    if (DEBUG) {
      console.log('[Vault Storage] Saved document:', {
        id: document.id,
        name: document.name,
      });
    }

    return true;
  } catch (error) {
    console.error('[Vault Storage] Failed to save document:', error);
    return false;
  }
}

/**
 * Get a single document by ID
 */
export async function getDocument(
  id: string
): Promise<GeneratedDocument | undefined> {
  if (!isBrowser()) return undefined;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const vaultId = await getOrCreateVaultId();

    // List all documents and find the one with matching documentId in metadata
    const response = await fetch(`/api/vaults/${vaultId}/documents`, {
      headers: {
        'x-case-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list documents');
    }

    const data = await response.json();
    const matchingObj = data.documents.find(
      (obj: VaultObject) => obj.metadata?.documentId === id
    );

    if (!matchingObj) {
      return undefined;
    }

    // Download content
    const contentResponse = await fetch(
      `/api/vaults/${vaultId}/documents/${matchingObj.id}`,
      {
        headers: {
          'x-case-api-key': apiKey,
        },
      }
    );

    if (!contentResponse.ok) {
      throw new Error('Failed to get document content');
    }

    const contentData = await contentResponse.json();
    return vaultObjectToDocument(contentData.object, contentData.content);
  } catch (error) {
    console.error('[Vault Storage] Failed to get document:', error);
    return undefined;
  }
}

/**
 * List all documents, optionally filtered
 */
export async function listDocuments(options?: {
  templateId?: string;
  status?: GeneratedDocument['status'];
  limit?: number;
}): Promise<GeneratedDocument[]> {
  if (!isBrowser()) return [];

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const vaultId = await getOrCreateVaultId();

    const response = await fetch(`/api/vaults/${vaultId}/documents`, {
      headers: {
        'x-case-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list documents');
    }

    const data = await response.json();
    let documents: GeneratedDocument[] = [];

    // Convert vault objects to documents
    // Note: We're doing a simplified conversion without downloading content
    for (const obj of data.documents) {
      const metadata = obj.metadata || {};
      documents.push({
        id: (metadata.documentId as string) || obj.id,
        templateId: (metadata.templateId as string) || '',
        templateName: (metadata.templateName as string) || '',
        name: (metadata.documentName as string) || obj.filename,
        content: '', // Content not loaded for list view
        variables: (metadata.variables as Record<string, string | number | boolean>) || {},
        format: 'markdown',
        status: (metadata.status as 'draft' | 'final' | 'archived') || 'draft',
        createdAt: new Date(metadata.createdAt as string || obj.createdAt),
        updatedAt: new Date(metadata.updatedAt as string || obj.createdAt),
      });
    }

    // Apply filters
    if (options?.templateId) {
      documents = documents.filter((d) => d.templateId === options.templateId);
    }

    if (options?.status) {
      documents = documents.filter((d) => d.status === options.status);
    }

    // Sort by updatedAt (most recent first)
    documents.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    // Apply limit
    if (options?.limit) {
      documents = documents.slice(0, options.limit);
    }

    return documents;
  } catch (error) {
    console.error('[Vault Storage] Failed to list documents:', error);
    return [];
  }
}

/**
 * Update a document's status
 */
export async function updateDocumentStatus(
  id: string,
  status: GeneratedDocument['status']
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const vaultId = await getOrCreateVaultId();

    // Find the vault object ID
    const doc = await getDocument(id);
    if (!doc) {
      throw new Error('Document not found');
    }

    // Find the object ID by listing and matching
    const listResponse = await fetch(`/api/vaults/${vaultId}/documents`, {
      headers: {
        'x-case-api-key': apiKey,
      },
    });

    if (!listResponse.ok) {
      throw new Error('Failed to list documents');
    }

    const listData = await listResponse.json();
    const matchingObj = listData.documents.find(
      (obj: VaultObject) => obj.metadata?.documentId === id
    );

    if (!matchingObj) {
      throw new Error('Document not found in vault');
    }

    // Update metadata
    const updatedMetadata = {
      ...(matchingObj.metadata || {}),
      status,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(
      `/api/vaults/${vaultId}/documents/${matchingObj.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-case-api-key': apiKey,
        },
        body: JSON.stringify({ metadata: updatedMetadata }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update document status');
    }

    if (DEBUG) {
      console.log('[Vault Storage] Updated document status:', { id, status });
    }

    return true;
  } catch (error) {
    console.error('[Vault Storage] Failed to update document status:', error);
    return false;
  }
}

/**
 * Update a document's content and variables
 */
export async function updateDocument(
  id: string,
  updates: Partial<
    Pick<GeneratedDocument, 'name' | 'content' | 'variables' | 'status'>
  >
): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const vaultId = await getOrCreateVaultId();

    // Find the vault object
    const listResponse = await fetch(`/api/vaults/${vaultId}/documents`, {
      headers: {
        'x-case-api-key': apiKey,
      },
    });

    if (!listResponse.ok) {
      throw new Error('Failed to list documents');
    }

    const listData = await listResponse.json();
    const matchingObj = listData.documents.find(
      (obj: VaultObject) => obj.metadata?.documentId === id
    );

    if (!matchingObj) {
      throw new Error('Document not found in vault');
    }

    // Prepare updates
    const updatedMetadata = {
      ...(matchingObj.metadata || {}),
      updatedAt: new Date().toISOString(),
    };

    if (updates.name !== undefined) {
      updatedMetadata.documentName = updates.name;
    }
    if (updates.status !== undefined) {
      updatedMetadata.status = updates.status;
    }
    if (updates.variables !== undefined) {
      updatedMetadata.variables = updates.variables;
    }

    const body: {
      metadata: Record<string, unknown>;
      content?: string;
    } = {
      metadata: updatedMetadata,
    };

    if (updates.content !== undefined) {
      body.content = updates.content;
    }

    const response = await fetch(
      `/api/vaults/${vaultId}/documents/${matchingObj.id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-case-api-key': apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to update document');
    }

    if (DEBUG) {
      console.log('[Vault Storage] Updated document:', {
        id,
        updates: Object.keys(updates),
      });
    }

    return true;
  } catch (error) {
    console.error('[Vault Storage] Failed to update document:', error);
    return false;
  }
}

/**
 * Delete a document by ID
 */
export async function deleteDocument(id: string): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('API key not configured');
    }

    const vaultId = await getOrCreateVaultId();

    // Find the vault object
    const listResponse = await fetch(`/api/vaults/${vaultId}/documents`, {
      headers: {
        'x-case-api-key': apiKey,
      },
    });

    if (!listResponse.ok) {
      throw new Error('Failed to list documents');
    }

    const listData = await listResponse.json();
    const matchingObj = listData.documents.find(
      (obj: VaultObject) => obj.metadata?.documentId === id
    );

    if (!matchingObj) {
      throw new Error('Document not found in vault');
    }

    const response = await fetch(
      `/api/vaults/${vaultId}/documents/${matchingObj.id}`,
      {
        method: 'DELETE',
        headers: {
          'x-case-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete document');
    }

    if (DEBUG) {
      console.log('[Vault Storage] Deleted document:', { id });
    }

    return true;
  } catch (error) {
    console.error('[Vault Storage] Failed to delete document:', error);
    return false;
  }
}

/**
 * Delete multiple documents by IDs
 */
export async function deleteDocuments(ids: string[]): Promise<boolean> {
  if (!isBrowser()) return false;

  try {
    // Delete one by one (vault API doesn't have bulk delete)
    const results = await Promise.all(ids.map((id) => deleteDocument(id)));

    const allSucceeded = results.every((r) => r === true);

    if (DEBUG) {
      console.log('[Vault Storage] Deleted documents:', {
        count: ids.length,
        succeeded: results.filter((r) => r).length,
      });
    }

    return allSucceeded;
  } catch (error) {
    console.error('[Vault Storage] Failed to delete documents:', error);
    return false;
  }
}

/**
 * Search documents by name
 */
export async function searchDocuments(
  query: string
): Promise<GeneratedDocument[]> {
  if (!isBrowser()) return [];
  if (!query.trim()) return listDocuments();

  try {
    // List all and filter client-side (vault semantic search available for future enhancement)
    const allDocuments = await listDocuments();

    const lowerQuery = query.toLowerCase();
    const filtered = allDocuments.filter(
      (doc) =>
        doc.name.toLowerCase().includes(lowerQuery) ||
        doc.templateName.toLowerCase().includes(lowerQuery)
    );

    return filtered;
  } catch (error) {
    console.error('[Vault Storage] Failed to search documents:', error);
    return [];
  }
}

/**
 * Get document count
 */
export async function getDocumentCount(): Promise<number> {
  if (!isBrowser()) return 0;

  try {
    const documents = await listDocuments();
    return documents.length;
  } catch (error) {
    console.error('[Vault Storage] Failed to get document count:', error);
    return 0;
  }
}
