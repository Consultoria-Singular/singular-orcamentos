import { BudgetItem } from './budget-item.model';
import { Epic } from './epic.model';

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
