import React from 'react';
import { AuditStatus, ReportStatus } from '../types';
import { Badge } from '../components/ui/Badge';

/**
 * Helper function to get status badge for audit
 */
export const getAuditStatusBadge = (status: AuditStatus) => {
  const badges: Record<AuditStatus, { variant: 'default' | 'success' | 'warning' | 'error' | 'neutral', label: string }> = {
    [AuditStatus.DRAFT]: { variant: 'neutral', label: 'Nezapočatý' },
    [AuditStatus.NOT_STARTED]: { variant: 'neutral', label: 'Nezapočatý' },
    [AuditStatus.IN_PROGRESS]: { variant: 'info', label: 'Probíhá' },
    [AuditStatus.COMPLETED]: { variant: 'success', label: 'Dokončen' },
    [AuditStatus.REVISED]: { variant: 'warning', label: 'Změny' },
    [AuditStatus.LOCKED]: { variant: 'success', label: 'Dokončen' },
  };

  const config = badges[status] || badges[AuditStatus.DRAFT];
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

/**
 * Helper function to get report status badge
 */
export const getReportStatusBadge = (status: ReportStatus, isGenerating?: boolean) => {
  const badges: Record<ReportStatus, { variant: 'default' | 'success' | 'warning' | 'error', label: string }> = {
    [ReportStatus.PENDING]: { variant: 'warning', label: 'Čeká' },
    [ReportStatus.GENERATING]: { variant: 'warning', label: 'Generuje se...' },
    [ReportStatus.DONE]: { variant: 'success', label: 'Hotovo' },
    [ReportStatus.ERROR]: { variant: 'error', label: 'Chyba' },
  };

  const config = badges[status] || badges[ReportStatus.PENDING];
  const displayLabel = isGenerating ? 'Generuje se...' : config.label;
  
  return (
    <Badge variant={config.variant} className={isGenerating ? 'animate-pulse' : ''}>
      {displayLabel}
    </Badge>
  );
};
