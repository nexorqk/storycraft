import { Injectable, Logger } from '@nestjs/common';

import type {
  IllustrationRequest,
  IllustrationResult,
  IllustrationProvider,
} from './illustration-types';

@Injectable()
export class MockIllustrationProvider implements IllustrationProvider {
  private readonly logger = new Logger(MockIllustrationProvider.name);

  async generate(request: IllustrationRequest): Promise<IllustrationResult> {
    this.logger.log(
      `[MOCK] Generating illustration for book ${request.bookId}, page ${request.pageNumber}`,
    );

    const buffer = this.generatePlaceholderImage(request);

    return { buffer, mimeType: 'image/png' };
  }

  private generatePlaceholderImage(request: IllustrationRequest): Buffer {
    const width = 1024;
    const height = 1024;

    const headerSize = 8;
    const chunkSize = (name: string, dataLength: number) => 12 + dataLength + 4;
    const ihdrDataLength = 13;
    const idatDataLength = width * height * 3 + (height * Math.ceil(width / 8));

    const totalSize =
      headerSize +
      chunkSize('IHDR', ihdrDataLength) +
      chunkSize('IDAT', idatDataLength) +
      chunkSize('IEND', 0);

    const buffer = Buffer.alloc(totalSize);
    let offset = 0;

    buffer.writeUInt32BE(0x89504e47, 0);
    buffer.writeUInt32BE(0x0d0a1a0a, 4);
    offset = 8;

    const writeChunk = (
      name: string,
      data: Buffer,
      pos: number,
    ): number => {
      const nameBuf = Buffer.from(name, 'ascii');
      const dataLength = data.length;

      buffer.writeUInt32BE(dataLength, pos);
      nameBuf.copy(buffer, pos + 4);
      data.copy(buffer, pos + 8);

      const crcData = Buffer.concat([nameBuf, data]);
      const crc = this.crc32(crcData);
      buffer.writeUInt32BE(crc, pos + 8 + dataLength);

      return pos + 12 + dataLength;
    };

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;
    ihdrData[9] = 2;
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;

    offset = writeChunk('IHDR', ihdrData, offset);

    const rawData: number[] = [];
    const colors = [
      [255, 200, 150],
      [150, 200, 255],
      [200, 255, 150],
      [255, 150, 200],
      [150, 255, 255],
      [255, 255, 150],
    ];
    const colorIndex = request.pageNumber % colors.length;
    const color = colors[colorIndex] ?? [255, 255, 255];
    const r = color[0] ?? 255;
    const g = color[1] ?? 255;
    const b = color[2] ?? 255;

    for (let y = 0; y < height; y++) {
      rawData.push(0);
      for (let x = 0; x < width; x++) {
        const dx = x - width / 2;
        const dy = y - height / 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const maxDist = width / 2;
        const factor = 1 - dist / maxDist;

        const cr = Math.round(r * factor + 255 * (1 - factor));
        const cg = Math.round(g * factor + 255 * (1 - factor));
        const cb = Math.round(b * factor + 255 * (1 - factor));

        rawData.push(cr, cg, cb);
      }
    }

    const uncompressed = Buffer.from(rawData);
    const zlib = require('zlib');
    const compressed = zlib.deflateSync(uncompressed);

    offset = writeChunk('IDAT', compressed, offset);
    offset = writeChunk('IEND', Buffer.alloc(0), offset);

    return buffer;
  }

  private crc32(data: Buffer): number {
    let crc = 0xffffffff;
    const table = this.getCrcTable();

    for (let i = 0; i < data.length; i++) {
      const byte = data[i] ?? 0;
      const entry = table[(crc ^ byte) & 0xff] ?? 0;
      crc = entry ^ (crc >>> 8);
    }

    return (crc ^ 0xffffffff) >>> 0;
  }

  private getCrcTable(): number[] {
    const table: number[] = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table.push(c >>> 0);
    }
    return table;
  }
}
