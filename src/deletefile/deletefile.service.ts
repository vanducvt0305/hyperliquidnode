import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DeletefileService {
  private readonly targetDir = '/root/hl/data/replica_cmds';
  private readonly maxAgeMs = 60 * 60 * 1000; // 1 giờ

  constructor() {
    this.startCleanup();
  }

  private startCleanup() {
    this.cleanup(); // chạy ngay khi khởi động
    setInterval(() => this.cleanup(), 60 * 60 * 1000); // chạy mỗi 1 giờ
  }

  private async cleanup() {
    try {
      await this.removeOldFilesAndDirs(this.targetDir);
    } catch (err) {
      console.error('❌ Cleanup error:', err);
    }
  }

  private async removeOldFilesAndDirs(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const now = Date.now();

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      try {
        const stats = await fs.stat(fullPath);
        const age = now - stats.ctimeMs;

        if (entry.isDirectory()) {
          // đệ quy vào thư mục con
          await this.removeOldFilesAndDirs(fullPath);
          // kiểm tra lại nếu thư mục rỗng và quá cũ thì xoá
          const subEntries = await fs.readdir(fullPath);
          if (subEntries.length === 0 && age > this.maxAgeMs) {
            await fs.rmdir(fullPath);
            console.log(`📁 Đã xoá thư mục: ${fullPath}`);
          }
        } else if (entry.isFile() && age > this.maxAgeMs) {
          await fs.unlink(fullPath);
          console.log(`🗑️ Đã xoá file: ${fullPath}`);
        }
      } catch (err) {
        console.warn(`⚠️ Lỗi khi xử lý ${fullPath}:`, err.message);
      }
    }
  }
}
