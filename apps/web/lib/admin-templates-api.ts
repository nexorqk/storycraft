import { request } from './api-client';

export type AdminTemplateSummary = {
  id: string;
  slug: string;
  title: string;
  isActive: boolean;
  pageCount: number;
  language: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminTemplatePage = {
  id: string;
  pageNumber: number;
  textPrompt: string;
  illustrationPrompt: string;
  baseText: string;
  illustrationPromptBase: string | null;
  sceneDescription: string | null;
  personalizationSlots: unknown;
  createdAt: string;
  updatedAt: string;
};

export type AdminTemplateDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  ageMin: number | null;
  ageMax: number | null;
  pageCount: number;
  storyPrompt: string;
  illustrationStylePrompt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  pages: AdminTemplatePage[];
};

export async function listAdminTemplates() {
  return request<{ templates: AdminTemplateSummary[] }>('/admin/templates');
}

export async function getAdminTemplate(templateId: string) {
  return request<{ template: AdminTemplateDetail }>(
    `/admin/templates/${templateId}`,
  );
}

export async function createAdminTemplate(dto: {
  slug: string;
  title: string;
  description?: string;
  language?: string;
  ageMin?: number;
  ageMax?: number;
  pageCount?: number;
  storyPrompt: string;
  illustrationStylePrompt: string;
  isActive?: boolean;
}) {
  return request<{ template: AdminTemplateSummary }>('/admin/templates', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function updateAdminTemplate(
  templateId: string,
  dto: {
    slug?: string;
    title?: string;
    description?: string;
    language?: string;
    ageMin?: number;
    ageMax?: number;
    pageCount?: number;
    storyPrompt?: string;
    illustrationStylePrompt?: string;
    isActive?: boolean;
  },
) {
  return request<{ template: AdminTemplateSummary }>(
    `/admin/templates/${templateId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(dto),
    },
  );
}

export async function deleteAdminTemplate(templateId: string) {
  return request<{ ok: true }>(`/admin/templates/${templateId}`, {
    method: 'DELETE',
  });
}

export async function createAdminTemplatePage(
  templateId: string,
  dto: {
    pageNumber: number;
    textPrompt: string;
    illustrationPrompt: string;
    baseText?: string;
    illustrationPromptBase?: string;
    sceneDescription?: string;
    personalizationSlots?: Record<string, unknown>;
  },
) {
  return request<{ page: AdminTemplatePage }>(
    `/admin/templates/${templateId}/pages`,
    {
      method: 'POST',
      body: JSON.stringify(dto),
    },
  );
}

export async function updateAdminTemplatePage(
  templateId: string,
  pageId: string,
  dto: {
    pageNumber?: number;
    textPrompt?: string;
    illustrationPrompt?: string;
    baseText?: string;
    illustrationPromptBase?: string;
    sceneDescription?: string;
    personalizationSlots?: Record<string, unknown>;
  },
) {
  return request<{ page: AdminTemplatePage }>(
    `/admin/templates/${templateId}/pages/${pageId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(dto),
    },
  );
}

export async function deleteAdminTemplatePage(
  templateId: string,
  pageId: string,
) {
  return request<{ ok: true }>(
    `/admin/templates/${templateId}/pages/${pageId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function uploadTemplateCover(templateId: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'}/admin/templates/${templateId}/cover`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
    },
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message ?? 'Failed to upload cover image');
  }

  return (await response.json()) as { template: AdminTemplateSummary };
}

export async function getTemplateCoverUrl(templateId: string) {
  return request<{ url: string | null }>(
    `/admin/templates/${templateId}/cover-url`,
  );
}
