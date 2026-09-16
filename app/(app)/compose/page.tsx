import { db } from '@/lib/db';
import { Contact } from '@/models/contact';
import { Conversation } from '@/models/conversation';
import { Draft } from '@/models/draft';
import { Template } from '@/models/template';
import ComposeClient from '@/components/compose-client';

export const dynamic = 'force-dynamic';

export default async function ComposePage({
  searchParams,
}: {
  searchParams: Promise<{
    conversationId?: string;
    conversationIds?: string;
    draftId?: string;
  }>;
}) {
  const params = await searchParams;
  await db();

  let context: {
    mode: 'new' | 'followup';
    conversations: Array<{
      id: string;
      subject: string;
      contact: { id: string; name: string; email: string };
    }>;
    draft: {
      id: string;
      subject: string;
      body: string;
      recipientIds: string[];
    } | null;
  } = {
    mode: 'new',
    conversations: [],
    draft: null,
  };

  if (params.conversationId) {
    const conv = await Conversation.findById(params.conversationId).lean() as any;
    if (conv) {
      const contact = await Contact.findById(conv.contactId).lean() as any;
      context = {
        mode: 'followup',
        conversations: [
          {
            id: conv._id.toString(),
            subject: conv.subject,
            contact: {
              id: contact?._id?.toString() ?? '',
              name: contact?.name ?? '',
              email: contact?.email ?? '',
            },
          },
        ],
        draft: null,
      };
    }
  } else if (params.conversationIds) {
    const ids = params.conversationIds.split(',').filter(Boolean);
    const convs = await Conversation.find({ _id: { $in: ids } }).lean() as any[];
    const contactIds = [...new Set(convs.map((c: any) => c.contactId.toString()))];
    const contacts = await Contact.find({ _id: { $in: contactIds } }).lean() as any[];
    const contactMap = new Map(contacts.map((c: any) => [c._id.toString(), c]));

    context = {
      mode: 'followup',
      conversations: convs.map((c: any) => {
        const contact = contactMap.get(c.contactId.toString());
        return {
          id: c._id.toString(),
          subject: c.subject,
          contact: {
            id: contact?._id?.toString() ?? '',
            name: contact?.name ?? '',
            email: contact?.email ?? '',
          },
        };
      }),
      draft: null,
    };
  } else if (params.draftId) {
    const draft = await Draft.findById(params.draftId).lean() as any;
    if (draft) {
      let convContext: typeof context.conversations = [];
      if (draft.conversationId) {
        const conv = await Conversation.findById(draft.conversationId).lean() as any;
        if (conv) {
          const contact = await Contact.findById(conv.contactId).lean() as any;
          convContext = [{
            id: conv._id.toString(),
            subject: conv.subject,
            contact: {
              id: contact?._id?.toString() ?? '',
              name: contact?.name ?? '',
              email: contact?.email ?? '',
            },
          }];
        }
      }

      context = {
        mode: draft.conversationId ? 'followup' : 'new',
        conversations: convContext,
        draft: {
          id: draft._id.toString(),
          subject: draft.subject,
          body: draft.body,
          recipientIds: draft.recipientIds.map((id: any) => id.toString()),
        },
      };
    }
  }

  const templates = await Template.find().sort({ updatedAt: -1 }).lean() as any[];

  return (
    <ComposeClient
      context={context}
      templates={templates.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        subject: t.subject,
        body: t.body,
      }))}
    />
  );
}
