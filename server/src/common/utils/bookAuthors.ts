import { AuthorModel } from '../../models/Author.model';
import type { BookDocument } from '../../models/Book.model';
import { CategoryModel } from '../../models/Category.model';
import { uniqueObjectIds } from './collectionHelpers';

export interface BookNameRef {
  _id: string;
  name: string;
}

export async function buildBookCategoriesMap(books: BookDocument[]): Promise<Map<string, BookNameRef[]>> {
  if (books.length === 0) {
    return new Map();
  }

  const categoryIds = uniqueObjectIds(books.flatMap((book) => book.categoryIds));

  if (categoryIds.length === 0) {
    return new Map(books.map((book) => [book._id.toString(), []]));
  }

  const categories = await CategoryModel.find({ _id: { $in: categoryIds } }).exec();
  const categoryById = new Map<string, BookNameRef>(
    categories.map((category) => [category._id.toString(), { _id: category._id.toString(), name: category.name }]),
  );

  const result = new Map<string, BookNameRef[]>();

  for (const book of books) {
    const refs = book.categoryIds
      .map((id) => categoryById.get(id.toString()))
      .filter((value): value is BookNameRef => Boolean(value));
    result.set(book._id.toString(), refs);
  }

  return result;
}

export async function buildBookAuthorsMap(books: BookDocument[]): Promise<Map<string, BookNameRef[]>> {
  if (books.length === 0) {
    return new Map();
  }

  const authorIds = uniqueObjectIds(books.flatMap((book) => book.authorIds));

  if (authorIds.length === 0) {
    return new Map(books.map((book) => [book._id.toString(), []]));
  }

  const authors = await AuthorModel.find({ _id: { $in: authorIds } }).exec();
  const authorById = new Map<string, BookNameRef>(
    authors.map((author) => [author._id.toString(), { _id: author._id.toString(), name: author.name }]),
  );

  const result = new Map<string, BookNameRef[]>();

  for (const book of books) {
    const refs = book.authorIds
      .map((id) => authorById.get(id.toString()))
      .filter((value): value is BookNameRef => Boolean(value));
    result.set(book._id.toString(), refs);
  }

  return result;
}
