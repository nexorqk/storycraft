export type IllustrationRequest = {
  prompt: string;
  bookId: string;
  pageNumber: number;
};

export type IllustrationResult = {
  buffer: Buffer;
  mimeType: string;
};

export interface IllustrationProvider {
  generate(request: IllustrationRequest): Promise<IllustrationResult>;
}
