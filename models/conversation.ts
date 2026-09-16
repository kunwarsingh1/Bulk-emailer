import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IConversation extends Document {
  _id: Types.ObjectId;
  contactId: Types.ObjectId;
  subject: string;
  providerThreadId: string | null;
  lastMessageId: string | null;
  replied: boolean;
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    subject: { type: String, required: true },
    providerThreadId: { type: String, default: null },
    lastMessageId: { type: String, default: null },
    replied: { type: Boolean, default: false },
    lastActivityAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ConversationSchema.index({ contactId: 1, lastActivityAt: -1 });
ConversationSchema.index({ lastActivityAt: -1 });

export const Conversation =
  mongoose.models.Conversation ??
  mongoose.model<IConversation>('Conversation', ConversationSchema);
