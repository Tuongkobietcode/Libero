import { z } from 'zod';

import { CopyStatus } from '../../common/types/enums';
import type { CsvImportRow } from './catalog.types';

const currentYear = new Date().getUTCFullYear() + 1;
const objectIdPattern = /^[a-f0-9]{24}$/i;

function trimToUndefined(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function normalizeIsbn(input: string): string {
  return input.replace(/\D/g, '');
}

export function isValidIsbn(input: string): boolean {
  return /^\d{10}(\d{3})?$/.test(normalizeIsbn(input));
}

export function parseDelimitedNames(input: string): string[] {
  return dedupe(input.split(/[|;,]/).map((value) => value.trim()));
}

const nonEmptyString = z.string().trim().min(1);

const stringArraySchema = z
  .array(nonEmptyString)
  .transform((values) => dedupe(values))
  .refine((values) => values.length > 0, 'At least one value is required');

const optionalTrimmedStringSchema = z
  .string()
  .transform((value) => trimToUndefined(value))
  .optional();

const optionalNumberSchema = z.coerce.number().int().min(0).max(currentYear).optional();
const optionalCurrencySchema = z.coerce.number().min(0).optional();

export const objectIdParamSchema = z.string().regex(objectIdPattern, 'Invalid object id');

export const searchBooksQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  available: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const createBookSchema = z.object({
  isbn: z
    .string()
    .transform(normalizeIsbn)
    .refine(isValidIsbn, 'ISBN must contain exactly 10 or 13 digits'),
  title: nonEmptyString.max(255),
  authors: stringArraySchema,
  categories: stringArraySchema,
  bookValue: optionalCurrencySchema,
  publisher: optionalTrimmedStringSchema,
  publishYear: optionalNumberSchema,
  description: optionalTrimmedStringSchema,
  coverImage: optionalTrimmedStringSchema,
  quantity: z.coerce.number().int().min(1).max(100),
  shelfLocation: optionalTrimmedStringSchema,
  acquiredDate: z.coerce.date().optional(),
});

export const updateBookSchema = z
  .object({
    isbn: z
      .string()
      .transform(normalizeIsbn)
      .refine(isValidIsbn, 'ISBN must contain exactly 10 or 13 digits')
      .optional(),
    title: nonEmptyString.max(255).optional(),
    authors: stringArraySchema.optional(),
    categories: stringArraySchema.optional(),
    bookValue: optionalCurrencySchema,
    publisher: optionalTrimmedStringSchema,
    publishYear: optionalNumberSchema,
    description: optionalTrimmedStringSchema,
    coverImage: optionalTrimmedStringSchema,
  })
  .refine((value) => Object.values(value).some((field) => field !== undefined), 'At least one field must be provided');

export const addCopiesSchema = z.object({
  count: z.coerce.number().int().min(1).max(100),
  shelfLocation: optionalTrimmedStringSchema,
  acquiredDate: z.coerce.date().optional(),
});

export const updateCopyStatusSchema = z.object({
  status: z.nativeEnum(CopyStatus),
});

export const csvImportRowSchema: z.ZodType<CsvImportRow> = z.object({
  isbn: z
    .string()
    .transform(normalizeIsbn)
    .refine(isValidIsbn, 'ISBN must contain exactly 10 or 13 digits'),
  title: nonEmptyString.max(255),
  author: nonEmptyString,
  category: nonEmptyString,
  quantity: z.coerce.number().int().min(1).max(100),
  shelfLocation: nonEmptyString.max(100),
  publisher: optionalTrimmedStringSchema,
  publishYear: optionalNumberSchema,
  description: optionalTrimmedStringSchema,
});
