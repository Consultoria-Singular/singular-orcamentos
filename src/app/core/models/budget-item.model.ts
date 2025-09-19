export interface BudgetItem {
  id?: string;
  epicId: string;
  name: string;
  hours: number;
  qa?: boolean;
  architect?: boolean;
  design?: boolean;
}
