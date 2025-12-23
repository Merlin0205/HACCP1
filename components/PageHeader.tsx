import React from 'react';
import { SectionTheme, DESIGN_TOKENS } from '../constants/designSystem';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumbs, BreadcrumbItem } from './ui/Breadcrumbs';

interface PageHeaderProps {
  section: SectionTheme;
  title: string;
  description?: string;
  action?: React.ReactNode;
  onBack?: () => void;
  breadcrumbs?: BreadcrumbItem[];
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  section,
  title,
  description,
  action,
  onBack,
  breadcrumbs,
}) => {
  const Icon = section.icon;

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Breadcrumbs */}
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Back Button */}
          {onBack && (
            <button
              onClick={onBack}
              className="mt-2 p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Zpět"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}

          {/* Icon with gradient background */}
          <div
            className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shadow-md"
            style={{
              background: `linear-gradient(to bottom right, ${section.colors.primary}, ${section.colors.darkest})`
            }}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h1 className={`${DESIGN_TOKENS.typography.h1} text-gray-900 mb-1`}>
              {title}
            </h1>
            {description && (
              <p className={`${DESIGN_TOKENS.typography.body} text-gray-600`}>
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Action Button */}
        {action && (
          <div className="flex-shrink-0">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};


