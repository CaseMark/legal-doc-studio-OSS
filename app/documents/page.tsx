"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DocumentList } from "@/components/documents";
import { ApiKeyModal } from "@/components/api-key-modal";
import { listDocuments, deleteDocument } from "@/lib/storage/vault-storage";
import { hasApiKey } from "@/lib/api-key-storage";
import {
  ArrowLeft,
  Plus,
  SpinnerGap
} from "@phosphor-icons/react";
import type { GeneratedDocument } from "@/lib/types";

export default function DocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<GeneratedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  // Check for API key and load documents on mount
  useEffect(() => {
    if (!hasApiKey()) {
      setShowApiKeyModal(true);
      setLoading(false);
      return;
    }
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleApiKeySuccess = () => {
    setShowApiKeyModal(false);
    loadDocuments();
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDocument = (doc: GeneratedDocument) => {
    // Navigate to document preview/edit page
    router.push(`/documents/${doc.id}`);
  };

  const handleEditDocument = (doc: GeneratedDocument) => {
    // Navigate to edit page (re-open in form wizard)
    router.push(`/generate/${doc.templateId}?edit=${doc.id}`);
  };

  const handleDeleteDocument = async (id: string) => {
    const success = await deleteDocument(id);
    if (success) {
      setDocuments(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleExportDocument = async (doc: GeneratedDocument, format: 'pdf' | 'docx' | 'html') => {
    // Navigate to document view with export action
    router.push(`/documents/${doc.id}?export=${format}`);
  };

  const handleCreateNew = () => {
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-background">
      {/* API Key Modal */}
      {showApiKeyModal && <ApiKeyModal onSuccess={handleApiKeySuccess} />}

      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/")}
                className="gap-2"
              >
                <ArrowLeft size={16} />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">
                  My Documents
                </h1>
                <p className="text-sm text-muted-foreground">
                  {documents.length} document{documents.length !== 1 ? "s" : ""} in your vault
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground border-l pl-4">
                <span>Built with</span>
                <a
                  href="https://case.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                  <img
                    src="/casedev-logo.svg"
                    alt="Case.dev"
                    className="h-5 w-5"
                  />
                  <span className="font-medium">case.dev</span>
                </a>
              </div>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus size={16} />
                New Document
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <SpinnerGap size={32} className="animate-spin text-muted-foreground" />
          </div>
        ) : (
          <DocumentList
            documents={documents}
            onView={handleViewDocument}
            onEdit={handleEditDocument}
            onDelete={handleDeleteDocument}
            onExport={handleExportDocument}
            onCreateNew={handleCreateNew}
            isLoading={loading}
          />
        )}
      </div>
    </main>
  );
}
