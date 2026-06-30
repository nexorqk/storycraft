import { request } from './api-client';

export type AdminDashboard = {
  users: number;
  books: number;
  templates: number;
  activeTemplates: number;
  pendingJobs: number;
  failedJobs: number;
  completedBooks: number;
  failedBooks: number;
};

export async function getDashboard() {
  return request<AdminDashboard>('/admin/dashboard');
}
