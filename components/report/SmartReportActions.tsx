/**
 * SmartReportActions - tlačítka akcí pro Smart Template
 */

import React, { useState } from 'react';
import { Report } from '../../types';
import { ReportDocument } from '../../types/smartReport';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { Card, CardBody } from '../ui/Card';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../../firebaseConfig';
import { toast } from '../../utils/toast';

interface SmartReportActionsProps {
  report: Report;
  document: ReportDocument;
  mode: 'draft' | 'final';
  finalVersions: Array<{
    versionId: string;
    createdAt: string;
    createdBy: string;
    createdByName?: string;
  }>;
  onSaveAsFinal: () => void;
  onLoadFinalVersion: (versionId: string) => void;
  onRegenerate: () => void;
}

export const SmartReportActions: React.FC<SmartReportActionsProps> = ({
  report,
  document,
  mode,
  finalVersions,
  onSaveAsFinal,
  onLoadFinalVersion,
  onRegenerate
}) => {
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedVersionForLoad, setSelectedVersionForLoad] = useState<string>('');

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const generateSmartReportPdf = httpsCallable(functions, 'generateSmartReportPdf');
      const result = await generateSmartReportPdf({
        reportDocument: document,
        reportId: report.id
      });

      const data = result.data as { storagePath: string };
      
      if (!data.storagePath) {
        throw new Error('Storage path nebyl vrácen ze serveru');
      }

      // Získat download URL pomocí Storage SDK
      const storageRef = ref(storage, data.storagePath);
      const url = await getDownloadURL(storageRef);
      
      // Otevřít PDF v novém okně
      window.open(url, '_blank');
      
      toast.success('PDF úspěšně vygenerováno');
    } catch (error) {
      console.error('[SmartReportActions] Chyba při generování PDF:', error);
      toast.error('Chyba při generování PDF: ' + (error instanceof Error ? error.message : 'Neznámá chyba'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleLoadFinalVersion = () => {
    if (!selectedVersionForLoad) {
      toast.error('Vyberte verzi k načtení');
      return;
    }
    onLoadFinalVersion(selectedVersionForLoad);
  };

  return (
    <Card>
      <CardBody>
        <div className="space-y-4">
          {/* Uložit jako finální verzi */}
          {mode === 'draft' && (
            <Button
              variant="primary"
              onClick={onSaveAsFinal}
              fullWidth
            >
              Uložit jako finální verzi
            </Button>
          )}

          {/* Načíst finální verzi */}
          {finalVersions.length > 0 && (
            <div className="space-y-2">
              <Select
                label="Načíst finální verzi"
                options={finalVersions.map(v => ({
                  value: v.versionId,
                  label: `${v.versionId}${v.createdByName ? ` - ${v.createdByName}` : ''} - ${new Date(v.createdAt).toLocaleDateString('cs-CZ')}`
                }))}
                value={selectedVersionForLoad}
                onChange={(e) => setSelectedVersionForLoad(e.target.value)}
              />
              <Button
                variant="secondary"
                onClick={handleLoadFinalVersion}
                disabled={!selectedVersionForLoad}
                fullWidth
              >
                Načíst verzi
              </Button>
            </div>
          )}

          {/* Regenerovat z nové šablony */}
          <Button
            variant="ghost"
            onClick={onRegenerate}
            fullWidth
          >
            Regenerovat z nové šablony
          </Button>

          {/* Vygenerovat PDF (server) */}
          <Button
            variant="primary"
            onClick={handleGeneratePdf}
            isLoading={isGeneratingPdf}
            disabled={isGeneratingPdf}
            fullWidth
          >
            Vygenerovat PDF (server)
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};


