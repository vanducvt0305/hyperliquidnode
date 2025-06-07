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
//         console.log(`📝 Dòng mới từ ${path.basename(filePath)}:`, line);

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
import * as path from 'path';

@Injectable()
export class HandledataService implements OnModuleInit {
  private readonly watchDir = '/root/hl/data/replica_cmds';
  private readonly activeTails: Map<string, TailStream> = new Map();

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

    tail.on('data', (chunk: Buffer) => {
      const lines = chunk
        .toString()
        .split('\n')
        .filter((line) => line.trim() !== '');

      for (const line of lines) {
        try {
          const obj = JSON.parse(line);

          if (this.containsLiquid(obj)) {
            console.log(
              `🔍 Tìm thấy dữ liệu chứa "liquid":`,
              JSON.stringify(obj, null, 2),
            );
            // TODO: Xử lý thêm hoặc emit sự kiện đi nơi khác nếu cần
          }
        } catch (e) {
          // Không parse được JSON, bỏ qua hoặc log tùy bạn
          // console.warn('Không parse được JSON:', line);
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
    }
  }

  // Hàm đệ quy kiểm tra key hoặc value có chứa "liquid" (không phân biệt hoa thường)
  private containsLiquid(data: any): boolean {
    if (typeof data === 'string') {
      return data.toLowerCase().includes('liquid');
    } else if (typeof data === 'object' && data !== null) {
      return Object.entries(data).some(([key, value]) => {
        return (
          key.toLowerCase().includes('liquid') || this.containsLiquid(value)
        );
      });
    }
    return false;
  }
}
