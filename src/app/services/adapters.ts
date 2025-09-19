import { BudgetItem } from '../core/models/budget-item.model';
import { Epic } from '../core/models/epic.model';
import { Project } from '../core/models/project.model';

export interface BudgetItemDto {
  id?: string;
  project?: string;
  epic?: string;
  epicId?: string;
  epic_id?: string;
  name: string;
  hours: number | string;
  qa?: boolean | number | string;
  architect?: boolean | number | string;
  design?: boolean | number | string;
}

export interface EpicDto {
  id: string;
  name: string;
}

export interface ProjectDto {
  id?: string;
  name: string;
  devHourlyRate?: number | string;
  devHourly_rate?: number | string;
  dev_hourly_rate?: number | string;
  poHourlyRate?: number | string;
  poHourly_rate?: number | string;
  po_hourly_rate?: number | string;
  qaHourlyRate?: number | string;
  qaHourly_rate?: number | string;
  qa_hourly_rate?: number | string;
  architectHourlyRate?: number | string;
  architectHourly_rate?: number | string;
  architect_hourly_rate?: number | string;
  designHourlyRate?: number | string;
  designHourly_rate?: number | string;
  design_hourly_rate?: number | string;
  opsHourlyRate?: number | string;
  opsHourly_rate?: number | string;
  ops_hourly_rate?: number | string;
  poPercentage?: number | string;
  po_percentage?: number | string;
  qaPercentage?: number | string;
  qa_percentage?: number | string;
  architectPercentage?: number | string;
  architect_percentage?: number | string;
  designPercentage?: number | string;
  design_percentage?: number | string;
  opsPercentage?: number | string;
  ops_percentage?: number | string;
  taxPercentage?: number | string;
  tax_percentage?: number | string;
  pointerPercentage?: number | string;
  pointer_percentage?: number | string;
  marginPercentage?: number | string;
  margin_percentage?: number | string;
  project?: {
    id?: string;
    name?: string;
    devHourlyRate?: number | string;
    devHourly_rate?: number | string;
    dev_hourly_rate?: number | string;
    poHourlyRate?: number | string;
    poHourly_rate?: number | string;
    po_hourly_rate?: number | string;
    qaHourlyRate?: number | string;
    qaHourly_rate?: number | string;
    qa_hourly_rate?: number | string;
    architectHourlyRate?: number | string;
    architectHourly_rate?: number | string;
    architect_hourly_rate?: number | string;
    designHourlyRate?: number | string;
    designHourly_rate?: number | string;
    design_hourly_rate?: number | string;
    opsHourlyRate?: number | string;
    opsHourly_rate?: number | string;
    ops_hourly_rate?: number | string;
    poPercentage?: number | string;
    po_percentage?: number | string;
    qaPercentage?: number | string;
    qa_percentage?: number | string;
    architectPercentage?: number | string;
    architect_percentage?: number | string;
    designPercentage?: number | string;
    design_percentage?: number | string;
    opsPercentage?: number | string;
    ops_percentage?: number | string;
    taxPercentage?: number | string;
    tax_percentage?: number | string;
    pointerPercentage?: number | string;
    pointer_percentage?: number | string;
    marginPercentage?: number | string;
    margin_percentage?: number | string;
  };
  totals?: {
    total?: number | string;
    costSubtotal?: number | string;
    marginAmount?: number | string;
    pointerAmount?: number | string;
    taxAmount?: number | string;
  };
  budgetItems?: BudgetItemDto[];
  budgetItens?: BudgetItemDto[];
  bugdgetItens?: BudgetItemDto[];
  epics?: EpicDto[];
}

const toNumber = (value: number | string | undefined, fallback = 0): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value
      .replace(/[\s\u00A0]/g, '')
      .replace(/[R$%]/gi, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(/,/g, '.')
      .replace(/[^0-9.-]/g, '')
      .replace(/(?!^)-/g, '');

    if (!normalized) {
      return fallback;
    }
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
};

const toBoolean = (value: unknown | undefined): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'sim'].includes(value.toLowerCase());
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  return Boolean(value);
};

const pickEpicId = (dto: BudgetItemDto): string => {
  return dto.epicId ?? dto.epic_id ?? dto.epic ?? '';
};

const normalizeBudgetItems = (dto: ProjectDto): BudgetItemDto[] => {
  if (Array.isArray(dto.budgetItems)) {
    return dto.budgetItems;
  }
  if (Array.isArray(dto.budgetItens)) {
    return dto.budgetItens;
  }
  if (Array.isArray(dto.bugdgetItens)) {
    return dto.bugdgetItens;
  }
  return [];
};

const pickProjectField = <T extends keyof NonNullable<ProjectDto['project']>>(
  dto: ProjectDto,
  field: T,
  fallback?: NonNullable<ProjectDto['project']>[T]
): NonNullable<ProjectDto['project']>[T] | undefined => {
  const direct = dto[field as keyof ProjectDto];
  if (direct !== undefined) {
    return direct as NonNullable<ProjectDto['project']>[T];
  }
  const project = dto.project;
  if (project && project[field] !== undefined) {
    return project[field];
  }
  return fallback;
};

export const adaptBudgetItemDto = (dto: BudgetItemDto): BudgetItem => ({
  id: dto.id,  epicId: pickEpicId(dto),
  name: dto.name,
  hours: toNumber(dto.hours),
  qa: toBoolean(dto.qa),
  architect: toBoolean(dto.architect),
  design: toBoolean(dto.design)
});

export const adaptEpicDto = (dto: EpicDto): Epic => ({
  id: dto.id,
  name: dto.name
});

export const adaptProjectDto = (dto: ProjectDto): Project => ({
  id: (dto.id ?? dto.project?.id ?? '').toString(),
  name: dto.name ?? dto.project?.name ?? '',
  devHourlyRate: toNumber(pickProjectField(dto, 'devHourlyRate') ?? pickProjectField(dto, 'devHourly_rate') ?? pickProjectField(dto, 'dev_hourly_rate')),
  poHourlyRate: toNumber(pickProjectField(dto, 'poHourlyRate') ?? pickProjectField(dto, 'poHourly_rate') ?? pickProjectField(dto, 'po_hourly_rate')),
  qaHourlyRate: toNumber(pickProjectField(dto, 'qaHourlyRate') ?? pickProjectField(dto, 'qaHourly_rate') ?? pickProjectField(dto, 'qa_hourly_rate')),
  architectHourlyRate: toNumber(pickProjectField(dto, 'architectHourlyRate') ?? pickProjectField(dto, 'architectHourly_rate') ?? pickProjectField(dto, 'architect_hourly_rate')),
  designHourlyRate: toNumber(pickProjectField(dto, 'designHourlyRate') ?? pickProjectField(dto, 'designHourly_rate') ?? pickProjectField(dto, 'design_hourly_rate')),
  opsHourlyRate: toNumber(pickProjectField(dto, 'opsHourlyRate') ?? pickProjectField(dto, 'opsHourly_rate') ?? pickProjectField(dto, 'ops_hourly_rate')),
  poPercentage: toNumber(pickProjectField(dto, 'poPercentage') ?? dto.po_percentage),
  qaPercentage: toNumber(pickProjectField(dto, 'qaPercentage') ?? dto.qa_percentage),
  architectPercentage: toNumber(pickProjectField(dto, 'architectPercentage') ?? dto.architect_percentage),
  designPercentage: toNumber(pickProjectField(dto, 'designPercentage') ?? dto.design_percentage),
  opsPercentage: toNumber(pickProjectField(dto, 'opsPercentage') ?? dto.ops_percentage),
  taxPercentage: toNumber(pickProjectField(dto, 'taxPercentage') ?? dto.tax_percentage),
  pointerPercentage: toNumber(pickProjectField(dto, 'pointerPercentage') ?? dto.pointer_percentage),
  marginPercentage: toNumber(pickProjectField(dto, 'marginPercentage') ?? dto.margin_percentage),
  budgetItems: normalizeBudgetItems(dto).map(adaptBudgetItemDto),
  epics: Array.isArray(dto.epics) ? dto.epics.map(adaptEpicDto) : [],
  total: toNumber(dto.totals?.total, undefined)
});

const sanitizeBudgetItem = (item: BudgetItem): BudgetItemDto => ({
  id: item.id,
  epicId: item.epicId,
  name: item.name,
  hours: item.hours,
  qa: item.qa ?? false,
  architect: item.architect ?? false,
  design: item.design ?? false
});

export const adaptProjectToDto = (project: Project): ProjectDto => {
  const dto: ProjectDto = {
    id: project.id,
    name: project.name,
    devHourlyRate: project.devHourlyRate,
    poHourlyRate: project.poHourlyRate,
    qaHourlyRate: project.qaHourlyRate,
    architectHourlyRate: project.architectHourlyRate,
    designHourlyRate: project.designHourlyRate,
    opsHourlyRate: project.opsHourlyRate,
    poPercentage: project.poPercentage,
    qaPercentage: project.qaPercentage,
    architectPercentage: project.architectPercentage,
    designPercentage: project.designPercentage,
    opsPercentage: project.opsPercentage,
    taxPercentage: project.taxPercentage,
    pointerPercentage: project.pointerPercentage,
    marginPercentage: project.marginPercentage,
    budgetItens: (project.budgetItems ?? []).map(sanitizeBudgetItem),
    epics: (project.epics ?? []).map(({ id, name }) => ({ id, name }))
  };

  return dto;
};

