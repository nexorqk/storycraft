import { Injectable, Logger } from '@nestjs/common';
import { pdf } from '@react-pdf/renderer';

import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { BookDocument, type BookPdfData } from './book-document';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async generateBookPdf(bookId: string): Promise<string> {
    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      include: {
        child: true,
        pages: {
          orderBy: { pageNumber: 'asc' },
          include: {
            illustration: {
              select: { objectKey: true },
            },
          },
        },
      },
    });

    if (!book) {
      throw new Error(`Book ${bookId} not found`);
    }

    if (book.pages.length === 0) {
      throw new Error(`Book ${bookId} has no pages to generate PDF`);
    }

    const pagesWithUrls = await Promise.all(
      book.pages.map(async (page) => {
        let illustrationUrl: string | undefined;

        if (page.illustration?.objectKey) {
          illustrationUrl = await this.storage.getSignedDownloadUrl(
            page.illustration.objectKey,
            3600,
          );
        }

        return {
          pageNumber: page.pageNumber,
          text: page.text,
          illustrationUrl,
        };
      }),
    );

    const pdfData: BookPdfData = {
      title: book.title || 'Сказка',
      childName: book.childNameInStory || book.child.name,
      pages: pagesWithUrls,
    };

    const document = BookDocument({ data: pdfData });
    const stream = await pdf(document).toBuffer();
    const buffer = await this.streamToBuffer(stream);

    const objectKey = this.storage.buildKey('books', bookId, 'book.pdf');
    await this.storage.uploadFile(objectKey, buffer, 'application/pdf');

    this.logger.log(`PDF generated and uploaded for book ${bookId}`);

    return objectKey;
  }
}
