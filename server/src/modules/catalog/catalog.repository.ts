import { Types, type ClientSession, type FilterQuery, type UpdateQuery } from 'mongoose';

import { CopyStatus, LoanStatus, ReservationStatus } from '../../common/types/enums';
import { AuthorModel, type AuthorDocument } from '../../models/Author.model';
import { BookModel, type Book, type BookDocument } from '../../models/Book.model';
import { BookCopyModel, type BookCopy, type BookCopyDocument } from '../../models/BookCopy.model';
import { CategoryModel, type CategoryDocument } from '../../models/Category.model';
import { LoanRecordModel } from '../../models/LoanRecord.model';
import { ReservationModel } from '../../models/Reservation.model';

interface ListBooksParams {
  filter: FilterQuery<Book>;
  page: number;
  limit: number;
  q?: string;
}

interface CopyCountAggregate {
  _id: Types.ObjectId;
  totalCopies: number;
  availableCopies: number;
}

interface ActiveLoanSummary {
  copyId: Types.ObjectId;
  dueDate: Date;
  status: LoanStatus;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class CatalogRepository {
  async findBookById(bookId: string, includeDeleted: boolean = false, session?: ClientSession): Promise<BookDocument | null> {
    const filter: FilterQuery<Book> = includeDeleted ? { _id: bookId } : { _id: bookId, isDeleted: false };
    let query = BookModel.findOne(filter);

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findBookByIsbn(isbn: string, session?: ClientSession): Promise<BookDocument | null> {
    let query = BookModel.findOne({ isbn });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async createBook(data: Omit<Book, 'createdAt' | 'updatedAt'>, session: ClientSession): Promise<BookDocument> {
    const book = new BookModel(data);
    await book.save({ session });
    return book;
  }

  async updateBookById(bookId: string, update: UpdateQuery<Book>, session?: ClientSession): Promise<BookDocument | null> {
    return BookModel.findByIdAndUpdate(bookId, update, {
      new: true,
      runValidators: true,
      session,
    }).exec();
  }

  async listBooks(params: ListBooksParams): Promise<{ books: BookDocument[]; total: number }> {
    const { filter, page, limit, q } = params;
    const skip = (page - 1) * limit;
    let query = BookModel.find(filter).sort(q ? { createdAt: -1 } : { createdAt: -1 }).skip(skip).limit(limit);

    if (q) {
      query = query.select({ score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } });
    }

    const [books, total] = await Promise.all([
      query.exec(),
      BookModel.countDocuments(filter).exec(),
    ]);

    return { books, total };
  }

  async insertBookCopies(copies: Array<Omit<BookCopy, 'createdAt'>>, session: ClientSession): Promise<BookCopyDocument[]> {
    return BookCopyModel.insertMany(copies, {
      session,
      ordered: true,
    });
  }

  async countCopiesByBookId(bookId: string | Types.ObjectId, session?: ClientSession): Promise<number> {
    let query = BookCopyModel.countDocuments({ bookId });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async countCopiesForBookIds(bookIds: Types.ObjectId[]): Promise<CopyCountAggregate[]> {
    return BookCopyModel.aggregate<CopyCountAggregate>([
      {
        $match: {
          bookId: { $in: bookIds },
        },
      },
      {
        $group: {
          _id: '$bookId',
          totalCopies: { $sum: 1 },
          availableCopies: {
            $sum: {
              $cond: [{ $eq: ['$status', CopyStatus.Available] }, 1, 0],
            },
          },
        },
      },
    ]).exec();
  }

  async findBookCopiesByBookId(bookId: string): Promise<BookCopyDocument[]> {
    return BookCopyModel.find({ bookId }).sort({ createdAt: 1 }).exec();
  }

  async findBookCopyById(copyId: string): Promise<BookCopyDocument | null> {
    return BookCopyModel.findById(copyId).exec();
  }

  async updateBookCopyById(copyId: string, update: UpdateQuery<BookCopy>, session?: ClientSession): Promise<BookCopyDocument | null> {
    return BookCopyModel.findByIdAndUpdate(copyId, update, {
      new: true,
      runValidators: true,
      session,
    }).exec();
  }

  async findAvailableBookIds(): Promise<Types.ObjectId[]> {
    const ids = await BookCopyModel.distinct('bookId', {
      status: CopyStatus.Available,
    }).exec();

    return ids.map((value) => new Types.ObjectId(value));
  }

  async hasBorrowedCopies(bookId: string, session?: ClientSession): Promise<boolean> {
    let query = BookCopyModel.exists({
      bookId,
      status: CopyStatus.Borrowed,
    });

    if (session) {
      query = query.session(session);
    }

    const borrowedCopy = await query.exec();
    return borrowedCopy !== null;
  }

  async hasWaitingReservations(bookId: string, session?: ClientSession): Promise<boolean> {
    let query = ReservationModel.exists({
      bookId,
      status: ReservationStatus.Waiting,
    });

    if (session) {
      query = query.session(session);
    }

    const waitingReservation = await query.exec();
    return waitingReservation !== null;
  }

  async findActiveLoanSummariesByCopyIds(copyIds: Types.ObjectId[]): Promise<ActiveLoanSummary[]> {
    return LoanRecordModel.find({
      copyId: { $in: copyIds },
      status: { $in: [LoanStatus.Active, LoanStatus.Overdue] },
    })
      .select({
        copyId: 1,
        dueDate: 1,
        status: 1,
      })
      .lean<ActiveLoanSummary[]>()
      .exec();
  }

  async findAuthorsByIds(authorIds: Types.ObjectId[]): Promise<AuthorDocument[]> {
    return AuthorModel.find({
      _id: { $in: authorIds },
    }).exec();
  }

  async findCategoriesByIds(categoryIds: Types.ObjectId[]): Promise<CategoryDocument[]> {
    return CategoryModel.find({
      _id: { $in: categoryIds },
    }).exec();
  }

  async listCategories(): Promise<CategoryDocument[]> {
    return CategoryModel.find().sort({ name: 1 }).exec();
  }

  async findCategoryById(categoryId: string): Promise<CategoryDocument | null> {
    return CategoryModel.findById(categoryId).exec();
  }

  async findAuthorByName(name: string, session?: ClientSession): Promise<AuthorDocument | null> {
    let query = AuthorModel.findOne({
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async createAuthor(name: string, session: ClientSession): Promise<AuthorDocument> {
    const author = new AuthorModel({ name });
    await author.save({ session });
    return author;
  }

  async findCategoryByName(name: string, session?: ClientSession): Promise<CategoryDocument | null> {
    let query = CategoryModel.findOne({
      name: new RegExp(`^${escapeRegex(name)}$`, 'i'),
    });

    if (session) {
      query = query.session(session);
    }

    return query.exec();
  }

  async findCategoryByIdentifier(identifier: string): Promise<CategoryDocument | null> {
    if (Types.ObjectId.isValid(identifier)) {
      const categoryById = await CategoryModel.findById(identifier).exec();

      if (categoryById) {
        return categoryById;
      }
    }

    return this.findCategoryByName(identifier);
  }

  async createCategory(name: string, session: ClientSession): Promise<CategoryDocument> {
    const category = new CategoryModel({ name });
    await category.save({ session });
    return category;
  }

  async createCategoryRecord(name: string): Promise<CategoryDocument> {
    const category = new CategoryModel({ name });
    await category.save();
    return category;
  }

  async updateCategoryById(categoryId: string, update: UpdateQuery<{ name: string }>): Promise<CategoryDocument | null> {
    return CategoryModel.findByIdAndUpdate(categoryId, update, {
      new: true,
      runValidators: true,
    }).exec();
  }

  async deleteCategoryById(categoryId: string): Promise<CategoryDocument | null> {
    return CategoryModel.findByIdAndDelete(categoryId).exec();
  }

  async countBooksByCategoryId(categoryId: string | Types.ObjectId): Promise<number> {
    return BookModel.countDocuments({
      categoryIds: categoryId,
      isDeleted: false,
    }).exec();
  }

  async aggregateCategoryFacets(): Promise<Array<{ _id: Types.ObjectId; count: number }>> {
    return BookModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { isDeleted: false } },
      { $unwind: '$categoryIds' },
      { $group: { _id: '$categoryIds', count: { $sum: 1 } } },
    ]).exec();
  }

  async aggregatePublishYearRange(): Promise<{ min: number | null; max: number | null }> {
    const result = await BookModel.aggregate<{ _id: null; min: number | null; max: number | null }>([
      { $match: { isDeleted: false, publishYear: { $ne: null } } },
      { $group: { _id: null, min: { $min: '$publishYear' }, max: { $max: '$publishYear' } } },
    ]).exec();

    if (result.length === 0) {
      return { min: null, max: null };
    }

    return { min: result[0].min, max: result[0].max };
  }

  async countBooksWithAvailableCopies(): Promise<number> {
    const ids = await BookCopyModel.distinct('bookId', { status: CopyStatus.Available }).exec();
    return ids.length;
  }

  async countBooksWithStatus(status: CopyStatus): Promise<number> {
    const ids = await BookCopyModel.distinct('bookId', { status }).exec();
    return ids.length;
  }

  async aggregatePopularBookIds(windowDays: number, limit: number): Promise<Types.ObjectId[]> {
    const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
    const result = await LoanRecordModel.aggregate<{ _id: Types.ObjectId; loanCount: number }>([
      { $match: { checkoutDate: { $gte: cutoff } } },
      { $group: { _id: '$bookId', loanCount: { $sum: 1 } } },
      { $sort: { loanCount: -1 } },
      { $limit: limit },
    ]).exec();

    return result.map((entry) => entry._id);
  }

  async findTopCategoriesForMember(memberId: string, limit: number): Promise<Types.ObjectId[]> {
    const result = await LoanRecordModel.aggregate<{ _id: Types.ObjectId; loanCount: number }>([
      { $match: { memberId: new Types.ObjectId(memberId) } },
      { $lookup: { from: 'books', localField: 'bookId', foreignField: '_id', as: 'book' } },
      { $unwind: '$book' },
      { $unwind: '$book.categoryIds' },
      { $group: { _id: '$book.categoryIds', loanCount: { $sum: 1 } } },
      { $sort: { loanCount: -1 } },
      { $limit: limit },
    ]).exec();

    return result.map((entry) => entry._id);
  }

  async findActiveLoanedBookIdsByMember(memberId: string): Promise<Types.ObjectId[]> {
    const ids = await LoanRecordModel.distinct('bookId', {
      memberId: new Types.ObjectId(memberId),
      status: { $in: [LoanStatus.Active, LoanStatus.Overdue] },
    }).exec();

    return ids.map((value) => new Types.ObjectId(value));
  }

  async findRecommendedBooks(
    categoryIds: Types.ObjectId[],
    excludeBookIds: Types.ObjectId[],
    limit: number,
  ): Promise<BookDocument[]> {
    return BookModel.find({
      isDeleted: false,
      categoryIds: { $in: categoryIds },
      _id: { $nin: excludeBookIds },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async findBooksByIds(bookIds: Types.ObjectId[]): Promise<BookDocument[]> {
    return BookModel.find({ _id: { $in: bookIds }, isDeleted: false }).exec();
  }
}

export const catalogRepository = new CatalogRepository();
