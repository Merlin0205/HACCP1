/**
 * AI Suggestions View Component
 * 
 * Zobrazuje AI návrhy změn s diff viewerem
 * Umožňuje uživateli schválit nebo zamítnout jednotlivé změny
 */

import React, { useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { ContentSuggestion } from '../services/aiContentSuggestions';
import { EditableNonCompliance } from '../types/reportEditor';

interface AISuggestionsViewProps {
  suggestions: ContentSuggestion[];
  nonCompliances: EditableNonCompliance[];
  onAccept: (suggestion: ContentSuggestion) => void;
  onReject: (suggestion: ContentSuggestion) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  summary: string;
}

const AISuggestionsView: React.FC<AISuggestionsViewProps> = ({
  suggestions,
  nonCompliances,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  summary,
}) => {
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(new Set());

  const toggleExpanded = (suggestionId: string) => {
    setExpandedSuggestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suggestionId)) {
        newSet.delete(suggestionId);
      } else {
        newSet.add(suggestionId);
      }
      return newSet;
    });
  };

  const getCategoryIcon = (category: ContentSuggestion['category']) => {
    switch (category) {
      case 'grammar': return '✍️';
      case 'clarity': return '💡';
      case 'professionalism': return '👔';
      case 'structure': return '🏗️';
      case 'specificity': return '🎯';
      default: return '📝';
    }
  };

  const getCategoryLabel = (category: ContentSuggestion['category']) => {
    switch (category) {
      case 'grammar': return 'Gramatika';
      case 'clarity': return 'Srozumitelnost';
      case 'professionalism': return 'Profesionalita';
      case 'structure': return 'Struktura';
      case 'specificity': return 'Konkrétnost';
      default: return 'Obecné';
    }
  };

  const getFieldLabel = (field: 'location' | 'finding' | 'recommendation') => {
    switch (field) {
      case 'location': return 'Místo';
      case 'finding': return 'Zjištění';
      case 'recommendation': return 'Doporučení';
    }
  };

  const getNonComplianceTitle = (ncId: string) => {
    const nc = nonCompliances.find(n => n.id === ncId);
    return nc ? nc.itemTitle : 'Neznámá neshoda';
  };

  if (suggestions.length === 0) {
    return (
      <div className="text-center p-12 bg-green-50 border border-green-200 rounded-lg">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-green-800 mb-2">Výborná práce!</h3>
        <p className="text-gray-700">AI nenašla žádné návrhy na vylepšení. Váš report vypadá profesionálně.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
              🤖 AI Návrhy Vylepšení
              <span className="text-sm font-normal bg-purple-600 text-white px-3 py-1 rounded-full">
                {suggestions.length} {suggestions.length === 1 ? 'návrh' : suggestions.length < 5 ? 'návrhy' : 'návrhů'}
              </span>
            </h3>
            <p className="text-gray-700">{summary}</p>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={onAcceptAll}
            className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            ✓ Přijmout vše ({suggestions.length})
          </button>
          <button
            onClick={onRejectAll}
            className="bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            ✗ Zamítnout vše
          </button>
        </div>
      </div>

      {/* Individual Suggestions */}
      <div className="space-y-4">
        {suggestions.map((suggestion, index) => {
          const suggestionId = `${suggestion.nonComplianceId}_${suggestion.field}`;
          const isExpanded = expandedSuggestions.has(suggestionId);

          return (
            <div
              key={suggestionId}
              className="border-2 border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 transition-colors"
            >
              {/* Suggestion Header */}
              <div
                className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleExpanded(suggestionId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{getCategoryIcon(suggestion.category)}</span>
                      <span className="font-semibold text-sm text-purple-600">
                        {getCategoryLabel(suggestion.category)}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-600">
                        {getNonComplianceTitle(suggestion.nonComplianceId)}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs font-semibold text-gray-600">
                        {getFieldLabel(suggestion.field)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{suggestion.reason}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
                        Jistota: {Math.round(suggestion.confidence * 100)}%
                      </div>
                    </div>
                  </div>
                  <div className="ml-4 text-gray-400">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </div>

              {/* Diff Viewer (Expandable) */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  <div className="bg-white">
                    <ReactDiffViewer
                      oldValue={suggestion.originalText}
                      newValue={suggestion.suggestedText}
                      splitView={false}
                      compareMethod={DiffMethod.WORDS}
                      styles={{
                        variables: {
                          light: {
                            diffViewerBackground: '#fff',
                            addedBackground: '#e6ffed',
                            addedColor: '#24292e',
                            removedBackground: '#ffeef0',
                            removedColor: '#24292e',
                            wordAddedBackground: '#acf2bd',
                            wordRemovedBackground: '#fdb8c0',
                          },
                        },
                        diffContainer: {
                          fontSize: '14px',
                          fontFamily: 'system-ui, -apple-system, sans-serif',
                        },
                      }}
                      useDarkTheme={false}
                      hideLineNumbers={true}
                      showDiffOnly={false}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-gray-50 p-4 flex gap-3 border-t border-gray-200">
                    <button
                      onClick={() => onAccept(suggestion)}
                      className="flex-1 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      ✓ Přijmout změnu
                    </button>
                    <button
                      onClick={() => onReject(suggestion)}
                      className="flex-1 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      ✗ Zamítnout
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AISuggestionsView;
