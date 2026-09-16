import mongoose, { Schema, type Document, type Types } from 'mongoose';

export type EmailEventType =
  | 'SENT'
  | 'DELIVERED'
  | 'BOUNCED'
  | 'OPENED'
  | 'CLICKED'
  | 'REPLY'
  | 'COMPLAINT'
  | 'FAILED';

export interface IEmailEvent extends Document {
  _id: Types.ObjectId;
  emailId: Types.ObjectId;
  contactId: Types.ObjectId;
  conversationId: Types.ObjectId | null;
  type: EmailEventType;
  at: Date;
  meta: Record<string, unknown> | null;
  createdAt: Date;
}

const EmailEventSchema = new Schema<IEmailEvent>(
  {
    emailId: { type: Schema.Types.ObjectId, ref: 'Email', required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', required: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', default: null },
    type: {
      type: String,
      enum: ['SENT', 'DELIVERED', 'BOUNCED', 'OPENED', 'CLICKED', 'REPLY', 'COMPLAINT', 'FAILED'],
      required: true,
    },
    at: { type: Date, default: Date.now },
    meta: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

EmailEventSchema.index({ contactId: 1, at: -1 });
EmailEventSchema.index({ emailId: 1 });

export const EmailEvent =
  mongoose.models.EmailEvent ??
  mongoose.model<IEmailEvent>('EmailEvent', EmailEventSchema);
