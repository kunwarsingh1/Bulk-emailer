import { db } from '@/lib/db';
import { Template } from '@/models/template';
import TemplateManager from '@/components/template-manager';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  await db();
  const templates = await Template.find().sort({ updatedAt: -1 }).lean() as any[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Templates</h1>
      <TemplateManager
        templates={templates.map((t: any) => ({
          id: t._id.toString(),
          name: t.name,
          subject: t.subject,
          body: t.body,
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
