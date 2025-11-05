/**
 * SmartTemplateSelector - výběr šablony a verze
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { Card, CardBody } from '../ui/Card';
import { ReportTemplate } from '../../types';
import { fetchReportTemplates, createReportTemplate, fetchDefaultTemplate, fetchReportTemplate } from '../../services/firestore/reportTemplates';
import { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_ID, DEFAULT_TEMPLATE_VERSION } from '../../services/smartTemplate/defaultTemplate';
import { toast } from '../../utils/toast';
import { useAuth } from '../../contexts/AuthContext';

interface SmartTemplateSelectorProps {
  selectedTemplateId?: string;
  selectedVersion?: string;
  onTemplateSelect: (templateId: string, version: string) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

export const SmartTemplateSelector: React.FC<SmartTemplateSelectorProps> = ({
  selectedTemplateId,
  selectedVersion,
  onTemplateSelect,
  onGenerate,
  isGenerating = false
}) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [creatingDefault, setCreatingDefault] = useState(false);

  const createDefaultTemplateIfNeeded = useCallback(async (): Promise<ReportTemplate | null> => {
    if (!currentUser) {
      console.warn('[SmartTemplateSelector] Uživatel není přihlášený, nelze vytvořit default template');
      return null;
    }

    try {
      setCreatingDefault(true);
      
      // Zkontrolovat jestli už default template existuje
      const existingDefault = await fetchDefaultTemplate();
      if (existingDefault) {
        return existingDefault;
      }

      // Vytvořit default template
      const templateId = await createReportTemplate({
        name: 'HACCP Default Template',
        description: 'Výchozí šablona pro HACCP reporty',
        version: DEFAULT_TEMPLATE_VERSION,
        rules: DEFAULT_TEMPLATE,
        isDefault: true,
        createdBy: currentUser.uid
      });

      // Načíst vytvořenou šablonu
      const newTemplate = await fetchReportTemplate(templateId);
      if (newTemplate) {
        toast.success('Výchozí šablona byla automaticky vytvořena');
        return newTemplate;
      }
    } catch (error) {
      console.error('[SmartTemplateSelector] Chyba při vytváření default template:', error);
      toast.error('Chyba při vytváření výchozí šablony');
    } finally {
      setCreatingDefault(false);
    }

    return null;
  }, [currentUser]);

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      let fetchedTemplates = await fetchReportTemplates();
      
      // Pokud žádné šablony neexistují, vytvořit default
      if (fetchedTemplates.length === 0) {
        const defaultTemplate = await createDefaultTemplateIfNeeded();
        if (defaultTemplate) {
          fetchedTemplates = [defaultTemplate];
        }
      }
      
      setTemplates(fetchedTemplates);
      
      // Pokud není vybraná šablona, použít default nebo první
      if (!selectedTemplateId && fetchedTemplates.length > 0) {
        const defaultTemplate = fetchedTemplates.find(t => t.isDefault) || fetchedTemplates[0];
        if (defaultTemplate) {
          setSelectedTemplate(defaultTemplate);
          onTemplateSelect(defaultTemplate.id, defaultTemplate.version);
        }
      }
    } catch (error) {
      console.error('[SmartTemplateSelector] Chyba při načítání šablon:', error);
      toast.error('Chyba při načítání šablon');
    } finally {
      setLoading(false);
    }
  }, [createDefaultTemplateIfNeeded, selectedTemplateId, onTemplateSelect]);

  useEffect(() => {
    // Čekat až se načte uživatel před načtením šablon
    if (!authLoading && currentUser) {
      loadTemplates();
    }
  }, [authLoading, currentUser, loadTemplates]);

  useEffect(() => {
    if (selectedTemplateId && templates.length > 0) {
      const template = templates.find(t => t.id === selectedTemplateId);
      if (template) {
        setSelectedTemplate(template);
      }
    }
  }, [selectedTemplateId, templates]);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      onTemplateSelect(template.id, template.version);
    }
  };

  if (authLoading || loading || creatingDefault) {
    return (
      <Card>
        <CardBody>
          <div className="text-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">
              {creatingDefault ? 'Vytváření výchozí šablony...' : authLoading ? 'Načítání...' : 'Načítání šablon...'}
            </p>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <Select
              label="Vyberte šablonu"
              options={templates.map(t => ({
                value: t.id,
                label: `${t.name}${t.isDefault ? ' (Výchozí)' : ''} - v${t.version}`
              }))}
              value={selectedTemplateId || ''}
              onChange={(e) => handleTemplateChange(e.target.value)}
            />
          </div>
          {selectedTemplate && (
            <div className="text-sm text-gray-600">
              <p>Verze: {selectedTemplate.version}</p>
              {selectedTemplate.description && (
                <p className="text-xs text-gray-500 mt-1">{selectedTemplate.description}</p>
              )}
            </div>
          )}
          <Button
            variant="primary"
            onClick={onGenerate}
            isLoading={isGenerating}
            disabled={!selectedTemplate || isGenerating}
          >
            Vygenerovat layout
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

