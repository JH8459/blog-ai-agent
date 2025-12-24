import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';

interface HealthResponse {
  ok: boolean;
  name: string;
  version: string;
}

@Injectable()
export class HealthService {
  private readonly version = this.readVersion();

  getHealth(): HealthResponse {
    return {
      ok: true,
      name: 'agent-server',
      version: this.version
    };
  }

  private readVersion(): string {
    if (process.env.npm_package_version) {
      return process.env.npm_package_version;
    }

    try {
      const packagePath = join(process.cwd(), 'package.json');
      const raw = readFileSync(packagePath, 'utf8');
      const parsed = JSON.parse(raw) as { version?: string };
      return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
    } catch {
      return '0.0.0';
    }
  }
}
