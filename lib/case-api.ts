/**
 * Case.dev API Integration
 * 
 * Provides LLM chat completions for natural language parsing
 * and document formatting (PDF, DOCX) via Case.dev API.
 */

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  FormatDocumentRequest,
  FormatDocumentResponse,
  ParsedInput,
  TemplateVariable,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

const CASE_API_BASE_URL = process.env.NEXT_PUBLIC_CASE_API_URL || 'https://api.case.dev';
const DEFAULT_MODEL = 'openai/gpt-4o';

// ============================================================================
// LLM Chat Completions
// ============================================================================

/**
 * Send a chat completion request to Case.dev LLM API
 */
export async function chatCompletion(
  request: ChatCompletionRequest
): Promise<ChatCompletionResponse> {
  try {
    const response = await fetch('/api/llm/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        messages: request.messages,
        temperature: request.temperature ?? 0.3,
        max_tokens: request.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `API error: ${response.status} - ${error}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || data.content,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// ============================================================================
// Natural Language Parsing
// ============================================================================

/**
 * Parse natural language input to extract template variables
 */
export async function parseNaturalLanguage(
  text: string,
  variables: TemplateVariable[],
  templateContext?: { name: string; category: string }
): Promise<ParsedInput> {
  const variableDescriptions = variables
    .map((v) => {
      let description = v.helpText || '';
      // Add options info for select fields to help LLM match values
      if (v.type === 'select' && v.options) {
        const optionValues = v.options.join(', ');
        description = description
          ? `${description}. Valid values: ${optionValues}`
          : `Valid values: ${optionValues}`;
      }
      return `- ${v.name} (${v.type}): ${v.label}${description ? ` - ${description}` : ''}`;
    })
    .join('\n');

  // Build template-specific context
  let templateHint = '';
  if (templateContext) {
    templateHint = `\nThis is for a "${templateContext.name}" document (category: ${templateContext.category}).`;
  }

  const systemPrompt = `You are a legal document assistant that extracts structured data from natural language input.${templateHint}

Given a user's description, extract values for the following template variables:
${variableDescriptions}

Return a JSON object with:
1. "variables": An object mapping variable names to their extracted values
2. "confidence": A number from 0 to 1 indicating how confident you are in the extraction
3. "suggestions": An array of strings suggesting what additional information might be needed

Rules:
- Extract ALL variables that can be reasonably inferred from the input
- Be flexible in matching - for example:
  - "Acme Corp" could be employer_name, company_name, client_name, landlord_name, party_a_name, etc. depending on context
  - "$150,000" or "150k" should be extracted as 150000 for salary/currency fields
  - "California" or "CA" should be extracted for state fields
  - "full-time" or "full time" should match employment_type
  - "remote" or "work from home" should match work_location
- For dates, use ISO format (YYYY-MM-DD)
- For currency/numbers, extract just the numeric value (no $ or commas)
- For boolean fields, infer true/false from context (e.g., "with health insurance" = health_insurance: true)
- For select fields, match to the closest valid option value
- If a value is ambiguous, don't include it and add a suggestion instead

Return ONLY valid JSON, no other text.`;

  const response = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: text },
    ],
    temperature: 0,
    maxTokens: 4096,
  });

  if (!response.success || !response.content) {
    return {
      variables: {},
      confidence: 0,
      unmatchedText: text,
    };
  }

  try {
    // Strip markdown code blocks if present
    let content = response.content.trim();
    if (content.startsWith('```json')) {
      content = content.slice(7);
    } else if (content.startsWith('```')) {
      content = content.slice(3);
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3);
    }
    content = content.trim();

    // Try to parse the JSON response
    const parsed = JSON.parse(content);

    return {
      variables: parsed.variables || {},
      confidence: parsed.confidence || 0,
      suggestions: parsed.suggestions || [],
    };
  } catch {
    return {
      variables: {},
      confidence: 0,
      unmatchedText: text,
    };
  }
}

// ============================================================================
// Document Formatting
// ============================================================================

/**
 * Format document content to PDF, DOCX, or HTML via Case.dev Format API
 */
export async function formatDocument(
  request: FormatDocumentRequest
): Promise<FormatDocumentResponse> {
  try {
    const response = await fetch('/api/format', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `Format API error: ${response.status} - ${error}`,
        format: request.format,
      };
    }

    if (request.format === 'html') {
      const html = await response.text();
      return {
        success: true,
        data: html,
        format: 'html',
      };
    }

    // For PDF and DOCX, return as blob
    const blob = await response.blob();
    return {
      success: true,
      data: blob,
      format: request.format,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      format: request.format,
    };
  }
}

/**
 * Convert markdown content to HTML
 */
export function markdownToHtml(markdown: string): string {
  // Basic markdown to HTML conversion
  // In production, use a proper markdown parser like marked or remark
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<div class="document-content"><p>${html}</p></div>`;
}

// ============================================================================
// Template Processing
// ============================================================================

/**
 * Process template content by replacing variables with values
 */
export function processTemplate(
  templateContent: string,
  values: Record<string, string | number | boolean>
): string {
  let processed = templateContent;

  // Replace simple variables: {{variableName}}
  for (const [key, value] of Object.entries(values)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    processed = processed.replace(regex, String(value));
  }

  // Process conditional blocks: {{#if variableName}}...{{else}}...{{/if}}
  // Run multiple passes to handle nested conditionals
  let prevProcessed = '';
  while (prevProcessed !== processed) {
    prevProcessed = processed;
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g;
    processed = processed.replace(conditionalRegex, (match, varName, ifContent, elseContent = '') => {
      const value = values[varName];
      const isTruthy = value !== undefined && value !== false && value !== '' && value !== 0;
      return isTruthy ? ifContent : elseContent;
    });
  }

  // Clean up any remaining unmatched variables with placeholder
  processed = processed.replace(/\{\{\s*\w+\s*\}\}/g, '[___]');

  // Clean up any remaining template syntax that wasn't processed
  processed = processed.replace(/\{\{#if\s+\w+\}\}/g, '');
  processed = processed.replace(/\{\{else\}\}/g, '');
  processed = processed.replace(/\{\{\/if\}\}/g, '');
  processed = processed.replace(/\{\{#unless\s+\w+\}\}/g, '');
  processed = processed.replace(/\{\{\/unless\}\}/g, '');

  return processed;
}

/**
 * Validate that all required variables have values
 */
export function validateVariables(
  variables: TemplateVariable[],
  values: Record<string, string | number | boolean>
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  for (const variable of variables) {
    const value = values[variable.name];

    // Check required
    if (variable.required && (value === undefined || value === '')) {
      errors[variable.name] = `${variable.label} is required`;
      continue;
    }

    // Skip validation if not required and empty
    if (!variable.required && (value === undefined || value === '')) {
      continue;
    }

    // Type-specific validation
    if (variable.validation) {
      const { pattern, min, max, minLength, maxLength } = variable.validation;

      if (pattern && typeof value === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          errors[variable.name] = `${variable.label} format is invalid`;
        }
      }

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          errors[variable.name] = `${variable.label} must be at least ${min}`;
        }
        if (max !== undefined && value > max) {
          errors[variable.name] = `${variable.label} must be at most ${max}`;
        }
      }

      if (typeof value === 'string') {
        if (minLength !== undefined && value.length < minLength) {
          errors[variable.name] = `${variable.label} must be at least ${minLength} characters`;
        }
        if (maxLength !== undefined && value.length > maxLength) {
          errors[variable.name] = `${variable.label} must be at most ${maxLength} characters`;
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Document Generation
// ============================================================================

/**
 * Generate a complete document from template and values
 */
export async function generateDocument(
  templateContent: string,
  values: Record<string, string | number | boolean>,
  format: 'markdown' | 'html' | 'pdf' | 'docx' = 'markdown'
): Promise<{ success: boolean; content?: string | Blob; error?: string }> {
  // Process the template with values
  const processedContent = processTemplate(templateContent, values);

  if (format === 'markdown') {
    return { success: true, content: processedContent };
  }

  if (format === 'html') {
    const html = markdownToHtml(processedContent);
    return { success: true, content: html };
  }

  // For PDF and DOCX, use the format API
  const formatResult = await formatDocument({
    content: processedContent,
    format,
    options: {
      pageSize: 'letter',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    },
  });

  if (!formatResult.success) {
    return { success: false, error: formatResult.error };
  }

  return { success: true, content: formatResult.data };
}
