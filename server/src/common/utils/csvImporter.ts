import { Readable } from 'node:stream';

import csvParser from 'csv-parser';

export type CsvRow = Record<string, string>;

function normalizeHeader(header: string): string {
  const compact = header.trim().toLowerCase().replace(/[\s_-]+/g, '');

  switch (compact) {
    case 'shelflocation':
      return 'shelfLocation';
    case 'publishyear':
      return 'publishYear';
    default:
      return compact;
  }
}

export async function parseCsvBuffer(buffer: Buffer): Promise<CsvRow[]> {
  return new Promise<CsvRow[]>((resolve, reject) => {
    const rows: CsvRow[] = [];

    Readable.from([buffer])
      .pipe(
        csvParser({
          mapHeaders: ({ header }) => normalizeHeader(header),
          mapValues: ({ value }) => value.trim(),
        }),
      )
      .on('data', (row: CsvRow) => {
        rows.push(row);
      })
      .on('end', () => {
        resolve(rows);
      })
      .on('error', (error: Error) => {
        reject(error);
      });
  });
}
