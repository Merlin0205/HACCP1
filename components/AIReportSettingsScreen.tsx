import React, { useState, useEffect } from 'react';
import { Spinner } from 'flowbite-react';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import { PageHeader } from './PageHeader';
import { AppState } from '../types';
import { SECTION_THEMES } from '../constants/designSystem';
import { fetchAIPromptsConfig, saveAIPromptsConfig, initializeAIPromptsConfig } from '../services/firestore/settings';
import { toast } from '../utils/toast';
import { SmartPromptEditor, VariableDefinition } from './ui/SmartPromptEditor';
import {
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';

// --- Configuration Types ---
interface AIPrompt {
  name: string;
  description: string;
  template: string;
  variables: string[];
}

interface AIPromptsConfig {
  prompts: {
    'rewrite-finding': AIPrompt;
    'generate-recommendation': AIPrompt;
  };
}

// --- Variable Definitions (Localization & Descriptions) ---
const CONTENT_VARIABLES: VariableDefinition[] = [
  { key: 'finding', label: 'Popis neshody', description: 'Původní text zjištění zadaný uživatelem.' },
  { key: 'sectionTitle', label: 'Název sekce', description: 'Název sekce auditu (např. "Hygiena osob").' },
  { key: 'itemTitle', label: 'Název položky', description: 'Název kontrolované položky (např. "Mytí rukou").' },
  { key: 'itemDescription', label: 'Popis položky', description: 'Doplňující popis nebo legislativní požadavek položky.' },
];

interface AIConfigurationScreenProps {
  onBack: () => void;
}

const AIConfigurationScreen: React.FC<AIConfigurationScreenProps> = ({ onBack }) => {
  const { setDirty, isDirty, checkUnsavedChanges } = useUnsavedChanges();

  const handleBack = () => {
    checkUnsavedChanges(() => {
      onBack();
    });
  };

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promptsConfig, setPromptsConfig] = useState<AIPromptsConfig | null>(null);

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      try {
        await initializeAIPromptsConfig();

        const pConfig = await fetchAIPromptsConfig();
        if (pConfig) setPromptsConfig(pConfig);

      } catch (error) {
        console.error("Error loading AI settings:", error);
        toast.error("Nepodařilo se načíst nastavení AI");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (promptsConfig) {
        await saveAIPromptsConfig(promptsConfig);
      }
      setDirty(false);
      toast.success("Nastavení bylo úspěšně uloženo");
    } catch (error) {
      console.error("Error saving AI settings:", error);
      toast.error("Chyba při ukládání nastavení");
    } finally {
      setSaving(false);
    }
  };

  // --- Config Handlers ---
  const updatePrompt = (key: 'rewrite-finding' | 'generate-recommendation', field: keyof AIPrompt, value: any) => {
    if (!promptsConfig) return;
    setPromptsConfig({
      ...promptsConfig,
      prompts: {
        ...promptsConfig.prompts,
        [key]: { ...promptsConfig.prompts[key], [field]: value }
      }
    });
    setDirty(true);
  };


  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto pb-24 px-4 sm:px-6 lg:px-8">
      <PageHeader
        section={SECTION_THEMES[AppState.SETTINGS]}
        title="AI Konfigurace"
        description="Správa automatického generování reportů a textů"
        onBack={handleBack}
        action={
          <button
            type="button"
            onClick={isDirty ? handleSave : undefined}
            disabled={saving}
            className={`
                relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2
                ${isDirty
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:-translate-y-0.5'
                : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-default'}
            `}
          >
            {saving && <Spinner size="sm" light={true} className="mr-2" />}
            {saving ? 'Ukládám...' : (isDirty ? 'Uložit změny' : 'Uloženo')}
          </button>
        }
      />


      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* === OBSAH A NESHODY === */}
        {promptsConfig && (
          <div className="grid grid-cols-1 gap-6">
            {Object.entries(promptsConfig.prompts).map(([key, value]) => {
              const prompt = value as AIPrompt;
              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-200 shadow-sm group hover:border-indigo-200 transition-colors">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-100 transition-colors">
                        <ChatBubbleLeftRightIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{prompt.name}</h3>
                        <p className="text-xs text-gray-500">{prompt.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-6">
                    <SmartPromptEditor
                      value={prompt.template}
                      onChange={(val) => updatePrompt(key as any, 'template', val)}
                      variables={CONTENT_VARIABLES}
                      rows={6}
                      placeholder={`Zadejte instrukce...`}
                      helperText="Tip: Napište / pro vložení proměnné."
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


    </div>
  );
};

export default AIConfigurationScreen;
