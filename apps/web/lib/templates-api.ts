import { API_URL } from './auth-api';

export type TemplateInfo = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  ageMin: number | null;
  ageMax: number | null;
  pageCount: number;
  isActive: boolean;
};

export async function listTemplates() {
  const response = await fetch(`${API_URL}/templates`, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load templates: ${response.status}`);
  }

  const data = (await response.json()) as { templates: TemplateInfo[] };
  return data.templates;
}

export async function getTemplateBySlug(slug: string) {
  const response = await fetch(`${API_URL}/templates/${slug}`, {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to load template: ${response.status}`);
  }

  const data = (await response.json()) as { template: TemplateInfo };
  return data.template;
}
