import { BudgetItem } from './budget-item.model';
import { Epic } from './epic.model';

export const PROJECT_STATUS_VALUES = ['cost_estimate', 'in_progress', 'completed'] as const;
export type ProjectStatus = typeof PROJECT_STATUS_VALUES[number];
export const DEFAULT_PROJECT_STATUS: ProjectStatus = 'cost_estimate';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  cost_estimate: 'Estimativa de custo',
  in_progress: 'Em andamento',
  completed: 'Concluido'
};

export const isProjectStatus = (value?: string | null): value is ProjectStatus => {
  if (typeof value !== 'string') {
    return false;
  }
  const normalized = value.trim().toLowerCase();
  return PROJECT_STATUS_VALUES.includes(normalized as ProjectStatus);
};

export const normalizeProjectStatus = (value?: string | null): ProjectStatus => {
  if (typeof value === 'string') {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, '_');
    if (isProjectStatus(normalized)) {
      return normalized;
    }
  }
  return DEFAULT_PROJECT_STATUS;
};

export const getProjectStatusLabel = (status?: ProjectStatus | null): string => {
  const normalized = status ?? DEFAULT_PROJECT_STATUS;
  return PROJECT_STATUS_LABELS[normalized] ?? PROJECT_STATUS_LABELS[DEFAULT_PROJECT_STATUS];
};

export interface ProjectTotals {
  total?: number;
  costSubtotal?: number;
  marginAmount?: number;
  pointerAmount?: number;
  taxAmount?: number;
  [key: string]: number | undefined;
}

export interface Project {
  id: string;
  name: string;
  status?: ProjectStatus;
  devHourlyRate: number;
  poHourlyRate: number;
  qaHourlyRate: number;
  architectHourlyRate: number;
  designHourlyRate: number;
  opsHourlyRate: number;
  poPercentage: number;
  qaPercentage: number;
  architectPercentage: number;
  designPercentage: number;
  opsPercentage: number;
  taxPercentage: number;
  pointerPercentage: number;
  marginPercentage: number;
  budgetItems: BudgetItem[];
  epics: Epic[];
  totals?: ProjectTotals;
  total?: number;
}
