/**
 * Case.dev Vault Client
 *
 * Client SDK for interacting with case.dev vaults for document storage.
 * Adapted for browser use with API keys from localStorage.
 */

const CASE_API_BASE = 'https://api.case.dev';

/**
 * Vault interface matching case.dev API
 */
export interface Vault {
  id: string;
  name: string;
  description?: string;
  enableGraph?: boolean;
  totalObjects: number;
  totalBytes: number;
  createdAt: string;
}

/**
 * Vault object (document) interface
 */
export interface VaultObject {
  id: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  ingestionStatus: 'pending' | 'processing' | 'completed' | 'failed';
  pageCount?: number;
  textLength?: number;
  chunkCount?: number;
  vectorCount?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
  createdAt: string;
  ingestionCompletedAt?: string;
  relative_path?: string;
}

/**
 * Update payload for vault objects
 */
export interface VaultObjectUpdate {
  filename?: string;
  relative_path?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error classes for better error handling
 */
export class VaultApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: string
  ) {
    super(message);
    this.name = 'VaultApiError';
  }
}

export class InvalidApiKeyError extends VaultApiError {
  constructor() {
    super('Invalid or expired API key', 401);
    this.name = 'InvalidApiKeyError';
  }
}

export class RateLimitError extends VaultApiError {
  constructor() {
    super('Rate limit exceeded. Please try again later.', 429);
    this.name = 'RateLimitError';
  }
}

/**
 * Make an authenticated request to case.dev API
 */
async function vaultRequest<T>(
  endpoint: string,
  apiKey: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${CASE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    // Handle specific error cases
    if (response.status === 401) {
      throw new InvalidApiKeyError();
    }

    if (response.status === 429) {
      throw new RateLimitError();
    }

    throw new VaultApiError(
      `API request failed: ${response.statusText}`,
      response.status,
      errorText
    );
  }

  return response.json();
}

/**
 * Vault operations client
 */
export const vaultClient = {
  /**
   * Create a new vault
   */
  async createVault(apiKey: string, name: string): Promise<Vault> {
    return vaultRequest<Vault>('/vault', apiKey, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  },

  /**
   * List all vaults
   */
  async listVaults(apiKey: string): Promise<Vault[]> {
    const response = await vaultRequest<{
      vaults: Vault[];
      total: number;
    }>('/vault', apiKey);
    return response.vaults;
  },

  /**
   * Get vault by ID
   */
  async getVault(apiKey: string, vaultId: string): Promise<Vault> {
    return vaultRequest<Vault>(`/vault/${vaultId}`, apiKey);
  },

  /**
   * Delete a vault
   */
  async deleteVault(apiKey: string, vaultId: string): Promise<void> {
    await vaultRequest(`/vault/${vaultId}`, apiKey, {
      method: 'DELETE',
    });
  },

  /**
   * Upload a file to a vault using the 3-step flow:
   * 1. POST /vault/{id}/upload - Get presigned URL
   * 2. PUT to presigned URL - Upload to S3
   * 3. POST /vault/{id}/ingest/{objectId} - Trigger ingestion
   */
  async uploadDocument(
    apiKey: string,
    vaultId: string,
    file: {
      name: string;
      content: string;
      mimeType: string;
      metadata?: Record<string, unknown>;
      relativePath?: string;
    }
  ): Promise<VaultObject> {
    // Calculate file size in bytes
    const contentBlob = new Blob([file.content], { type: file.mimeType });
    const sizeBytes = contentBlob.size;

    // Step 1: Get presigned upload URL
    const presignResponse = await fetch(
      `${CASE_API_BASE}/vault/${vaultId}/upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.mimeType,
          sizeBytes: sizeBytes,
        }),
      }
    );

    if (!presignResponse.ok) {
      const error = await presignResponse.text();
      throw new VaultApiError(
        `Failed to get upload URL: ${error}`,
        presignResponse.status,
        error
      );
    }

    const presignData = await presignResponse.json();

    // Handle different response formats
    const presignedUrl =
      presignData.url || presignData.presignedUrl || presignData.uploadUrl;
    const objectId =
      presignData.objectId || presignData.object_id || presignData.id;

    if (!presignedUrl || !objectId) {
      throw new VaultApiError(
        'Invalid presign response: missing URL or object ID',
        500
      );
    }

    // Step 2: Upload content to S3
    const s3Response = await fetch(presignedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.mimeType,
      },
      body: contentBlob,
    });

    if (!s3Response.ok) {
      throw new VaultApiError(
        `S3 upload failed: ${s3Response.statusText}`,
        s3Response.status
      );
    }

    // Step 3: Trigger ingestion
    const ingestResponse = await fetch(
      `${CASE_API_BASE}/vault/${vaultId}/ingest/${objectId}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!ingestResponse.ok) {
      const error = await ingestResponse.text();
      throw new VaultApiError(
        `Ingestion failed: ${error}`,
        ingestResponse.status,
        error
      );
    }

    const result = await ingestResponse.json();
    const vaultObject: VaultObject = { ...result, id: result.id || objectId };

    // Update metadata and relative path if provided
    if (file.metadata || file.relativePath) {
      const updates: VaultObjectUpdate = {};
      if (file.metadata) updates.metadata = file.metadata;
      if (file.relativePath) updates.relative_path = file.relativePath;

      return vaultClient.updateObject(apiKey, vaultId, objectId, updates);
    }

    return vaultObject;
  },

  /**
   * List all objects in a vault
   */
  async listObjects(apiKey: string, vaultId: string): Promise<VaultObject[]> {
    const response = await vaultRequest<{
      vaultId: string;
      objects: VaultObject[];
      count: number;
    }>(`/vault/${vaultId}/objects`, apiKey);
    return response.objects;
  },

  /**
   * Get a single object's metadata
   */
  async getObject(
    apiKey: string,
    vaultId: string,
    objectId: string
  ): Promise<VaultObject> {
    return vaultRequest<VaultObject>(
      `/vault/${vaultId}/objects/${objectId}`,
      apiKey
    );
  },

  /**
   * Download an object's content
   * Returns the content as a string
   */
  async downloadObject(
    apiKey: string,
    vaultId: string,
    objectId: string
  ): Promise<string> {
    const response = await fetch(
      `${CASE_API_BASE}/vault/${vaultId}/objects/${objectId}/download`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new VaultApiError(
        `Download failed: ${error}`,
        response.status,
        error
      );
    }

    return response.text();
  },

  /**
   * Update an object's metadata, filename, or path
   */
  async updateObject(
    apiKey: string,
    vaultId: string,
    objectId: string,
    updates: VaultObjectUpdate
  ): Promise<VaultObject> {
    return vaultRequest<VaultObject>(
      `/vault/${vaultId}/objects/${objectId}`,
      apiKey,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
  },

  /**
   * Delete an object from the vault
   */
  async deleteObject(
    apiKey: string,
    vaultId: string,
    objectId: string,
    force = false
  ): Promise<void> {
    const url = force
      ? `/vault/${vaultId}/objects/${objectId}?force=true`
      : `/vault/${vaultId}/objects/${objectId}`;

    await vaultRequest(url, apiKey, {
      method: 'DELETE',
    });
  },

  /**
   * Validate an API key by attempting to list vaults
   * Returns true if valid, false otherwise
   */
  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      await vaultRequest('/vault', apiKey);
      return true;
    } catch (error) {
      if (error instanceof InvalidApiKeyError) {
        return false;
      }
      // For other errors (network, etc.), we can't determine validity
      throw error;
    }
  },
};
