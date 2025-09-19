import { BudgetItem } from '../core/models/budget-item.model';
import { Project } from '../core/models/project.model';

export interface BudgetItemCostBreakdown {
  devPay: number;
  poHours: number;
  poPay: number;
  qaHours: number;
  qaPay: number;
  architectHours: number;
  architectPay: number;
  designHours: number;
  designPay: number;
  opsPay: number;
  subTotalItem: number;
  taxes: number;
  pointer: number;
  margin: number;
  totalItem: number;
}

const mul = (a: number, b: number): number => Number((a * b).toFixed(2));

const sum = (...values: number[]): number => Number(values.reduce((acc, value) => acc + value, 0).toFixed(2));

export const calculateBudgetItemCost = (project: Project, item: BudgetItem): BudgetItemCostBreakdown => {
  const devPay = mul(item.hours, project.devHourlyRate);

  const poHours = mul(item.hours, project.poPercentage);
  const poPay = mul(poHours, project.poHourlyRate);

  const qaHours = item.qa ? mul(item.hours, project.qaPercentage) : 0;
  const qaPay = mul(qaHours, project.qaHourlyRate);

  const architectHours = item.architect ? mul(item.hours, project.architectPercentage) : 0;
  const architectPay = mul(architectHours, project.architectHourlyRate);

  const designHours = item.design ? mul(item.hours, project.designPercentage) : 0;
  const designPay = mul(designHours, project.designHourlyRate);

  const opsPay = mul(item.hours, project.opsPercentage * project.opsHourlyRate);

  const subTotalItem = sum(devPay, poPay, qaPay, architectPay, designPay, opsPay);
  const taxes = mul(subTotalItem, project.taxPercentage);
  const pointer = mul(subTotalItem, project.pointerPercentage);
  const margin = mul(subTotalItem, project.marginPercentage);
  const totalItem = sum(subTotalItem, taxes, pointer, margin);

  return {
    devPay,
    poHours,
    poPay,
    qaHours,
    qaPay,
    architectHours,
    architectPay,
    designHours,
    designPay,
    opsPay,
    subTotalItem,
    taxes,
    pointer,
    margin,
    totalItem
  };
};

export const calculateProjectTotal = (project: Project): number => {
  if (!Array.isArray(project.budgetItems) || project.budgetItems.length === 0) {
    return 0;
  }
  const total = project.budgetItems
    .map(item => calculateBudgetItemCost(project, item).totalItem)
    .reduce((acc, totalItem) => acc + totalItem, 0);
  return Number(total.toFixed(2));
};
