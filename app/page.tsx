"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TemplateSelector } from "@/components/documents";
import { UsageMeter } from "@/components/demo/usage-meter";
import { DEMO_LIMITS } from "@/lib/demo-limits/config";
import { getSessionStats } from "@/lib/demo-limits/session-storage";
import {
  FileText,
  FolderOpen,
  Sparkle,
  ArrowRight
} from "@phosphor-icons/react";
import type { DocumentTemplate } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [documentsGenerated, setDocumentsGenerated] = useState(0);

  // Load and refresh session stats
  useEffect(() => {
    const loadStats = () => {
      const stats = getSessionStats();
      setDocumentsGenerated(stats.documentsGenerated);
    };

    loadStats();

    // Listen for storage changes (for updates from other tabs/pages)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'legal-doc-studio-session') {
        loadStats();
      }
    };

    // Also refresh when window gains focus (for same-tab updates)
    const handleFocus = () => {
      loadStats();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
  };

  const handleStartGeneration = () => {
    if (selectedTemplate) {
      router.push(`/generate/${selectedTemplate.id}`);
    }
  };

  const handleViewDocuments = () => {
    router.push("/documents");
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="border-b bg-gradient-to-b from-muted/50 to-background">
        <div className="container mx-auto px-6 py-8">
          {/* Header with usage meter and case.dev badge */}
          <div className="flex items-center justify-between mb-4">
            <div className="w-48">
              <UsageMeter
                label="Documents Generated"
                used={documentsGenerated}
                limit={DEMO_LIMITS.documents.maxDocumentsPerSession}
              />
            </div>
            <a
              href="https://case.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <span>built with</span>
              <svg width="14" height="14" viewBox="0 0 144 144" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M127.927 56.3865C127.927 54.7298 126.583 53.3867 124.927 53.3865H19.6143C17.9574 53.3865 16.6143 54.7296 16.6143 56.3865V128.226C16.6143 129.883 17.9574 131.226 19.6143 131.226H124.927C126.583 131.226 127.927 129.883 127.927 128.226V56.3865ZM93.1553 32.6638C93.1553 31.007 91.8121 29.6639 90.1553 29.6638H53.4102C51.7534 29.664 50.4102 31.0071 50.4102 32.6638V47.3865H93.1553V32.6638ZM99.1553 47.3865H124.927C129.897 47.3867 133.927 51.4161 133.927 56.3865V128.226C133.927 133.197 129.897 137.226 124.927 137.226H19.6143C14.6437 137.226 10.6143 133.197 10.6143 128.226V56.3865C10.6143 51.4159 14.6437 47.3865 19.6143 47.3865H44.4102V32.6638C44.4102 27.6933 48.4397 23.664 53.4102 23.6638H90.1553C95.1258 23.6639 99.1553 27.6933 99.1553 32.6638V47.3865Z" fill="#EB5600"/>
                <path d="M76.6382 70.6082C77.8098 69.4366 79.7088 69.4366 80.8804 70.6082L98.8013 88.5291C100.754 90.4817 100.754 93.6477 98.8013 95.6003L80.8804 113.521C79.7088 114.693 77.8097 114.693 76.6382 113.521C75.4667 112.35 75.4667 110.451 76.6382 109.279L93.8521 92.0642L76.6382 74.8503C75.4666 73.6788 75.4666 71.7797 76.6382 70.6082Z" fill="#EB5600"/>
                <path d="M67.3618 70.6082C66.1902 69.4366 64.2912 69.4366 63.1196 70.6082L45.1987 88.5291C43.2461 90.4817 43.2461 93.6477 45.1987 95.6003L63.1196 113.521C64.2912 114.693 66.1903 114.693 67.3618 113.521C68.5333 112.35 68.5333 110.451 67.3618 109.279L50.1479 92.0642L67.3618 74.8503C68.5334 73.6788 68.5334 71.7797 67.3618 70.6082Z" fill="#EB5600"/>
              </svg>
              <span className="font-semibold">case.dev</span>
            </a>
          </div>
        </div>
        <div className="container mx-auto px-6 pb-16 md:pb-24">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkle size={16} weight="fill" />
              AI-Powered Document Generation
            </div>
            
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground"
              style={{ fontFamily: "'Spectral', serif" }}
            >
              Legal Document Studio
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Generate professional legal documents in minutes. Choose a template, 
              fill in the details with AI assistance, and export in your preferred format.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button 
                size="lg" 
                onClick={() => document.getElementById('templates')?.scrollIntoView({ behavior: 'smooth' })}
                className="gap-2"
              >
                <FileText size={20} />
                Start New Document
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                onClick={handleViewDocuments}
                className="gap-2"
              >
                <FolderOpen size={20} />
                View My Documents
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <FeatureCard
            icon={<FileText size={24} className="text-primary" />}
            title="Professional Templates"
            description="Choose from employment agreements, NDAs, contractor agreements, and more."
          />
          <FeatureCard
            icon={<Sparkle size={24} className="text-primary" />}
            title="AI-Assisted Input"
            description="Describe your needs in plain English and let AI fill in the form fields."
          />
          <FeatureCard
            icon={<FolderOpen size={24} className="text-primary" />}
            title="Local Storage"
            description="Your documents stay on your device. Export to PDF, DOCX, or HTML."
          />
        </div>
      </div>

      {/* Template Selection Section */}
      <div id="templates" className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
              Choose a Template
            </h2>
            <p className="text-muted-foreground">
              Select a document template to get started
            </p>
          </div>

          <TemplateSelector
            onSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id}
          />

          {/* Selected Template Action */}
          {selectedTemplate && (
            <div className="mt-8 p-6 rounded-lg border bg-card">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-foreground">
                    {selectedTemplate.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedTemplate.sections.length} sections • {
                      selectedTemplate.sections.reduce((acc, s) => acc + s.variables.length, 0)
                    } fields
                  </p>
                </div>
                <Button onClick={handleStartGeneration} className="gap-2">
                  Continue
                  <ArrowRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>Legal Document Studio • Powered by Case.dev</p>
            <p>All documents are stored locally in your browser</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center p-6 rounded-lg border bg-card">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
