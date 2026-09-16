import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface ITemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  subject: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
}

const TemplateSchema = new Schema<ITemplate>(
  {
    name: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
  },
  { timestamps: true }
);

export const Template =
  mongoose.models.Template ??
  mongoose.model<ITemplate>('Template', TemplateSchema);
