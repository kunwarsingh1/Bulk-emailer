import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IDraft extends Document {
  _id: Types.ObjectId;
  subject: string;
  body: string;
  recipientIds: Types.ObjectId[];
  conversationId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const DraftSchema = new Schema<IDraft>(
  {
    subject: { type: String, default: '' },
    body: { type: String, default: '' },
    recipientIds: [{ type: Schema.Types.ObjectId, ref: 'Contact' }],
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
  },
  { timestamps: true }
);

export const Draft =
  mongoose.models.Draft ?? mongoose.model<IDraft>('Draft', DraftSchema);
