import { Schema, model, models, type HydratedDocument, type Model } from 'mongoose';

export interface FineRate {
  ratePerDay: number;
  appliesTo: string;
  effectiveFrom: Date;
}

export interface FineRateModelType extends Model<FineRate> {
  getCurrentRate(date: Date): Promise<FineRateDocument | null>;
}

export type FineRateDocument = HydratedDocument<FineRate>;

const fineRateSchema = new Schema<FineRate, FineRateModelType>(
  {
    ratePerDay: {
      type: Number,
      required: true,
      min: 0,
    },
    appliesTo: {
      type: String,
      required: true,
      default: 'all',
      trim: true,
    },
    effectiveFrom: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'fineRates',
    versionKey: false,
  },
);

fineRateSchema.index({ effectiveFrom: -1 });

fineRateSchema.static('getCurrentRate', function getCurrentRate(date: Date) {
  return this.findOne({ effectiveFrom: { $lte: date } }).sort({ effectiveFrom: -1 }).exec();
});

export const FineRateModel = (models.FineRate as FineRateModelType | undefined) ?? model<FineRate, FineRateModelType>('FineRate', fineRateSchema);
