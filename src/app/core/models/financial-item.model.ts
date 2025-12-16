export interface FinancialItem {
  id: string;
  projectId: string;
  name: string;
  type: string;
  value: number;
  status: string;
  epicId?: string | null;
  sprint?: string | null;
  paymentDate?: string | null;
  task?: string | null;
}

export interface FinancialItemInput {
  name: string;
  type: string;
  value: number;
  status?: string;
  epicId?: string | null;
  sprint?: string | null;
  paymentDate?: string | null;
  task?: string | null;
}

export type FinancialItemUpdate = Partial<FinancialItemInput>;
