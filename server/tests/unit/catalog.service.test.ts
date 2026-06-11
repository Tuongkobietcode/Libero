import mongoose from 'mongoose';

import { BusinessRuleError, ConflictError } from '../../src/common/errors/AppError';
import { CopyStatus } from '../../src/common/types/enums';
import { CatalogService } from '../../src/modules/catalog/catalog.service';
import type { CatalogRepository } from '../../src/modules/catalog/catalog.repository';

jest.mock('../../src/common/utils/auditLogger', () => ({
  writeAuditLog: jest.fn(),
}));

function createRepositoryMock(): jest.Mocked<CatalogRepository> {
  return {
    findBookById: jest.fn(),
    findBookByIsbn: jest.fn(),
    createBook: jest.fn(),
    updateBookById: jest.fn(),
    listBooks: jest.fn(),
    insertBookCopies: jest.fn(),
    countCopiesByBookId: jest.fn(),
    countCopiesForBookIds: jest.fn(),
    findBookCopiesByBookId: jest.fn(),
    findBookCopyById: jest.fn(),
    updateBookCopyById: jest.fn(),
    findAvailableBookIds: jest.fn(),
    hasBorrowedCopies: jest.fn(),
    hasWaitingReservations: jest.fn(),
    findActiveLoanSummariesByCopyIds: jest.fn(),
    findAuthorsByIds: jest.fn(),
    findAuthorIdsBySearch: jest.fn(),
    findCategoriesByIds: jest.fn(),
    findAuthorByName: jest.fn(),
    createAuthor: jest.fn(),
    findCategoryByName: jest.fn(),
    findCategoryByIdentifier: jest.fn(),
    createCategory: jest.fn(),
  } as unknown as jest.Mocked<CatalogRepository>;
}

function createReservationQueueMock() {
  return {
    notifyNext: jest.fn(),
  };
}

function createBookDocument(overrides: Record<string, unknown> = {}) {
  const bookId = new mongoose.Types.ObjectId();

  return {
    _id: bookId,
    id: bookId.toString(),
    isbn: '9781234567890',
    title: 'Default Book',
    authorIds: [new mongoose.Types.ObjectId()],
    categoryIds: [new mongoose.Types.ObjectId()],
    publisher: 'Publisher',
    publishYear: 2024,
    description: 'Description',
    coverImage: undefined,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as any;
}

function createNameDocument(name: string) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    name,
  } as any;
}

function createCopyDocument(bookId: mongoose.Types.ObjectId, copyIndex: number, overrides: Record<string, unknown> = {}) {
  const id = new mongoose.Types.ObjectId();

  return {
    _id: id,
    id: id.toString(),
    bookId,
    barcode: `LIB-${bookId.toString().slice(-6)}-${copyIndex.toString().padStart(3, '0')}-1`,
    status: CopyStatus.Available,
    shelfLocation: 'A1',
    acquiredDate: new Date(),
    createdAt: new Date(),
    ...overrides,
  } as any;
}

describe('CatalogService', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('creates a book with generated copies', async () => {
    const repository = createRepositoryMock();
    const author = createNameDocument('J.K. Rowling');
    const category = createNameDocument('Fantasy');
    const book = createBookDocument({
      title: 'Harry Potter',
      authorIds: [author._id],
      categoryIds: [category._id],
    });
    const copies = [createCopyDocument(book._id, 1), createCopyDocument(book._id, 2)];
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findBookByIsbn.mockResolvedValue(null);
    repository.findAuthorByName.mockResolvedValue(null);
    repository.createAuthor.mockResolvedValue(author);
    repository.findCategoryByIdentifier.mockResolvedValue(category);
    repository.createBook.mockResolvedValue(book);
    repository.insertBookCopies.mockResolvedValue(copies);
    repository.findAuthorsByIds.mockResolvedValue([author]);
    repository.findCategoriesByIds.mockResolvedValue([category]);

    const service = new CatalogService(repository);
    const result = await service.createBook({
      isbn: '9781234567890',
      title: 'Harry Potter',
      authors: ['J.K. Rowling'],
      categories: ['Fantasy'],
      quantity: 2,
      shelfLocation: 'A1',
    });

    expect(result.title).toBe('Harry Potter');
    expect(result.totalCopies).toBe(2);
    expect(result.copies).toHaveLength(2);
    expect(repository.createBook).toHaveBeenCalledTimes(1);
    expect(repository.insertBookCopies).toHaveBeenCalledTimes(1);
    expect(repository.createCategory).not.toHaveBeenCalled();
  });

  it('rejects createBook when category does not exist', async () => {
    const repository = createRepositoryMock();
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findBookByIsbn.mockResolvedValue(null);
    repository.findAuthorByName.mockResolvedValue(createNameDocument('Author'));
    repository.findCategoryByIdentifier.mockResolvedValue(null);

    const service = new CatalogService(repository);

    await expect(
      service.createBook({
        isbn: '9781234567890',
        title: 'Missing Category Book',
        authors: ['Author'],
        categories: ['Missing Category'],
        quantity: 1,
      }),
    ).rejects.toThrow('Category does not exist: Missing Category');

    expect(repository.createBook).not.toHaveBeenCalled();
    expect(repository.createCategory).not.toHaveBeenCalled();
  });

  it('rejects createBook when ISBN already exists', async () => {
    const repository = createRepositoryMock();
    repository.findBookByIsbn.mockResolvedValue(createBookDocument());

    const service = new CatalogService(repository);

    await expect(
      service.createBook({
        isbn: '9781234567890',
        title: 'Duplicate Book',
        authors: ['Author'],
        categories: ['Category'],
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('searches books and maps availability counts', async () => {
    const repository = createRepositoryMock();
    const author = createNameDocument('Author');
    const category = createNameDocument('Category');
    const book = createBookDocument({
      title: 'Harry Potter',
      authorIds: [author._id],
      categoryIds: [category._id],
    });

    repository.findAvailableBookIds.mockResolvedValue([book._id]);
    repository.findAuthorIdsBySearch.mockResolvedValue([author._id]);
    repository.listBooks.mockResolvedValue({
      books: [book],
      total: 1,
    });
    repository.findAuthorsByIds.mockResolvedValue([author]);
    repository.findCategoriesByIds.mockResolvedValue([category]);
    repository.countCopiesForBookIds.mockResolvedValue([
      {
        _id: book._id,
        totalCopies: 3,
        availableCopies: 1,
      },
    ]);

    const service = new CatalogService(repository);
    const result = await service.searchBooks({
      q: 'harry',
      available: true,
      page: 1,
      limit: 10,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.availableCopies).toBe(1);
    expect(result.items[0]?.title).toBe('Harry Potter');
    expect(repository.findAuthorIdsBySearch).toHaveBeenCalledWith('harry');
    expect(repository.listBooks).toHaveBeenCalledWith(expect.objectContaining({
      filter: expect.objectContaining({
        $or: expect.arrayContaining([
          expect.objectContaining({ authorIds: { $in: [author._id] } }),
        ]),
      }),
    }));
  });

  it('notifies the next reservation when a copy returns to available', async () => {
    const repository = createRepositoryMock();
    const reservationQueue = createReservationQueueMock();
    const book = createBookDocument();
    const damagedCopy = createCopyDocument(book._id, 1, { status: CopyStatus.Damaged });
    const availableCopy = { ...damagedCopy, status: CopyStatus.Available };
    const reservedCopy = { ...damagedCopy, status: CopyStatus.Reserved };

    repository.findBookCopyById
      .mockResolvedValueOnce(damagedCopy)
      .mockResolvedValueOnce(reservedCopy);
    repository.updateBookCopyById.mockResolvedValue(availableCopy);
    reservationQueue.notifyNext.mockResolvedValue({ _id: new mongoose.Types.ObjectId().toString() } as any);

    const service = new CatalogService(repository, reservationQueue);
    const result = await service.updateCopyStatus(damagedCopy.id, { status: CopyStatus.Available });

    expect(reservationQueue.notifyNext).toHaveBeenCalledWith(book.id, damagedCopy.id, undefined);
    expect(result.status).toBe(CopyStatus.Reserved);
  });

  it('blocks soft delete when borrowed copies exist', async () => {
    const repository = createRepositoryMock();
    const book = createBookDocument();
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findBookById.mockResolvedValue(book);
    repository.hasBorrowedCopies.mockResolvedValue(true);
    repository.hasWaitingReservations.mockResolvedValue(false);

    const service = new CatalogService(repository);

    await expect(service.softDeleteBook(book.id)).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('adds copies starting from the next copy index', async () => {
    const repository = createRepositoryMock();
    const reservationQueue = createReservationQueueMock();
    const book = createBookDocument();
    const copies = [createCopyDocument(book._id, 3), createCopyDocument(book._id, 4)];
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findBookById.mockResolvedValue(book);
    repository.countCopiesByBookId.mockResolvedValue(2);
    repository.insertBookCopies.mockResolvedValue(copies);
    repository.findBookCopiesByBookId.mockResolvedValue(copies);
    reservationQueue.notifyNext.mockResolvedValue(null);

    const service = new CatalogService(repository, reservationQueue);
    const result = await service.addCopies(book.id, {
      count: 2,
      shelfLocation: 'B2',
    });

    expect(result.copies).toHaveLength(2);
    expect(repository.countCopiesByBookId).toHaveBeenCalledWith(book.id, expect.anything());
    expect(reservationQueue.notifyNext).toHaveBeenCalledTimes(1);
    expect(reservationQueue.notifyNext).toHaveBeenCalledWith(book.id, copies[0].id, undefined);
  });

  it('advances waiting reservations for newly added copies', async () => {
    const repository = createRepositoryMock();
    const reservationQueue = createReservationQueueMock();
    const book = createBookDocument();
    const copies = [
      createCopyDocument(book._id, 3, { status: CopyStatus.Reserved }),
      createCopyDocument(book._id, 4),
    ];
    const fakeSession = {
      withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
      endSession: jest.fn(),
    };

    jest.spyOn(mongoose, 'startSession').mockResolvedValue(fakeSession as any);

    repository.findBookById.mockResolvedValue(book);
    repository.countCopiesByBookId.mockResolvedValue(2);
    repository.insertBookCopies.mockResolvedValue(copies);
    repository.findBookCopiesByBookId.mockResolvedValue(copies);
    reservationQueue.notifyNext
      .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId().toString() } as any)
      .mockResolvedValueOnce(null);

    const service = new CatalogService(repository, reservationQueue);
    const result = await service.addCopies(book.id, {
      count: 2,
      shelfLocation: 'B2',
    });

    expect(reservationQueue.notifyNext).toHaveBeenCalledTimes(2);
    expect(reservationQueue.notifyNext).toHaveBeenNthCalledWith(1, book.id, copies[0].id, undefined);
    expect(reservationQueue.notifyNext).toHaveBeenNthCalledWith(2, book.id, copies[1].id, undefined);
    expect(result.copies[0]?.status).toBe(CopyStatus.Reserved);
    expect(result.copies[1]?.status).toBe(CopyStatus.Available);
  });

});
