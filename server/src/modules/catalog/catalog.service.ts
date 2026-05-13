import mongoose, { Types, type ClientSession } from 'mongoose';

import {
  BadRequestError,
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from '../../common/errors/AppError';
import { ERR } from '../../common/errors/errorCodes';
import { CopyStatus, LoanStatus } from '../../common/types/enums';
import { writeAuditLog } from '../../common/utils/auditLogger';
import { generateBarcode } from '../../common/utils/barcodeGenerator';
import { uniqueObjectIds } from '../../common/utils/collectionHelpers';
import { parseCsvBuffer } from '../../common/utils/csvImporter';
import { buildPagination, buildPaginationResult } from '../../common/utils/pagination';
import type { AuthorDocument } from '../../models/Author.model';
import type { BookDocument } from '../../models/Book.model';
import type { BookCopyDocument } from '../../models/BookCopy.model';
import type { CategoryDocument } from '../../models/Category.model';
import { catalogRepository, type CatalogRepository } from './catalog.repository';
import { csvImportRowSchema, parseDelimitedNames } from './catalog.validator';
import type {
  AddCopiesDto,
  BookCopyView,
  BookDetail,
  BookListItem,
  BookNameRef,
  CategoryListItem,
  CreateBookDto,
  CreateCategoryDto,
  CsvImportErrorDetail,
  CsvImportResult,
  RequestActor,
  SearchBooksQuery,
  UpdateBookDto,
  UpdateCategoryDto,
  UpdateCopyStatusDto,
} from './catalog.types';

type NameDocument = AuthorDocument | CategoryDocument;

interface CopyCountSummary {
  totalCopies: number;
  availableCopies: number;
}

interface ActiveLoanSummary {
  dueDate: Date;
  status: LoanStatus;
}

function isDuplicateKeyError(error: unknown): error is { code: 11000 } {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

function toNameRef(document: NameDocument): BookNameRef {
  return {
    _id: document.id,
    name: document.name,
  };
}

export class CatalogService {
  constructor(private readonly repository: CatalogRepository = catalogRepository) {}

  async createBook(input: CreateBookDto, actor?: RequestActor): Promise<BookDetail> {
    const existingBook = await this.repository.findBookByIsbn(input.isbn);

    if (existingBook) {
      throw new ConflictError(ERR.CAT_ISBN_EXISTS, 409, 'ISBN already exists');
    }

    const session = await mongoose.startSession();
    let createdBook: BookDocument | null = null;
    let createdCopies: BookCopyDocument[] = [];
    let authorIds: Types.ObjectId[] = [];
    let categoryIds: Types.ObjectId[] = [];

    try {
      await session.withTransaction(async () => {
        authorIds = await this.resolveAuthorIds(input.authors, session);
        categoryIds = await this.resolveCategoryIds(input.categories, session);

        createdBook = await this.repository.createBook(
          {
            isbn: input.isbn,
            title: input.title,
            authorIds,
            categoryIds,
            bookValue: input.bookValue,
            publisher: input.publisher,
            publishYear: input.publishYear,
            description: input.description,
            coverImage: input.coverImage,
            isDeleted: false,
          },
          session,
        );

        createdCopies = await this.repository.insertBookCopies(
          this.buildCopyPayloads(createdBook._id, 1, input.quantity, input.shelfLocation, input.acquiredDate),
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    if (!createdBook) {
      throw new BusinessRuleError(ERR.COMMON_BAD_REQUEST, 422, 'Failed to create book');
    }

    const finalCreatedBook: BookDocument = createdBook;

    const authorMap = await this.buildAuthorMap(authorIds);
    const categoryMap = await this.buildCategoryMap(categoryIds);
    const result = this.toBookDetail(
      finalCreatedBook,
      authorMap,
      categoryMap,
      {
        totalCopies: createdCopies.length,
        availableCopies: createdCopies.length,
      },
      createdCopies,
      new Map<string, ActiveLoanSummary>(),
    );

    this.writeAudit(actor, 'CREATE_BOOK', 'Book', finalCreatedBook.id, undefined, result);

    return result;
  }

  async searchBooks(query: SearchBooksQuery) {
    const pagination = buildPagination(query);
    const filter: Record<string, unknown> = {
      isDeleted: false,
    };

    if (query.q) {
      filter.$text = { $search: query.q };
    }

    if (query.category) {
      const category = await this.repository.findCategoryByIdentifier(query.category);

      if (!category) {
        return buildPaginationResult<BookListItem>([], 0, pagination);
      }

      filter.categoryIds = category._id;
    }

    if (query.available !== undefined) {
      const availableBookIds = await this.repository.findAvailableBookIds();

      if (query.available && availableBookIds.length === 0) {
        return buildPaginationResult<BookListItem>([], 0, pagination);
      }

      if (query.available) {
        filter._id = { $in: availableBookIds };
      } else if (availableBookIds.length > 0) {
        filter._id = { $nin: availableBookIds };
      }
    }

    const { books, total } = await this.repository.listBooks({
      filter,
      page: pagination.page,
      limit: pagination.limit,
      q: query.q,
    });

    const [authorMap, categoryMap, copyCountMap] = await Promise.all([
      this.buildAuthorMap(this.collectObjectIds(books.flatMap((book) => book.authorIds))),
      this.buildCategoryMap(this.collectObjectIds(books.flatMap((book) => book.categoryIds))),
      this.buildCopyCountMap(books.map((book) => book._id)),
    ]);

    const items = books.map((book) =>
      this.toBookListItem(
        book,
        authorMap,
        categoryMap,
        copyCountMap.get(book.id) ?? { totalCopies: 0, availableCopies: 0 },
      ),
    );

    return buildPaginationResult(items, total, pagination);
  }

  async getBookById(bookId: string): Promise<BookDetail> {
    const book = await this.repository.findBookById(bookId);

    if (!book) {
      throw new NotFoundError(ERR.CAT_BOOK_NOT_FOUND, 404, 'Book not found');
    }

    const [authorMap, categoryMap, copies] = await Promise.all([
      this.buildAuthorMap(book.authorIds),
      this.buildCategoryMap(book.categoryIds),
      this.repository.findBookCopiesByBookId(book.id),
    ]);
    const loanSummaryMap = await this.buildLoanSummaryMap(copies);

    return this.toBookDetail(
      book,
      authorMap,
      categoryMap,
      {
        totalCopies: copies.length,
        availableCopies: copies.filter((copy) => copy.status === CopyStatus.Available).length,
      },
      copies,
      loanSummaryMap,
    );
  }

  async updateBook(bookId: string, input: UpdateBookDto, actor?: RequestActor): Promise<BookDetail> {
    const currentBook = await this.repository.findBookById(bookId);

    if (!currentBook) {
      throw new NotFoundError(ERR.CAT_BOOK_NOT_FOUND, 404, 'Book not found');
    }

    if (input.isbn && input.isbn !== currentBook.isbn) {
      const existingBook = await this.repository.findBookByIsbn(input.isbn);

      if (existingBook && existingBook.id !== currentBook.id) {
        throw new ConflictError(ERR.CAT_ISBN_EXISTS, 409, 'ISBN already exists');
      }
    }

    const session = await mongoose.startSession();
    let updatedBook: BookDocument | null = null;

    try {
      await session.withTransaction(async () => {
        const authorIds = input.authors ? await this.resolveAuthorIds(input.authors, session) : currentBook.authorIds;
        const categoryIds = input.categories ? await this.resolveCategoryIds(input.categories, session) : currentBook.categoryIds;

        updatedBook = await this.repository.updateBookById(
          currentBook.id,
          {
            $set: {
              ...(input.isbn !== undefined ? { isbn: input.isbn } : {}),
              ...(input.title !== undefined ? { title: input.title } : {}),
              ...(input.bookValue !== undefined ? { bookValue: input.bookValue } : {}),
              ...(input.publisher !== undefined ? { publisher: input.publisher } : {}),
              ...(input.publishYear !== undefined ? { publishYear: input.publishYear } : {}),
              ...(input.description !== undefined ? { description: input.description } : {}),
              ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
              authorIds,
              categoryIds,
            },
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    if (!updatedBook) {
      throw new NotFoundError(ERR.CAT_BOOK_NOT_FOUND, 404, 'Book not found');
    }

    const finalUpdatedBook: BookDocument = updatedBook;

    const updatedDetail = await this.getBookById(finalUpdatedBook.id);
    const beforeDetail = await this.toExistingBookDetail(currentBook);

    this.writeAudit(actor, 'UPDATE_BOOK', 'Book', finalUpdatedBook.id, beforeDetail, updatedDetail);

    return updatedDetail;
  }

  async softDeleteBook(bookId: string, actor?: RequestActor): Promise<{ bookId: string; isDeleted: true }> {
    const currentBook = await this.repository.findBookById(bookId);

    if (!currentBook) {
      throw new NotFoundError(ERR.CAT_BOOK_NOT_FOUND, 404, 'Book not found');
    }

    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const [hasBorrowedCopies, hasWaitingReservations] = await Promise.all([
          this.repository.hasBorrowedCopies(currentBook.id, session),
          this.repository.hasWaitingReservations(currentBook.id, session),
        ]);

        if (hasBorrowedCopies) {
          throw new BusinessRuleError(
            ERR.CAT_DELETE_HAS_ACTIVE_LOANS,
            422,
            'Cannot delete a book with borrowed copies',
          );
        }

        if (hasWaitingReservations) {
          throw new BusinessRuleError(
            ERR.CAT_DELETE_HAS_RESERVATIONS,
            422,
            'Cannot delete a book with waiting reservations',
          );
        }

        await this.repository.updateBookById(
          currentBook.id,
          {
            $set: {
              isDeleted: true,
            },
          },
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    this.writeAudit(actor, 'SOFT_DELETE_BOOK', 'Book', currentBook.id, { isDeleted: false }, { isDeleted: true });

    return {
      bookId: currentBook.id,
      isDeleted: true,
    };
  }

  async addCopies(bookId: string, input: AddCopiesDto, actor?: RequestActor): Promise<{ bookId: string; copies: BookCopyView[] }> {
    const book = await this.repository.findBookById(bookId);

    if (!book) {
      throw new NotFoundError(ERR.CAT_BOOK_NOT_FOUND, 404, 'Book not found');
    }

    const session = await mongoose.startSession();
    let createdCopies: BookCopyDocument[] = [];

    try {
      await session.withTransaction(async () => {
        const existingCopyCount = await this.repository.countCopiesByBookId(book.id, session);

        createdCopies = await this.repository.insertBookCopies(
          this.buildCopyPayloads(
            book._id,
            existingCopyCount + 1,
            input.count,
            input.shelfLocation,
            input.acquiredDate,
          ),
          session,
        );
      });
    } finally {
      await session.endSession();
    }

    const result = {
      bookId: book.id,
      copies: createdCopies.map((copy) => this.toCopyView(copy)),
    };

    this.writeAudit(actor, 'ADD_BOOK_COPIES', 'Book', book.id, undefined, result);

    return result;
  }

  async updateCopyStatus(copyId: string, input: UpdateCopyStatusDto, actor?: RequestActor): Promise<BookCopyView> {
    const copy = await this.repository.findBookCopyById(copyId);

    if (!copy) {
      throw new NotFoundError(ERR.CAT_COPY_NOT_FOUND, 404, 'Book copy not found');
    }

    const manageableStatuses = new Set<CopyStatus>([
      CopyStatus.Available,
      CopyStatus.Damaged,
      CopyStatus.Lost,
    ]);

    if (!manageableStatuses.has(input.status)) {
      throw new BadRequestError(
        ERR.COMMON_BAD_REQUEST,
        400,
        'Only available, damaged, and lost copy statuses can be managed in catalog',
      );
    }

    if (copy.status === CopyStatus.Borrowed) {
      throw new BusinessRuleError(ERR.CAT_COPY_HAS_LOAN, 422, 'Cannot manually update a borrowed copy');
    }

    if (!manageableStatuses.has(copy.status)) {
      throw new BusinessRuleError(
        ERR.COMMON_BAD_REQUEST,
        422,
        'Copy status cannot be updated from its current state in catalog',
      );
    }

    const updatedCopy = await this.repository.updateBookCopyById(copy.id, {
      $set: {
        status: input.status,
      },
    });

    if (!updatedCopy) {
      throw new NotFoundError(ERR.CAT_COPY_NOT_FOUND, 404, 'Book copy not found');
    }

    const result = this.toCopyView(updatedCopy);
    this.writeAudit(actor, 'UPDATE_COPY_STATUS', 'BookCopy', updatedCopy.id, this.toCopyView(copy), result);

    return result;
  }

  async listCategories(): Promise<CategoryListItem[]> {
    const [categories, categoryCounts] = await Promise.all([
      this.repository.listCategories(),
      this.repository.aggregateCategoryFacets(),
    ]);
    const countMap = new Map(categoryCounts.map((entry) => [entry._id.toString(), entry.count]));

    return categories.map((category) => {
      const count = countMap.get(category.id) ?? 0;

      return {
        _id: category.id,
        name: category.name,
        count,
        canDelete: count === 0,
      };
    });
  }

  async createCategory(input: CreateCategoryDto, actor?: RequestActor): Promise<CategoryListItem> {
    const existingCategory = await this.repository.findCategoryByName(input.name);

    if (existingCategory) {
      throw new ConflictError(ERR.COMMON_BAD_REQUEST, 409, 'Category name already exists');
    }

    let createdCategory: CategoryDocument;

    try {
      createdCategory = await this.repository.createCategoryRecord(input.name);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      throw new ConflictError(ERR.COMMON_BAD_REQUEST, 409, 'Category name already exists');
    }

    const result = {
      _id: createdCategory.id,
      name: createdCategory.name,
      count: 0,
      canDelete: true,
    };

    this.writeAudit(actor, 'CREATE_CATEGORY', 'Category', createdCategory.id, undefined, result);

    return result;
  }

  async updateCategory(categoryId: string, input: UpdateCategoryDto, actor?: RequestActor): Promise<CategoryListItem> {
    const currentCategory = await this.repository.findCategoryById(categoryId);

    if (!currentCategory) {
      throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Category not found');
    }

    if (input.name && input.name !== currentCategory.name) {
      const existingCategory = await this.repository.findCategoryByName(input.name);

      if (existingCategory && existingCategory.id !== currentCategory.id) {
        throw new ConflictError(ERR.COMMON_BAD_REQUEST, 409, 'Category name already exists');
      }
    }

    const updatedCategory = await this.repository.updateCategoryById(currentCategory.id, {
      $set: {
        ...(input.name !== undefined ? { name: input.name } : {}),
      },
    });

    if (!updatedCategory) {
      throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Category not found');
    }

    const count = await this.repository.countBooksByCategoryId(updatedCategory.id);
    const result = {
      _id: updatedCategory.id,
      name: updatedCategory.name,
      count,
      canDelete: count === 0,
    };

    this.writeAudit(
      actor,
      'UPDATE_CATEGORY',
      'Category',
      updatedCategory.id,
      { _id: currentCategory.id, name: currentCategory.name },
      result,
    );

    return result;
  }

  async deleteCategory(categoryId: string, actor?: RequestActor): Promise<{ categoryId: string; deleted: true }> {
    const currentCategory = await this.repository.findCategoryById(categoryId);

    if (!currentCategory) {
      throw new NotFoundError(ERR.COMMON_NOT_FOUND, 404, 'Category not found');
    }

    const bookCount = await this.repository.countBooksByCategoryId(currentCategory.id);

    if (bookCount > 0) {
      throw new BusinessRuleError(
        ERR.COMMON_BAD_REQUEST,
        422,
        'Cannot delete a category that is used by books',
        { bookCount },
      );
    }

    await this.repository.deleteCategoryById(currentCategory.id);

    this.writeAudit(
      actor,
      'DELETE_CATEGORY',
      'Category',
      currentCategory.id,
      { _id: currentCategory.id, name: currentCategory.name },
      { deleted: true },
    );

    return {
      categoryId: currentCategory.id,
      deleted: true,
    };
  }

  async importCsv(buffer: Buffer, actor?: RequestActor): Promise<CsvImportResult> {
    const rows = await parseCsvBuffer(buffer);
    const errors: CsvImportErrorDetail[] = [];
    let successCount = 0;
    let failedCount = 0;
    const seenIsbns = new Set<string>();

    for (let startIndex = 0; startIndex < rows.length; startIndex += 50) {
      const batch = rows.slice(startIndex, startIndex + 50);

      for (let rowIndex = 0; rowIndex < batch.length; rowIndex += 1) {
        const rowNumber = startIndex + rowIndex + 2;
        const rawRow = batch[rowIndex];
        const parsed = csvImportRowSchema.safeParse(rawRow);

        if (!parsed.success) {
          failedCount += 1;
          errors.push({
            row: rowNumber,
            isbn: typeof rawRow.isbn === 'string' ? rawRow.isbn : undefined,
            message: parsed.error.issues[0]?.message ?? 'Invalid CSV row',
          });
          continue;
        }

        const row = parsed.data;

        if (seenIsbns.has(row.isbn)) {
          failedCount += 1;
          errors.push({
            row: rowNumber,
            isbn: row.isbn,
            message: 'Duplicate ISBN in import file',
          });
          continue;
        }

        seenIsbns.add(row.isbn);

        try {
          await this.createBook(
            {
              isbn: row.isbn,
              title: row.title,
              authors: parseDelimitedNames(row.author),
              categories: parseDelimitedNames(row.category),
              publisher: row.publisher,
              publishYear: row.publishYear,
              description: row.description,
              quantity: row.quantity,
              shelfLocation: row.shelfLocation,
            },
            actor,
          );

          successCount += 1;
        } catch (error) {
          failedCount += 1;
          errors.push({
            row: rowNumber,
            isbn: row.isbn,
            message: error instanceof Error ? error.message : 'Failed to import row',
          });
        }
      }
    }

    return {
      successCount,
      failedCount,
      errors,
    };
  }

  private async resolveAuthorIds(names: string[], session: ClientSession): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];

    for (const name of names) {
      const existingAuthor = await this.repository.findAuthorByName(name, session);

      if (existingAuthor) {
        ids.push(existingAuthor._id);
        continue;
      }

      try {
        const createdAuthor = await this.repository.createAuthor(name, session);
        ids.push(createdAuthor._id);
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }

        const duplicatedAuthor = await this.repository.findAuthorByName(name, session);

        if (!duplicatedAuthor) {
          throw error;
        }

        ids.push(duplicatedAuthor._id);
      }
    }

    return uniqueObjectIds(ids);
  }

  private async resolveCategoryIds(names: string[], session: ClientSession): Promise<Types.ObjectId[]> {
    const ids: Types.ObjectId[] = [];

    for (const name of names) {
      const existingCategory = await this.repository.findCategoryByName(name, session);

      if (existingCategory) {
        ids.push(existingCategory._id);
        continue;
      }

      try {
        const createdCategory = await this.repository.createCategory(name, session);
        ids.push(createdCategory._id);
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }

        const duplicatedCategory = await this.repository.findCategoryByName(name, session);

        if (!duplicatedCategory) {
          throw error;
        }

        ids.push(duplicatedCategory._id);
      }
    }

    return uniqueObjectIds(ids);
  }

  private buildCopyPayloads(
    bookId: Types.ObjectId,
    startIndex: number,
    count: number,
    shelfLocation?: string,
    acquiredDate?: Date,
  ) {
    return Array.from({ length: count }, (_, index) => {
      const copyIndex = startIndex + index;

      return {
        bookId,
        barcode: generateBarcode(bookId.toString(), copyIndex),
        status: CopyStatus.Available,
        shelfLocation,
        acquiredDate,
      };
    });
  }

  private collectObjectIds(ids: Types.ObjectId[]): Types.ObjectId[] {
    return uniqueObjectIds(ids);
  }

  private async buildAuthorMap(authorIds: Types.ObjectId[]): Promise<Map<string, BookNameRef>> {
    const authors = await this.repository.findAuthorsByIds(this.collectObjectIds(authorIds));
    return new Map(authors.map((author) => [author.id, toNameRef(author)]));
  }

  private async buildCategoryMap(categoryIds: Types.ObjectId[]): Promise<Map<string, BookNameRef>> {
    const categories = await this.repository.findCategoriesByIds(this.collectObjectIds(categoryIds));
    return new Map(categories.map((category) => [category.id, toNameRef(category)]));
  }

  private async buildCopyCountMap(bookIds: Types.ObjectId[]): Promise<Map<string, CopyCountSummary>> {
    const counts = await this.repository.countCopiesForBookIds(bookIds);

    return new Map(
      counts.map((entry) => [
        entry._id.toString(),
        {
          totalCopies: entry.totalCopies,
          availableCopies: entry.availableCopies,
        },
      ]),
    );
  }

  private async buildLoanSummaryMap(copies: BookCopyDocument[]): Promise<Map<string, ActiveLoanSummary>> {
    if (copies.length === 0) {
      return new Map();
    }

    const activeLoans = await this.repository.findActiveLoanSummariesByCopyIds(copies.map((copy) => copy._id));

    return new Map(
      activeLoans.map((loan) => [
        loan.copyId.toString(),
        {
          dueDate: loan.dueDate,
          status: loan.status,
        },
      ]),
    );
  }

  private toBookListItem(
    book: BookDocument,
    authorMap: Map<string, BookNameRef>,
    categoryMap: Map<string, BookNameRef>,
    copyCount: CopyCountSummary,
  ): BookListItem {
    return {
      _id: book.id,
      isbn: book.isbn,
      title: book.title,
      authors: book.authorIds.map((authorId) => authorMap.get(authorId.toString())).filter(Boolean) as BookNameRef[],
      categories: book.categoryIds.map((categoryId) => categoryMap.get(categoryId.toString())).filter(Boolean) as BookNameRef[],
      bookValue: book.bookValue,
      publisher: book.publisher,
      publishYear: book.publishYear,
      description: book.description,
      coverImage: book.coverImage,
      language: book.language,
      pageCount: book.pageCount,
      bookSize: book.bookSize,
      totalCopies: copyCount.totalCopies,
      availableCopies: copyCount.availableCopies,
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
    };
  }

  private toBookDetail(
    book: BookDocument,
    authorMap: Map<string, BookNameRef>,
    categoryMap: Map<string, BookNameRef>,
    copyCount: CopyCountSummary,
    copies: BookCopyDocument[],
    loanSummaryMap: Map<string, ActiveLoanSummary>,
  ): BookDetail {
    return {
      ...this.toBookListItem(book, authorMap, categoryMap, copyCount),
      copies: copies.map((copy) => this.toCopyView(copy, loanSummaryMap.get(copy.id))),
    };
  }

  private toCopyView(copy: BookCopyDocument, loanSummary?: ActiveLoanSummary): BookCopyView {
    return {
      _id: copy.id,
      barcode: copy.barcode,
      status: copy.status,
      shelfLocation: copy.shelfLocation,
      acquiredDate: copy.acquiredDate,
      currentDueDate: loanSummary?.dueDate,
      currentLoanStatus: loanSummary?.status,
    };
  }

  private async toExistingBookDetail(book: BookDocument): Promise<BookDetail> {
    const [authorMap, categoryMap, copies] = await Promise.all([
      this.buildAuthorMap(book.authorIds),
      this.buildCategoryMap(book.categoryIds),
      this.repository.findBookCopiesByBookId(book.id),
    ]);
    const loanSummaryMap = await this.buildLoanSummaryMap(copies);

    return this.toBookDetail(
      book,
      authorMap,
      categoryMap,
      {
        totalCopies: copies.length,
        availableCopies: copies.filter((copy) => copy.status === CopyStatus.Available).length,
      },
      copies,
      loanSummaryMap,
    );
  }

  private writeAudit(
    actor: RequestActor | undefined,
    action: string,
    entity: string,
    entityId: string,
    before?: unknown,
    after?: unknown,
  ): void {
    writeAuditLog({
      actorId: actor?.actorId ?? null,
      action,
      entity,
      entityId,
      before,
      after,
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });
  }

  async getFacets(): Promise<import('./catalog.types').CatalogFacets> {
    const [categoryCounts, publishYear, availableCount, borrowingCount] = await Promise.all([
      this.repository.aggregateCategoryFacets(),
      this.repository.aggregatePublishYearRange(),
      this.repository.countBooksWithAvailableCopies(),
      this.repository.countBooksWithStatus(CopyStatus.Borrowed),
    ]);

    const categoryIds = categoryCounts.map((entry) => entry._id);
    const categoryMap = await this.buildCategoryMap(categoryIds);
    const categories = categoryCounts
      .map((entry) => {
        const ref = categoryMap.get(entry._id.toString());
        if (!ref) {
          return null;
        }
        return { _id: ref._id, name: ref.name, count: entry.count };
      })
      .filter((value): value is { _id: string; name: string; count: number } => value !== null)
      .sort((a, b) => b.count - a.count);

    return {
      categories,
      statuses: {
        available: availableCount,
        borrowing: borrowingCount,
        soon: 0,
      },
      publishYear,
    };
  }

  async getPopularBooks(params: { limit?: number; windowDays?: number }): Promise<BookListItem[]> {
    const limit = params.limit ?? 10;
    const windowDays = params.windowDays ?? 30;
    const popularIds = await this.repository.aggregatePopularBookIds(windowDays, limit);

    if (popularIds.length === 0) {
      return [];
    }

    const books = await this.repository.findBooksByIds(popularIds);
    const orderIndex = new Map(popularIds.map((id, index) => [id.toString(), index]));
    books.sort((a, b) => (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0));

    const [authorMap, categoryMap, copyCountMap] = await Promise.all([
      this.buildAuthorMap(this.collectObjectIds(books.flatMap((book) => book.authorIds))),
      this.buildCategoryMap(this.collectObjectIds(books.flatMap((book) => book.categoryIds))),
      this.buildCopyCountMap(books.map((book) => book._id)),
    ]);

    return books.map((book) =>
      this.toBookListItem(
        book,
        authorMap,
        categoryMap,
        copyCountMap.get(book.id) ?? { totalCopies: 0, availableCopies: 0 },
      ),
    );
  }

  async getRecommendations(memberId: string, limit: number = 10): Promise<BookListItem[]> {
    const [topCategories, excludeIds] = await Promise.all([
      this.repository.findTopCategoriesForMember(memberId, 5),
      this.repository.findActiveLoanedBookIdsByMember(memberId),
    ]);

    if (topCategories.length === 0) {
      return [];
    }

    const books = await this.repository.findRecommendedBooks(topCategories, excludeIds, limit);

    if (books.length === 0) {
      return [];
    }

    const [authorMap, categoryMap, copyCountMap] = await Promise.all([
      this.buildAuthorMap(this.collectObjectIds(books.flatMap((book) => book.authorIds))),
      this.buildCategoryMap(this.collectObjectIds(books.flatMap((book) => book.categoryIds))),
      this.buildCopyCountMap(books.map((book) => book._id)),
    ]);

    return books.map((book) =>
      this.toBookListItem(
        book,
        authorMap,
        categoryMap,
        copyCountMap.get(book.id) ?? { totalCopies: 0, availableCopies: 0 },
      ),
    );
  }
}

export const catalogService = new CatalogService();
