'use client';

/**
 * Form Wizard Component
 * 
 * Multi-step form for filling document template variables.
 * Supports all variable types, conditional sections, validation,
 * and natural language input for AI-assisted form filling.
 */

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Sparkle,
  SpinnerGap,
  WarningCircle
} from '@phosphor-icons/react';
import type { DocumentTemplate, TemplateSection, TemplateVariable } from '@/lib/types';
import { parseNaturalLanguage, validateVariables } from '@/lib/case-api';

interface FormWizardProps {
  template: DocumentTemplate;
  initialValues?: Record<string, string | number | boolean>;
  onComplete: (values: Record<string, string | number | boolean>) => void;
  onCancel: () => void;
}

// Helper functions for template-specific examples
function getPlaceholderForTemplate(templateId: string): string {
  const placeholders: Record<string, string> = {
    'employment-agreement': 'Describe the employment details: position, salary, location, benefits...',
    'nda-mutual': 'Describe the NDA: parties involved, purpose, duration...',
    'contractor-agreement': 'Describe the contractor engagement: services, rate, duration...',
    'consulting-agreement': 'Describe the consulting project: scope, fees, timeline...',
    'lease-agreement': 'Describe the rental: property, rent, lease term...',
  };
  return placeholders[templateId] || 'Describe your document details in plain English...';
}

function getExampleForTemplate(templateId: string): string {
  const examples: Record<string, string> = {
    'employment-agreement': 'Software engineer position at Acme Corp in California, $150,000 annual salary, full-time, starting January 15, 2025, with health insurance and 20 days PTO',
    'nda-mutual': 'NDA between TechCorp Inc (Delaware corporation) and StartupXYZ LLC (California) for discussing a potential acquisition, 2 year term',
    'contractor-agreement': 'Web development contractor Jane Smith, $100/hour, maximum 80 hours per month, 30-day termination notice, remote work',
    'consulting-agreement': 'Strategy consulting engagement with McKinsey for digital transformation, $50,000 fixed fee, 3 month project starting March 1',
    'lease-agreement': '2 bedroom apartment at 123 Main St, San Francisco, $3,500/month rent, 12 month lease starting February 1, $7,000 security deposit',
  };
  return examples[templateId] || 'Enter your document details here...';
}

export function FormWizard({
  template,
  initialValues = {},
  onComplete,
  onCancel,
}: FormWizardProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);

  // Initialize values with defaults for boolean fields (default to false/No)
  const defaultValues = useMemo(() => {
    const defaults: Record<string, string | number | boolean> = {};
    for (const section of template.sections) {
      for (const variable of section.variables) {
        if (variable.type === 'boolean') {
          defaults[variable.name] = false;
        }
      }
    }
    return { ...defaults, ...initialValues };
  }, [template.sections, initialValues]);

  const [values, setValues] = useState<Record<string, string | number | boolean>>(defaultValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nlInput, setNlInput] = useState('');
  const [isParsingNL, setIsParsingNL] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);
  const [nlSuccess, setNlSuccess] = useState<string | null>(null);

  // Get visible sections based on conditional logic
  const visibleSections = useMemo(() => {
    return template.sections.filter((section) => {
      if (!section.showIf) return true;
      const { variableId, value } = section.showIf;
      return values[variableId] === value;
    });
  }, [template.sections, values]);

  const currentSection = visibleSections[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === visibleSections.length - 1;

  // Get all variables from all visible sections for validation
  const allVisibleVariables = useMemo(() => {
    return visibleSections.flatMap((section) => section.variables);
  }, [visibleSections]);

  // Validate current section
  const validateCurrentSection = useCallback(() => {
    if (!currentSection) return true;
    
    const { isValid, errors: validationErrors } = validateVariables(
      currentSection.variables,
      values
    );
    
    setErrors(validationErrors);
    return isValid;
  }, [currentSection, values]);

  // Handle value change
  const handleValueChange = useCallback(
    (variableId: string, value: string | number | boolean) => {
      setValues((prev) => ({ ...prev, [variableId]: value }));
      // Clear error for this field
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[variableId];
        return newErrors;
      });
    },
    []
  );

  // Handle natural language input
  const handleNLParse = useCallback(async () => {
    if (!nlInput.trim()) return;

    setIsParsingNL(true);
    setNlError(null);
    setNlSuccess(null);

    try {
      const result = await parseNaturalLanguage(nlInput, allVisibleVariables);
      const foundCount = Object.keys(result.variables).length;
      const totalCount = allVisibleVariables.length;

      if (foundCount > 0) {
        setValues((prev) => ({ ...prev, ...result.variables }));
        setNlInput('');
        setNlSuccess(`Found ${foundCount} out of ${totalCount} fields`);
      } else {
        setNlError('Could not extract any values from your input. Please try being more specific.');
      }
    } catch (error) {
      setNlError('Failed to parse input. Please try again or fill in the fields manually.');
    } finally {
      setIsParsingNL(false);
    }
  }, [nlInput, allVisibleVariables]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    if (validateCurrentSection()) {
      if (isLastSection) {
        // Validate all sections before completing
        const { isValid, errors: allErrors } = validateVariables(allVisibleVariables, values);
        if (isValid) {
          onComplete(values);
        } else {
          setErrors(allErrors);
        }
      } else {
        setCurrentSectionIndex((prev) => prev + 1);
      }
    }
  }, [validateCurrentSection, isLastSection, allVisibleVariables, values, onComplete]);

  const handlePrevious = useCallback(() => {
    if (!isFirstSection) {
      setCurrentSectionIndex((prev) => prev - 1);
    }
  }, [isFirstSection]);

  // Render a single variable field
  const renderVariable = (variable: TemplateVariable) => {
    const value = values[variable.name];
    const error = errors[variable.name];

    const commonProps = {
      id: variable.id,
      'aria-invalid': !!error,
      'aria-describedby': error ? `${variable.id}-error` : undefined,
    };

    return (
      <div key={variable.id} className="space-y-2">
        <Label htmlFor={variable.id}>
          {variable.label}
          {variable.required && <span className="text-destructive ml-1">*</span>}
        </Label>

        {variable.type === 'text' && (
          <Input
            {...commonProps}
            type="text"
            placeholder={variable.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleValueChange(variable.name, e.target.value)}
          />
        )}

        {variable.type === 'number' && (
          <Input
            {...commonProps}
            type="number"
            placeholder={variable.placeholder}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => handleValueChange(variable.name, e.target.value ? Number(e.target.value) : '')}
          />
        )}

        {variable.type === 'date' && (
          <Input
            {...commonProps}
            type="date"
            value={(value as string) || ''}
            onChange={(e) => handleValueChange(variable.name, e.target.value)}
          />
        )}

        {variable.type === 'textarea' && (
          <Textarea
            {...commonProps}
            placeholder={variable.placeholder}
            value={(value as string) || ''}
            onChange={(e) => handleValueChange(variable.name, e.target.value)}
            rows={3}
          />
        )}

        {variable.type === 'select' && variable.options && (
          <Select
            value={(value as string) || ''}
            onValueChange={(val) => val !== null && handleValueChange(variable.name, val)}
          >
            <SelectTrigger {...commonProps} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {variable.options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1).replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {variable.type === 'boolean' && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={value === true}
              onClick={() => handleValueChange(variable.name, !value)}
              className={`
                relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent 
                transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 
                focus-visible:ring-ring focus-visible:ring-offset-2
                ${value === true ? 'bg-primary' : 'bg-muted'}
              `}
            >
              <span
                className={`
                  pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg 
                  ring-0 transition duration-200 ease-in-out
                  ${value === true ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
            <span className="text-sm text-muted-foreground">
              {value === true ? 'Yes' : 'No'}
            </span>
          </div>
        )}

        {variable.helpText && (
          <p className="text-xs text-muted-foreground">{variable.helpText}</p>
        )}

        {error && (
          <p id={`${variable.id}-error`} className="text-xs text-destructive flex items-center gap-1">
            <WarningCircle className="h-3 w-3" />
            {error}
          </p>
        )}
      </div>
    );
  };

  if (!currentSection) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">No sections available for this template.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Section {currentSectionIndex + 1} of {visibleSections.length}
        </span>
        <div className="flex gap-1">
          {visibleSections.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-8 rounded-full transition-colors ${
                index === currentSectionIndex
                  ? 'bg-primary'
                  : index < currentSectionIndex
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Natural Language Input */}
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkle className="h-4 w-4 text-primary" />
            AI-Assisted Form Filling
          </CardTitle>
          <CardDescription>
            Describe your document details in plain English and we&apos;ll fill in the fields for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            placeholder={getPlaceholderForTemplate(template.id)}
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Try this example:</span>{' '}
            &quot;{getExampleForTemplate(template.id)}&quot;
          </p>
          <div className="flex items-center justify-between">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNLParse}
              disabled={isParsingNL || !nlInput.trim()}
            >
              {isParsingNL ? (
                <>
                  <SpinnerGap className="h-4 w-4 animate-spin mr-2" />
                  Parsing...
                </>
              ) : (
                <>
                  <Sparkle className="h-4 w-4 mr-2" />
                  Parse & Fill Fields
                </>
              )}
            </Button>
            {nlError && (
              <p className="text-xs text-destructive">
                {nlError}
              </p>
            )}
            {nlSuccess && (
              <p className="text-xs text-green-600 dark:text-green-500">
                {nlSuccess}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Section Form */}
      <Card>
        <CardHeader>
          <CardTitle>{currentSection.title}</CardTitle>
          {currentSection.description && (
            <CardDescription>{currentSection.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {currentSection.variables.map(renderVariable)}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t pt-6">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {!isFirstSection && (
              <Button variant="outline" onClick={handlePrevious}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            )}
          </div>
          <Button onClick={handleNext}>
            {isLastSection ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Complete
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Quick fill summary */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Filled Fields Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(values)
              .filter(([_, v]) => v !== '' && v !== undefined)
              .map(([key, value]) => {
                const variable = allVisibleVariables.find((v) => v.name === key);
                return (
                  <span
                    key={key}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {variable?.label || key}: {String(value).substring(0, 20)}
                    {String(value).length > 20 ? '...' : ''}
                  </span>
                );
              })}
            {Object.keys(values).filter((k) => values[k] !== '' && values[k] !== undefined).length === 0 && (
              <span className="text-xs text-muted-foreground">No fields filled yet</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FormWizard;
