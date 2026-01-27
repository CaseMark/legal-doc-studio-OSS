'use client';

/**
 * API Key Configuration Modal
 *
 * Modal that appears when user needs to configure their Case.dev API key.
 * Validates the key and stores it to localStorage on success.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { saveApiKey } from '@/lib/api-key-storage';
import { SpinnerGap } from '@phosphor-icons/react';

interface ApiKeyModalProps {
  onSuccess: () => void;
}

export function ApiKeyModal({ onSuccess }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (isValidating || isSubmitted) return;

    setError('');
    setIsValidating(true);

    try {
      // Validate API key with backend
      const response = await fetch('/api/vaults/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      const data = await response.json();

      if (data.valid) {
        // Save to localStorage
        saveApiKey(apiKey.trim());
        setIsSubmitted(true);

        // Call success callback
        onSuccess();
      } else {
        setError(data.error || 'Invalid API key');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setError('Failed to validate API key. Please check your connection.');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Configure API Key
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter your Case.dev API key to get started
          </p>
        </div>

        {/* Info Box */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 text-sm">
            Don't have an API key?
          </h3>
          <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
            Sign up for a free account at{' '}
            <a
              href="https://case.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-blue-600"
            >
              case.dev
            </a>{' '}
            to get your API key.
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Your API key will be stored locally in your browser and used to
            save documents to your personal vault.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="apiKey" className="text-gray-700 dark:text-gray-300">
              Case.dev API Key
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk_case_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="mt-1"
              required
              disabled={isValidating}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your API key should start with sk_case_
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isValidating || !apiKey.trim()}
          >
            {isValidating ? (
              <>
                <SpinnerGap className="animate-spin mr-2" size={16} />
                Validating...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </form>

        {/* Security Note */}
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>Security Note:</strong> Your API key is stored locally in
            your browser. Only use this application on devices you trust.
          </p>
        </div>
      </div>
    </div>
  );
}
