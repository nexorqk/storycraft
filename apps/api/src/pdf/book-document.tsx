import { Document, Page, Text, Image } from '@react-pdf/renderer';

export interface PdfPageData {
  pageNumber: number;
  text: string;
  illustrationUrl?: string;
}

export interface BookPdfData {
  title: string;
  childName: string;
  pages: PdfPageData[];
}

const styles = {
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
  } as const,
  cover: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  } as const,
  coverTitle: {
    fontSize: 28,
    textAlign: 'center' as const,
    marginBottom: 20,
    fontFamily: 'Helvetica-Bold',
  } as const,
  coverSubtitle: {
    fontSize: 16,
    textAlign: 'center' as const,
    color: '#666',
  } as const,
  contentPage: {
    padding: 40,
    display: 'flex',
    flexDirection: 'column' as const,
  } as const,
  illustration: {
    width: '100%',
    height: 350,
    objectFit: 'contain' as const,
    marginBottom: 20,
    borderRadius: 8,
  } as const,
  text: {
    fontSize: 14,
    lineHeight: 1.6,
    textAlign: 'justify' as const,
  } as const,
  pageNumber: {
    position: 'absolute' as const,
    bottom: 30,
    left: 0,
    right: 0,
    textAlign: 'center' as const,
    fontSize: 10,
    color: '#999',
  } as const,
};

interface BookDocumentProps {
  data: BookPdfData;
}

export const BookDocument = ({ data }: BookDocumentProps) => (
  <Document>
    <Page size="A4" style={styles.cover}>
      <Text style={styles.coverTitle}>{data.title}</Text>
      <Text style={styles.coverSubtitle}>Специально для {data.childName}</Text>
    </Page>

    {data.pages.map((page) => (
      <Page key={page.pageNumber} size="A4" style={styles.contentPage}>
        {page.illustrationUrl && (
          <Image src={page.illustrationUrl} style={styles.illustration} />
        )}
        <Text style={styles.text}>{page.text}</Text>
        <Text style={styles.pageNumber}>{page.pageNumber}</Text>
      </Page>
    ))}
  </Document>
);
