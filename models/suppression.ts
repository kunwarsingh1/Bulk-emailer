import mongoose, { Schema, type Document } from 'mongoose';

export type SuppressionReason = 'HARD_BOUNCE' | 'COMPLAINT' | 'UNSUBSCRIBED' | 'MANUAL';

export interface ISuppression extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  reason: SuppressionReason;
  createdAt: Date;
}

const SuppressionSchema = new Schema<ISuppression>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    reason: {
      type: String,
      enum: ['HARD_BOUNCE', 'COMPLAINT', 'UNSUBSCRIBED', 'MANUAL'],
      required: true,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Suppression =
  mongoose.models.Suppression ??
  mongoose.model<ISuppression>('Suppression', SuppressionSchema);
