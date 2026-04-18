import { Schema, model, models, type HydratedDocument, type Model } from 'mongoose';

export interface Author {
  name: string;
  bio?: string;
}

export type AuthorDocument = HydratedDocument<Author>;
type AuthorModelType = Model<Author>;

const authorSchema = new Schema<Author, AuthorModelType>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
  },
  {
    collection: 'authors',
    versionKey: false,
  },
);

authorSchema.index({ name: 'text' });

export const AuthorModel = (models.Author as AuthorModelType | undefined) ?? model<Author, AuthorModelType>('Author', authorSchema);
