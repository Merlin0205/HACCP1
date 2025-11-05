/**
 * SmartTemplateSettingsScreen - Správa Smart Template šablon
 */

import React, { useState, useEffect } from 'react';
import { ReportTemplate } from '../types';
import { fetchReportTemplates, createReportTemplate, updateReportTemplate, deleteReportTemplate } from '../services/firestore/reportTemplates';
import { DEFAULT_TEMPLATE, DEFAULT_TEMPLATE_ID, DEFAULT_TEMPLATE_VERSION } from '../services/smartTemplate/defaultTemplate';
import { toast } from '../utils/toast';
import { PageHeader } from './PageHeader';
import { Card, CardBody, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { TextField, TextArea } from './ui/Input';
import { Badge } from './ui/Badge';
import { Modal } from './ui/Modal';
import { AppState } from '../types';
import { SECTION_THEMES } from '../constants/designSystem';
import { useAuth } from '../contexts/AuthContext';

interface SmartTemplateSettingsScreenProps {
  onBack: () => void;
}

export const SmartTemplateSettingsScreen: React.FC<SmartTemplateSettingsScreenProps> = ({ onBack }) => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplate | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);

  // Formulář pro vytvoření/úpravu
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    version: '1',
    isDefault: false
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const fetchedTemplates = await fetchReportTemplates();
      setTemplates(fetchedTemplates);
    } catch (error) {
      console.error('[SmartTemplateSettingsScreen] Chyba při načítání šablon:', error);
      toast.error('Chyba při načítání šablon');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setFormData({
      name: '',
      description: '',
      version: '1',
      isDefault: false
    });
    setEditingTemplate(null);
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template: ReportTemplate) => {
    setFormData({
      name: template.name,
      description: template.description || '',
      version: template.version,
      isDefault: template.isDefault
    });
    setEditingTemplate(template);
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!formData.name.trim()) {
      toast.error('Název šablony je povinný');
      return;
    }

    if (!user) {
      toast.error('Uživatel není přihlášený');
      return;
    }

    try {
      if (editingTemplate) {
        // Aktualizovat existující šablonu
        await updateReportTemplate(editingTemplate.id, {
          name: formData.name,
          description: formData.description,
          version: formData.version,
          isDefault: formData.isDefault
        });
        toast.success('Šablona byla aktualizována');
      } else {
        // Vytvořit novou šablonu
        await createReportTemplate({
          name: formData.name,
          description: formData.description,
          version: formData.version,
          rules: DEFAULT_TEMPLATE, // Nová šablona začíná s default pravidly
          isDefault: formData.isDefault,
          createdBy: user.uid
        });
        toast.success('Šablona byla vytvořena');
      }

      setShowCreateModal(false);
      await loadTemplates();
    } catch (error) {
      console.error('[SmartTemplateSettingsScreen] Chyba při ukládání:', error);
      toast.error('Chyba při ukládání šablony');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteReportTemplate(templateId);
      toast.success('Šablona byla smazána');
      setShowDeleteModal(null);
      await loadTemplates();
    } catch (error) {
      console.error('[SmartTemplateSettingsScreen] Chyba při mazání:', error);
      toast.error('Chyba při mazání šablony');
    }
  };

  const handleSetDefault = async (templateId: string) => {
    try {
      // Odstranit default z ostatních šablon
      const updates = templates
        .filter(t => t.id !== templateId && t.isDefault)
        .map(t => updateReportTemplate(t.id, { isDefault: false }));

      await Promise.all(updates);

      // Nastavit jako default
      await updateReportTemplate(templateId, { isDefault: true });
      toast.success('Výchozí šablona byla nastavena');
      await loadTemplates();
    } catch (error) {
      console.error('[SmartTemplateSettingsScreen] Chyba při nastavení default:', error);
      toast.error('Chyba při nastavení výchozí šablony');
    }
  };

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto">
        <PageHeader
          section={SECTION_THEMES[AppState.SMART_TEMPLATE_SETTINGS]}
          title="Smart Template šablony"
          description="Správa šablon pro Smart Template systém"
        />
        <div className="text-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Načítání šablon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto">
      <PageHeader
        section={SECTION_THEMES[AppState.SMART_TEMPLATE_SETTINGS]}
        title="Smart Template šablony"
        description="Správa šablon pro Smart Template systém"
      />

      {/* Akční tlačítka */}
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="primary"
          onClick={handleCreateTemplate}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          Vytvořit novou šablonu
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Zpět
        </Button>
      </div>

      {/* Seznam šablon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <Card key={template.id} hover>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {template.name}
                  </h3>
                  {template.isDefault && (
                    <Badge color="success" className="mt-1">
                      Výchozí
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="text-gray-500 hover:text-primary transition-colors"
                    title="Upravit"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowDeleteModal(template.id)}
                    className="text-gray-500 hover:text-red-600 transition-colors"
                    title="Smazat"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Verze:</span> {template.version}
                </div>
                {template.description && (
                  <p className="text-sm text-gray-600">{template.description}</p>
                )}
                <div className="text-xs text-gray-500">
                  Vytvořeno: {new Date(template.createdAt).toLocaleDateString('cs-CZ')}
                </div>
                {!template.isDefault && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSetDefault(template.id)}
                    fullWidth
                  >
                    Nastavit jako výchozí
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {templates.length === 0 && (
        <Card>
          <CardBody>
            <div className="text-center p-8 text-gray-500">
              <p className="mb-4">Zatím nejsou vytvořeny žádné šablony.</p>
              <Button variant="primary" onClick={handleCreateTemplate}>
                Vytvořit první šablonu
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Modal pro vytvoření/úpravu */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={editingTemplate ? 'Upravit šablonu' : 'Vytvořit novou šablonu'}
      >
        <div className="space-y-4">
          <TextField
            label="Název šablony *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Např. HACCP Standard Template"
          />
          <TextArea
            label="Popis"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            placeholder="Krátký popis šablony..."
          />
          <TextField
            label="Verze"
            value={formData.version}
            onChange={(e) => setFormData({ ...formData, version: e.target.value })}
            placeholder="1"
          />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              checked={formData.isDefault}
              onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Nastavit jako výchozí šablonu
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Zrušit
            </Button>
            <Button variant="primary" onClick={handleSaveTemplate}>
              {editingTemplate ? 'Uložit změny' : 'Vytvořit'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal pro potvrzení smazání */}
      <Modal
        isOpen={showDeleteModal !== null}
        onClose={() => setShowDeleteModal(null)}
        title="Smazat šablonu"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Opravdu chcete smazat šablonu "{templates.find(t => t.id === showDeleteModal)?.name}"?
            Tato akce je nevratná.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setShowDeleteModal(null)}>
              Zrušit
            </Button>
            <Button
              variant="danger"
              onClick={() => showDeleteModal && handleDeleteTemplate(showDeleteModal)}
            >
              Smazat
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SmartTemplateSettingsScreen;


