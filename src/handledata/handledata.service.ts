import { Injectable, OnModuleInit } from '@nestjs/common';
import * as chokidar from 'chokidar';

@Injectable()
export class HandledataService implements OnModuleInit {
  private watcher: chokidar.FSWatcher;

  onModuleInit() {
    this.watcher = chokidar.watch('/root/hl/data/replica_cmds', {
      persistent: true,
      ignoreInitial: true, // Không xử lý file có sẵn
      awaitWriteFinish: {
        stabilityThreshold: 100, // giảm thấp để phản ứng nhanh hơn
        pollInterval: 50,
      },
      depth: undefined, // theo dõi đệ quy không giới hạn
    });

    this.watcher.on('change', (filePath: string) => {
      console.log(`🟡 File Changed: ${filePath}`);

      // TODO: Đẩy sang pipeline xử lý tiếp
      // Ví dụ: Gửi path vào queue, stream xử lý, hoặc xử lý theo tail

      // Giả sử gọi hàm xử lý stream ở đây
    });
  }
}
