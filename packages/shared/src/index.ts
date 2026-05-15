export const DEFAULT_LANGUAGE = 'ru' as const;

export type SupportedLanguage = typeof DEFAULT_LANGUAGE;

export const BOOK_STATUSES = [
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;

export type BookStatus = (typeof BOOK_STATUSES)[number];

export const JOB_STATUSES = [
  'QUEUED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const FREE_PLAN_MONTHLY_BOOK_LIMIT = 3;

export const COVER_STYLES = [
  'default',
  'watercolor',
  'cartoon',
  'realistic',
] as const;

export type CoverStyle = (typeof COVER_STYLES)[number];
