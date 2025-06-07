// import { Injectable, OnModuleInit } from '@nestjs/common';
// import * as chokidar from 'chokidar';
// import * as TailStream from 'tail-stream';
// import * as fs from 'fs';
// import * as path from 'path';

// @Injectable()
// export class HandledataService implements OnModuleInit {
//   private readonly watchDir = '/root/hl/data/replica_cmds';
//   private readonly activeTails: Map<string, TailStream> = new Map();

//   onModuleInit() {
//     console.log(`👀 Đang theo dõi thư mục: ${this.watchDir}`);

//     // Theo dõi toàn bộ file trong thư mục (đệ quy)
//     const watcher = chokidar.watch(this.watchDir, {
//       persistent: true,
//       ignoreInitial: false,
//       depth: undefined,
//       awaitWriteFinish: {
//         stabilityThreshold: 200,
//         pollInterval: 100,
//       },
//     });

//     watcher
//       .on('add', this.startTailingFile.bind(this))
//       .on('change', (path) => {
//         // Không cần làm gì ở đây vì tail-stream đã theo dõi rồi
//       })
//       .on('unlink', this.stopTailingFile.bind(this));
//   }

//   private startTailingFile(filePath: string) {
//     if (this.activeTails.has(filePath) || fs.statSync(filePath).isDirectory())
//       return;

//     console.log(`📄 Bắt đầu theo dõi: ${filePath}`);

//     const tail = TailStream.createReadStream(filePath, {
//       beginAt: 'end', // Bắt đầu từ phần mới ghi
//       onMove: 'follow', // Nếu file bị move/rename vẫn tiếp tục tail
//       detectTruncate: true,
//     });

//     tail.on('data', (chunk: Buffer) => {
//       const lines = chunk
//         .toString()
//         .split('\n')
//         .filter((line) => line.trim() !== '');
//       lines.forEach((line) => {
//         console.log(line);
//         // TODO: Gửi đi nơi khác, xử lý logic, emit WebSocket...
//       });
//     });

//     tail.on('error', (err) => {
//       console.error(`❌ Lỗi khi tail ${filePath}:`, err.message);
//     });

//     this.activeTails.set(filePath, tail);
//   }

//   private stopTailingFile(filePath: string) {
//     const tail = this.activeTails.get(filePath);
//     if (tail) {
//       console.log(`🛑 Dừng tail: ${filePath}`);
//       tail.destroy();
//       this.activeTails.delete(filePath);
//     }
//   }
// }
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as chokidar from 'chokidar';
import * as TailStream from 'tail-stream';
import * as fs from 'fs';

@Injectable()
export class HandledataService implements OnModuleInit {
  private readonly watchDir = '/root/hl/data/replica_cmds';
  private readonly activeTails: Map<string, TailStream> = new Map();
  private buffers: Map<string, string> = new Map(); // Lưu buffer dư cho mỗi file

  onModuleInit() {
    console.log(`👀 Đang theo dõi thư mục: ${this.watchDir}`);

    const watcher = chokidar.watch(this.watchDir, {
      persistent: true,
      ignoreInitial: false,
      depth: undefined,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 100,
      },
    });

    watcher
      .on('add', this.startTailingFile.bind(this))
      .on('unlink', this.stopTailingFile.bind(this));
  }

  private startTailingFile(filePath: string) {
    if (this.activeTails.has(filePath) || fs.statSync(filePath).isDirectory())
      return;

    console.log(`📄 Bắt đầu theo dõi: ${filePath}`);

    const tail = TailStream.createReadStream(filePath, {
      beginAt: 'end',
      onMove: 'follow',
      detectTruncate: true,
    });

    this.buffers.set(filePath, '');

    tail.on('data', (chunk: Buffer) => {
      let buffer = this.buffers.get(filePath) || '';
      buffer += chunk.toString();

      const lines = buffer.split('\n');
      // Lấy phần cuối chưa hoàn chỉnh lại vào buffer
      this.buffers.set(filePath, lines.pop() || '');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const json = JSON.parse(trimmed);
          // Xử lý json ở đây
          console.log('📥 JSON nhận được:', json);
          // TODO: Gửi đi nơi khác, emit websocket, ...
        } catch (err) {
          console.warn(`⚠️ Dữ liệu không phải JSON hợp lệ: ${trimmed}`);
        }
      }
    });

    tail.on('error', (err) => {
      console.error(`❌ Lỗi khi tail ${filePath}:`, err.message);
    });

    this.activeTails.set(filePath, tail);
  }

  private stopTailingFile(filePath: string) {
    const tail = this.activeTails.get(filePath);
    if (tail) {
      console.log(`🛑 Dừng tail: ${filePath}`);
      tail.destroy();
      this.activeTails.delete(filePath);
      this.buffers.delete(filePath);
    }
  }
}
