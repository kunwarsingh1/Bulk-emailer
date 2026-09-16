import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type ContactStatus = 'ACTIVE' | 'BOUNCED' | 'REPLIED' | 'UNSUBSCRIBED';

export interface IContact extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  description: string;
  status: ContactStatus;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    name: { type: String, required: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['ACTIVE', 'BOUNCED', 'REPLIED', 'UNSUBSCRIBED'],
      default: 'ACTIVE',
    },
    lastActivityAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ContactSchema.index({ name: 'text', email: 'text' });

export const Contact =
  mongoose.models.Contact ?? mongoose.model<IContact>('Contact', ContactSchema);
