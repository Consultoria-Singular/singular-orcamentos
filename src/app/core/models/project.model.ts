import { BudgetItem } from './budget-item.model';
import { Epic } from './epic.model';

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
  total?: number;
}
