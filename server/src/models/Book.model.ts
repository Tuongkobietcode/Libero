import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface Book {
  isbn: string;
  title: string;
  authorIds: Types.ObjectId[];
  categoryIds: Types.ObjectId[];
  bookValue?: number;
  publisher?: string;
  publishYear?: number;
  description?: string;
  coverImage?: string;
  language?: string;
  pageCount?: number;
  bookSize?: string;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type BookDocument = HydratedDocument<Book>;
type BookModelType = Model<Book>;

const bookSchema = new Schema<Book, BookModelType>(
  {
    isbn: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    authorIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Author',
        },
      ],
      default: [],
    },
    categoryIds: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Category',
        },
      ],
      default: [],
    },
    bookValue: {
      type: Number,
      min: 0,
    },
    publisher: {
      type: String,
      trim: true,
    },
    publishYear: {
      type: Number,
      min: 0,
    },
    description: {
      type: String,
      trim: true,
    },
    coverImage: {
      type: String,
      trim: true,
    },
    language: {
      type: String,
      trim: true,
    },
    pageCount: {
      type: Number,
      min: 0,
    },
    bookSize: {
      type: String,
      trim: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    collection: 'books',
    timestamps: true,
    versionKey: false,
  },
);

bookSchema.index(
  { title: 'text', isbn: 'text' },
  {
    weights: { title: 10, isbn: 5 },
    default_language: 'none',
    language_override: 'textSearchLanguage',
  },
);
bookSchema.index({ isDeleted: 1, createdAt: -1 });

export const BookModel = (models.Book as BookModelType | undefined) ?? model<Book, BookModelType>('Book', bookSchema);
