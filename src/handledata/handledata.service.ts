import { Injectable, OnModuleInit } from '@nestjs/common';
import * as chokidar from 'chokidar';
import * as TailStream from 'tail-stream';
import * as fs from 'fs';
import { WsGatewayService } from 'src/wsgateway/wsgateway.service';

@Injectable()
export class HandledataService implements OnModuleInit {
  constructor(private readonly wsGatewayService: WsGatewayService) {}
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
          // console.log('📥 JSON nhận được:', json);
          // console.log(json.abci_block.signed_action_bundles);
          this.wsGatewayService.broadcastBlock(json);
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
