export type EntryStatus = "DRAFT" | "ACTIVE" | "SETTLED" | "ARCHIVED";

export type EntryCategory =
  | "OPERATIONS"
  | "FINANCE"
  | "ENGINEERING"
  | "PRODUCT"
  | "MARKETING"
  | "PEOPLE"
  | "OTHER";

export interface Entry {
  id: string;
  reference: string;
  title: string;
  category: EntryCategory;
  categoryLabel: string;
  status: EntryStatus;
  statusLabel: string;
  amount: number | null;
  currency: string;
  entryDate: string;
  owner: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface CategoryStat {
  category: EntryCategory;
  label: string;
  count: number;
  amount: number;
}

export interface MonthlyPoint {
  month: string;
  count: number;
  amount: number;
}

export interface Stats {
  totalEntries: number;
  totalAmount: number;
  averageAmount: number;
  last30Days: number;
  draftCount: number;
  activeCount: number;
  settledCount: number;
  archivedCount: number;
  byCategory: CategoryStat[];
  monthly: MonthlyPoint[];
}

export interface EntryInput {
  title: string;
  category: EntryCategory;
  status: EntryStatus;
  amount: number | null;
  currency: string;
  entryDate: string;
  owner: string | null;
  notes: string | null;
}

export interface EntryQuery {
  q?: string;
  status?: EntryStatus | "";
  category?: EntryCategory | "";
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: "asc" | "desc";
}

export interface Option {
  value: string;
  label: string;
}

export interface Meta {
  categories: Option[];
  statuses: Option[];
}
