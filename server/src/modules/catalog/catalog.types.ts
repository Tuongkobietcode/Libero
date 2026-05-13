import type { CopyStatus, LoanStatus } from '../../common/types/enums';

export interface RequestActor {
  actorId?: string | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface SearchBooksQuery {
  q?: string;
  category?: string;
  available?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateBookDto {
  isbn: string;
  title: string;
  authors: string[];
  categories: string[];
  bookValue?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  quantity: number;
  shelfLocation?: string;
  acquiredDate?: Date;
}

export interface UpdateBookDto {
  isbn?: string;
  title?: string;
  authors?: string[];
  categories?: string[];
  bookValue?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
}

export interface AddCopiesDto {
  count: number;
  shelfLocation?: string;
  acquiredDate?: Date;
}

export interface UpdateCopyStatusDto {
  status: CopyStatus;
}

export interface CreateCategoryDto {
  name: string;
}

export interface UpdateCategoryDto {
  name?: string;
}

export interface CsvImportRow {
  isbn: string;
  title: string;
  author: string;
  category: string;
  quantity: number;
  shelfLocation: string;
  publisher?: string;
  publishYear?: number;
  description?: string;
}

export interface BookNameRef {
  _id: string;
  name: string;
}

export interface BookCopyView {
  _id: string;
  barcode: string;
  status: CopyStatus;
  shelfLocation?: string;
  acquiredDate?: Date;
  currentDueDate?: Date;
  currentLoanStatus?: LoanStatus;
}

export interface BookListItem {
  _id: string;
  isbn: string;
  title: string;
  authors: BookNameRef[];
  categories: BookNameRef[];
  bookValue?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  language?: string;
  pageCount?: number;
  bookSize?: string;
  totalCopies: number;
  availableCopies: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookDetail extends BookListItem {
  copies: BookCopyView[];
}

export interface CsvImportErrorDetail {
  row: number;
  isbn?: string;
  message: string;
}

export interface CsvImportResult {
  successCount: number;
  failedCount: number;
  errors: CsvImportErrorDetail[];
}

export interface CategoryFacet {
  _id: string;
  name: string;
  count: number;
}

export interface CategoryListItem extends CategoryFacet {
  canDelete: boolean;
}

export interface CatalogFacets {
  categories: CategoryFacet[];
  statuses: {
    available: number;
    borrowing: number;
    soon: number;
  };
  publishYear: {
    min: number | null;
    max: number | null;
  };
}
