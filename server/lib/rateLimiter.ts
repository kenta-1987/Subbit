interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 3, windowMs = 60 * 60 * 1000) { // 1時間に3回
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry || now > entry.resetTime) {
      this.limits.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    entry.count++;
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry || Date.now() > entry.resetTime) {
      return this.maxRequests;
    }
    return Math.max(0, this.maxRequests - entry.count);
  }

  getResetTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    return entry?.resetTime || 0;
  }
}

// 動画処理用（1時間に10回まで）
export const videoProcessingLimiter = new RateLimiter(10, 60 * 60 * 1000);

// AI生成用（1時間に20回まで）
export const aiGenerationLimiter = new RateLimiter(20, 60 * 60 * 1000);

// 未登録ユーザー用（1日に5回まで）
export const guestUserLimiter = new RateLimiter(5, 24 * 60 * 60 * 1000); // 1日で5回

// ファイルサイズ制限
export const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // 5GBに制限

// 未登録ユーザーの動画時間制限（10分）
export const GUEST_VIDEO_DURATION_LIMIT = 600; // 秒

export function getClientIP(req: any): string {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

// 動画時間をチェックする関数
export async function checkVideoDuration(videoPath: string): Promise<number> {
  const { promisify } = await import('util');
  const { exec } = await import('child_process');
  const execAsync = promisify(exec);
  
  try {
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    return parseFloat(stdout.trim());
  } catch (error) {
    console.error('Failed to get video duration:', error);
    return 0;
  }
}