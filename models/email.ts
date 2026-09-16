import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IEmail extends Document {
  _id: Types.ObjectId;
  contactId: Types.ObjectId;
  conversationId: Types.ObjectId;
  direction: 'OUTBOUND' | 'INBOUND';
  recipientEmail: string;
  recipientName: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  messageId: string | null;
  providerMessageId: string | null;
  providerId: string | null;
  inReplyTo: string | null;
  references: string[];
  status: 'QUEUED' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'FAILED' | 'COMPLAINT' | 'RECEIVED';
  batchId: string | null;
  trackingToken: string | null;
  error: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  openedAt: Date | null;
  lastOpenedAt: Date | null;
  openCount: number;
  clickedAt: Date | null;
  lastClickedAt: Date | null;
  clickCount: number;
  createdAt: Date;
}

const EmailSchema = new Schema<IEmail>(
  {
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
    direction: { type: String, enum: ['OUTBOUND', 'INBOUND'], required: true },
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, default: '' },
    subject: { type: String, required: true },
    htmlBody: { type: String, default: '' },
    textBody: { type: String, default: '' },
    messageId: { type: String, default: null },
    providerMessageId: { type: String, default: null },
    providerId: { type: String, default: null },
    inReplyTo: { type: String, default: null },
    references: [{ type: String }],
    status: {
      type: String,
      enum: ['QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'COMPLAINT', 'RECEIVED'],
      default: 'QUEUED',
    },
    batchId: { type: String, default: null },
    trackingToken: { type: String, default: null },
    error: { type: String, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    bouncedAt: { type: Date, default: null },
    openedAt: { type: Date, default: null },
    lastOpenedAt: { type: Date, default: null },
    openCount: { type: Number, default: 0 },
    clickedAt: { type: Date, default: null },
    lastClickedAt: { type: Date, default: null },
    clickCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EmailSchema.index({ conversationId: 1, createdAt: 1 });
EmailSchema.index({ batchId: 1 });
EmailSchema.index({ trackingToken: 1 });
EmailSchema.index({ providerId: 1 });
EmailSchema.index({ contactId: 1, createdAt: -1 });

export const Email =
  mongoose.models.Email ?? mongoose.model<IEmail>('Email', EmailSchema);
