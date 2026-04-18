import { Schema, model, models, type HydratedDocument, type Model, type Types } from 'mongoose';

export interface Category {
  name: string;
  parentId?: Types.ObjectId | null;
}

export type CategoryDocument = HydratedDocument<Category>;
type CategoryModel = Model<Category>;

const categorySchema = new Schema<Category, CategoryModel>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
  },
  {
    collection: 'categories',
    versionKey: false,
  },
);

export const CategoryModel = (models.Category as CategoryModel | undefined) ?? model<Category, CategoryModel>('Category', categorySchema);
