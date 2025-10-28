import React from 'react';
import { ReportData } from '../types';

interface SummaryReportProps {
  reportData: ReportData | undefined; // Může být undefined, když se generuje
}

const SummaryReportContent: React.FC<SummaryReportProps> = ({ reportData }) => {
  
  if (!reportData || !reportData.summary || !reportData.sections) {
    return (
      <div className="text-center p-6 my-6">
        <p className="font-semibold text-gray-600">Shrnutí a doporučení se generují...</p>
      </div>
    );
  }

  const { summary } = reportData;

  return (
    <div className="my-6 page-break-avoid">
        <h3 className="text-xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2 mb-4">{summary.title || 'Souhrnné hodnocení auditu'}</h3>
        
        <div className="space-y-4 prose prose-sm max-w-none">
            <div>
                <h4 className="font-semibold text-gray-700">Celkový souhrn a doporučení:</h4>
                <p className="text-gray-600 mt-1">{summary.evaluation_text || 'Žádné souhrnné hodnocení nebylo vygenerováno.'}</p>
            </div>

            {summary.key_findings && summary.key_findings.length > 0 && (
                <div>
                    <h4 className="font-semibold text-gray-700">Klíčová zjištění:</h4>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-gray-600">
                        {summary.key_findings.map((finding, index) => (
                            <li key={index}>{finding}</li>
                        ))}
                    </ul>
                </div>
            )}

            {summary.key_recommendations && summary.key_recommendations.length > 0 && (
                 <div>
                    <h4 className="font-semibold text-gray-700">Závěr a doporučení:</h4>
                    <ul className="list-disc list-inside space-y-1 mt-1 text-gray-600">
                        {summary.key_recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    </div>
  );
};

export default SummaryReportContent;
