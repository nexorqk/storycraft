import { API_URL } from './auth-api';

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Request failed: ${response.status} ${message}`);
  }

  return (await response.json()) as T;
}

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
