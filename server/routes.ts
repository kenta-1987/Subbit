import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import fsSync from "fs";  // 通常のfsモジュールを追加
import crypto from 'crypto';
import { fileURLToPath } from "url";
import { dirname } from "path";
import { 
  insertVideoSchema, 
  insertCaptionSchema,
  updateCaptionSchema,
  insertUserSchema,
  registerUserSchema,
  verifyEmailSchema,
  ExportSettings
} from "@shared/schema";
import { transcribeVideo } from "./lib/whisper";
import Stripe from "stripe";
import { STRIPE_PRICE_IDS } from "@shared/stripe-config";
import { exportVideoWithCaptions } from "./lib/ffmpeg";


import { generateCaptions, generateVideoDescription } from "./lib/openai";
import { generateFallbackCaptions } from "./lib/fallbackCaptions";
import { videoProcessingLimiter, aiGenerationLimiter, MAX_FILE_SIZE, getClientIP, guestUserLimiter, GUEST_VIDEO_DURATION_LIMIT, checkVideoDuration } from "./lib/rateLimiter";

// multerの型拡張
declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
    }
  }
}

// Create upload directories if they don't exist
const uploadsDir = "uploads";
const processedDir = "processed";

async function ensureDirsExist() {
  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(processedDir, { recursive: true });
    await fs.mkdir("temp", { recursive: true });
    console.log("Upload directories created successfully");
  } catch (error) {
    console.error("Failed to create upload directories:", error);
  }
}

// ファイルアップロード設定（5GBまで対応）
const upload = multer({
  dest: 'uploads/', // アプリケーションルートディレクトリ内のuploadsフォルダに保存
  limits: {
    fileSize: MAX_FILE_SIZE, // 5GBまで
  }
});

// チャンクアップロード用のストレージ（ファイルベース）
const uploadSessions = new Map<string, {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  mimeType: string;
  tempDir: string;
  uploadedChunks: Set<number>;
}>();

// Simple hash function for passwords (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Initialize Stripe  
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}
const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints
  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = insertUserSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: "入力データが無効です",
          errors: result.error.errors 
        });
      }

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(result.data.username);
      if (existingUser) {
        return res.status(400).json({ message: "このユーザー名は既に使用されています" });
      }

      // Hash password and create user
      const hashedPassword = hashPassword(result.data.password);
      const user = await storage.createUser({
        ...result.data,
        password: hashedPassword,
      });

      // Don't send password in response
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({ 
        message: "アカウントが作成されました",
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "アカウント作成に失敗しました" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "ユーザー名とパスワードを入力してください" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: "ユーザー名またはパスワードが間違っています" });
      }

      const hashedPassword = hashPassword(password);
      if (user.password !== hashedPassword) {
        return res.status(401).json({ message: "ユーザー名またはパスワードが間違っています" });
      }

      // Don't send password in response
      const { password: _, ...userWithoutPassword } = user;
      
      res.json({ 
        message: "ログインしました",
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "ログインに失敗しました" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    res.json({ message: "ログアウトしました" });
  });

  app.get("/api/logout", (req, res) => {
    res.redirect("/");
  });

  // Get current user info (for useAuth hook)
  app.get("/api/auth/user", async (req, res) => {
    // For development, return a default user for testing
    const defaultUser = {
      id: 1,
      username: "testuser",
      email: "test@example.com",
      emailVerified: true,
      plan: "pro",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: "active",
      currentPeriodEnd: null,
      monthlyUploads: 5,
      lastUploadReset: new Date(),
      createdAt: new Date(),
    };
    
    res.json(defaultUser);
  });

  // Stripe subscription creation route
  app.post("/api/create-subscription", async (req, res) => {
    try {
      const { planType } = req.body;
      
      if (!planType || !STRIPE_PRICE_IDS[planType as keyof typeof STRIPE_PRICE_IDS]) {
        return res.status(400).json({ message: "無効なプランが指定されました" });
      }

      const priceId = STRIPE_PRICE_IDS[planType as keyof typeof STRIPE_PRICE_IDS];
      
      // Create a customer (in production, you'd get this from the authenticated user)
      const customer = await stripeClient.customers.create({
        email: "test@example.com",
        name: "Test User",
      });

      // Create subscription with proper error handling for restricted accounts
      const subscription = await stripeClient.subscriptions.create({
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        trial_period_days: 0, // No trial for testing
      });

      const invoice = subscription.latest_invoice as any;
      const clientSecret = invoice?.payment_intent?.client_secret;
      
      if (!clientSecret) {
        throw new Error("決済インテントの作成に失敗しました");
      }

      res.json({
        subscriptionId: subscription.id,
        clientSecret: clientSecret,
      });
    } catch (error: any) {
      console.error("Subscription creation error:", error);
      
      // Handle specific Stripe errors
      if (error.type === 'StripeAuthenticationError') {
        return res.status(401).json({ 
          message: "Stripe認証エラー: APIキーを確認してください" 
        });
      }
      
      if (error.type === 'StripePermissionError') {
        return res.status(403).json({ 
          message: "Stripeアカウントが制限されています。アカウントを有効化してください" 
        });
      }
      
      res.status(500).json({ 
        message: "サブスクリプションの作成に失敗しました: " + error.message 
      });
    }
  });

  // Ensure upload and processed directories exist
  await ensureDirsExist();

  // チャンクアップロード初期化（レート制限付き）
  app.post("/api/videos/upload/init", async (req: Request, res: Response) => {
    try {
      const clientIP = getClientIP(req);
      
      // レート制限チェック（テスト環境では無効化）
      const isDevelopment = process.env.NODE_ENV === 'development';
      if (!isDevelopment && !videoProcessingLimiter.isAllowed(clientIP)) {
        const resetTime = videoProcessingLimiter.getResetTime(clientIP);
        const waitMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60));
        return res.status(429).json({ 
          error: `アップロード制限に達しました。${waitMinutes}分後に再試行してください。`,
          resetTime 
        });
      }

      const { fileName, fileSize, totalChunks, mimeType } = req.body;
      
      // ファイルサイズチェック
      if (fileSize > MAX_FILE_SIZE) {
        return res.status(413).json({ 
          error: `ファイルサイズが制限を超えています。最大${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MBまでです。` 
        });
      }

      // ストレージ容量チェック（認証済みユーザーのみ）
      if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
        try {
          const userId = (req as any).user.claims.sub;
          const user = await storage.getUser(userId);
          
          if (user) {
            const { PLAN_CONFIGS } = await import("@shared/schema");
            const planConfig = PLAN_CONFIGS[user.plan as keyof typeof PLAN_CONFIGS];
            const currentUsage = user.storageUsed || 0;
            
            if (currentUsage + fileSize > planConfig.storageLimit) {
              const usedGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2);
              const limitGB = (planConfig.storageLimit / (1024 * 1024 * 1024)).toFixed(2);
              const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);
              
              return res.status(413).json({ 
                error: `ストレージ容量が不足しています。現在の使用量: ${usedGB}GB / ${limitGB}GB。アップロードファイル: ${fileSizeMB}MB。プランをアップグレードしてください。`
              });
            }
          }
        } catch (error) {
          console.log("Storage check error:", error);
          // エラーが発生してもアップロードは続行
        }
      }
      
      const uploadId = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 一時ディレクトリを作成
      const tempDir = path.join(uploadsDir, `temp_${uploadId}`);
      await fs.mkdir(tempDir, { recursive: true });

      uploadSessions.set(uploadId, {
        fileName,
        fileSize,
        totalChunks,
        mimeType,
        tempDir,
        uploadedChunks: new Set()
      });

      console.log(`チャンクアップロード初期化: ${uploadId}, ファイル: ${fileName}, サイズ: ${fileSize}, チャンク数: ${totalChunks}`);
      
      res.json({ uploadId });
    } catch (error) {
      console.error("チャンクアップロード初期化エラー:", error);
      res.status(500).json({ error: "アップロード初期化に失敗しました" });
    }
  });

  // チャンクアップロード
  app.post("/api/videos/upload/chunk", upload.single("chunk"), async (req: Request, res: Response) => {
    try {
      const { uploadId, chunkIndex, totalChunks } = req.body;
      const chunkIdx = parseInt(chunkIndex);
      
      console.log(`🚀 サーバー側: チャンク受信開始 - uploadId: ${uploadId}, index: ${chunkIdx}`);
      
      if (!req.file) {
        console.log("❌ サーバー側: チャンクファイルなし");
        return res.status(400).json({ error: "チャンクファイルがありません" });
      }

      console.log(`🚀 サーバー側: チャンクサイズ ${req.file.size} bytes`);

      const session = uploadSessions.get(uploadId);
      if (!session) {
        return res.status(404).json({ error: "アップロードセッションが見つかりません" });
      }

      // チャンクファイルを一時ディレクトリに保存
      const chunkPath = path.join(session.tempDir, `chunk_${chunkIdx}`);
      await fs.rename(req.file.path, chunkPath);
      session.uploadedChunks.add(chunkIdx);

      console.log(`チャンク受信: ${uploadId}, インデックス: ${chunkIdx}, 進捗: ${session.uploadedChunks.size}/${session.totalChunks}`);
      
      res.json({ 
        success: true, 
        uploaded: session.uploadedChunks.size,
        total: session.totalChunks 
      });
    } catch (error) {
      console.error("チャンクアップロードエラー:", error);
      res.status(500).json({ error: "チャンクアップロードに失敗しました" });
    }
  });

  // チャンクアップロード完了
  app.post("/api/videos/upload/finalize", async (req: Request, res: Response) => {
    try {
      const { uploadId } = req.body;
      
      const session = uploadSessions.get(uploadId);
      if (!session) {
        return res.status(404).json({ error: "アップロードセッションが見つかりません" });
      }

      // すべてのチャンクが受信されているか確認
      console.log(`チャンク完了チェック: 受信済み ${session.uploadedChunks.size}/${session.totalChunks}`);
      console.log(`受信済みチャンクインデックス:`, Array.from(session.uploadedChunks).sort((a, b) => a - b));
      
      if (session.uploadedChunks.size !== session.totalChunks) {
        const missingChunks = [];
        for (let i = 0; i < session.totalChunks; i++) {
          if (!session.uploadedChunks.has(i)) {
            missingChunks.push(i);
          }
        }
        console.log(`不足チャンク:`, missingChunks);
        return res.status(400).json({ 
          error: "一部のチャンクが不足しています",
          received: session.uploadedChunks.size,
          total: session.totalChunks,
          missing: missingChunks
        });
      }

      // チャンクファイルを結合して最終ファイルを作成
      const finalPath = path.join(uploadsDir, `${uploadId}_${session.fileName}`);
      
      // ストリーミングで結合してメモリ使用量を抑制
      await new Promise<void>((resolve, reject) => {
        const writeStream = fsSync.createWriteStream(finalPath);
        let currentChunk = 0;
        
        const writeNextChunk = async () => {
          if (currentChunk >= session.totalChunks) {
            writeStream.end();
            resolve();
            return;
          }
          
          const chunkPath = path.join(session.tempDir, `chunk_${currentChunk}`);
          const readStream = fsSync.createReadStream(chunkPath);
          
          readStream.on('data', (chunk) => {
            writeStream.write(chunk);
          });
          
          readStream.on('end', () => {
            currentChunk++;
            writeNextChunk();
          });
          
          readStream.on('error', reject);
        };
        
        writeStream.on('error', reject);
        writeNextChunk();
      });
      
      // 一時ディレクトリを削除
      await fs.rm(session.tempDir, { recursive: true, force: true });

      // 未登録ユーザーの制限チェック
      const clientIP = getClientIP(req);
      const isAuthenticated = false; // デモ版では常にゲストユーザーとして扱う
      
      if (!isAuthenticated) {
        // 動画時間をチェック
        const duration = await checkVideoDuration(finalPath);
        if (duration > GUEST_VIDEO_DURATION_LIMIT) {
          // ファイルを削除
          await fs.unlink(finalPath).catch(console.error);
          return res.status(403).json({ 
            error: `体験版では3分以内の動画のみ利用可能です。現在の動画: ${Math.round(duration)}秒`,
            isTrialLimit: true,
            actualDuration: Math.round(duration),
            maxDuration: GUEST_VIDEO_DURATION_LIMIT
          });
        }
        
        // 利用回数をチェック
        if (!guestUserLimiter.isAllowed(clientIP)) {
          // ファイルを削除
          await fs.unlink(finalPath).catch(console.error);
          return res.status(403).json({ 
            error: "体験版の利用回数に達しました。アカウント登録で制限を解除できます。",
            isTrialLimit: true,
            needsRegistration: true
          });
        }
      }

      // データベースに動画情報を保存
      console.log('動画をデータベースに保存中...');
      const video = await storage.createVideo({
        filename: session.fileName,
        originalPath: finalPath,
        fileSize: session.fileSize,
        status: "uploaded"
      });
      
      console.log('保存後の動画確認:', video);
      
      // 認証済みユーザーのストレージ使用量を更新
      if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
        try {
          const userId = (req as any).user.claims.sub;
          await storage.updateUserStorageUsage(userId, session.fileSize);
          console.log(`ストレージ使用量を更新: ユーザーID ${userId}, 追加容量 ${session.fileSize} bytes`);
        } catch (error) {
          console.log("ストレージ使用量の更新エラー:", error);
        }
      }
      
      // 保存されたかテスト
      const savedVideo = await storage.getVideo(video.id);
      console.log('データベースから取得した動画:', savedVideo);

      // セッションをクリーンアップ
      uploadSessions.delete(uploadId);

      console.log(`ファイル結合完了: ${session.fileName}, 動画ID: ${video.id}`);
      
      res.json({ 
        success: true, 
        videoId: video.id,
        message: "アップロードが完了しました" 
      });

      // MP4変換が必要かチェック
      const fileExtension = path.extname(session.fileName).toLowerCase();
      if (fileExtension === '.mov') {
        console.log('MOVファイルをMP4に変換を開始...');
        const { convertToMp4 } = await import('./lib/ffmpeg');
        convertToMp4(finalPath).catch(err => {
          console.error('MP4変換エラー:', err);
        });
      }

      // バックグラウンド処理を開始
      console.log(`Starting background processing for video ${video.id}`);
      processVideo(video.id).catch(err => {
        console.error(`Error processing video ${video.id}:`, err);
        storage.updateVideoError(video.id, err instanceof Error ? err.message : "Unknown processing error")
          .catch(updateErr => {
            console.error(`Failed to update error status for video ${video.id}:`, updateErr);
          });
      });
    } catch (error) {
      console.error("ファイル結合エラー:", error);
      res.status(500).json({ error: "ファイル結合に失敗しました" });
    }
  });
  
  // 改良された動画アップロードエンドポイント
  app.post("/api/videos/upload", (req: Request, res: Response, next: any) => {
    upload.single("video")(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: "ファイルサイズが大きすぎます。10GB以下のファイルをアップロードしてください。" });
        }
        return res.status(400).json({ error: `アップロードエラー: ${err.message}` });
      }
      next();
    });
  }, async (req: Request, res: Response) => {
    try {
      console.log("Upload request received");
      
      // リクエスト本体をログに出力
      console.log("Request body:", req.body);
      
      // req.fileが存在するか確認
      if (!req.file) {
        console.log("No file in request");
        return res.status(400).json({ error: "ファイルがアップロードされていません" });
      }
      
      const { originalname, path: filePath, size, mimetype } = req.file;
      console.log(`File uploaded: ${originalname}, size: ${size} bytes, type: ${mimetype}, path: ${filePath}`);
      
      // ファイルが実際に存在するか確認
      try {
        await fs.access(filePath);
        console.log(`Confirmed file exists at: ${filePath}`);
      } catch (accessError) {
        console.error(`File existence check failed: ${accessError instanceof Error ? accessError.message : 'Unknown error'}`);
        return res.status(500).json({ error: "アップロードされたファイルにアクセスできません" });
      }
      
      // データベースに動画情報を保存
      const video = await storage.createVideo({
        filename: originalname,
        originalPath: filePath,
        fileSize: size
      });
      
      console.log("Video record created in database:", video);
      
      // 成功レスポンスを返す
      res.status(201).json(video);
      
      // 非同期でバックグラウンド処理を開始（エラーハンドリング付き）
      console.log(`Starting background processing for video ${video.id}`);
      processVideo(video.id).catch(err => {
        console.error(`Error processing video ${video.id}:`, err);
        storage.updateVideoError(video.id, err instanceof Error ? err.message : "Unknown processing error")
          .catch(updateErr => {
            console.error(`Failed to update error status for video ${video.id}:`, updateErr);
          });
      });
    } catch (error) {
      console.error("Error in upload handler:", error);
      
      // Multerのファイルサイズエラーを特別に処理
      if (error instanceof Error && error.name === 'MulterError' && error.message === 'File too large') {
        return res.status(413).json({ 
          error: "ファイルサイズが大きすぎます", 
          details: "アップロードできるファイルサイズは50MB以下です" 
        });
      }
      
      res.status(500).json({ 
        error: "ファイルアップロードに失敗しました", 
        details: error instanceof Error ? error.message : "不明なエラー" 
      });
    }
  });
  
  // Get video details
  app.get("/api/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      res.json(video);
    } catch (error) {
      console.error("Error fetching video:", error);
      res.status(500).json({ error: "Failed to fetch video" });
    }
  });

  // Stream video file
  app.get("/api/videos/:id/stream", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`ストリーミングリクエスト: ビデオID=${id}`);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      let videoPath = video.originalPath;
      console.log(`ストリーミングリクエスト: ビデオID=${id}, ファイルパス=${videoPath}`);
      
      // Check if we need to convert the video for better browser compatibility
      const fileExtension = path.extname(videoPath).toLowerCase();
      let contentType = 'video/mp4';
      
      if (fileExtension === '.mov') {
        // For .mov files, convert to MP4 for better browser compatibility
        const convertedPath = videoPath.replace('.mov', '_converted.mp4');
        
        try {
          await fs.access(convertedPath);
          console.log(`変換済みMP4ファイルを使用: ${convertedPath}`);
          videoPath = convertedPath;
          contentType = 'video/mp4';
        } catch (error) {
          console.log(`MP4変換ファイルが見つかりません。変換を開始します: ${videoPath}`);
          
          // Start conversion if not already converted
          try {
            const { convertToMp4 } = await import('./lib/ffmpeg');
            console.log('MP4変換を開始中...');
            const converted = await convertToMp4(videoPath);
            videoPath = converted;
            contentType = 'video/mp4';
            console.log(`MP4変換完了: ${converted}`);
          } catch (conversionError) {
            console.error('MP4変換に失敗:', conversionError);
            return res.status(500).json({ 
              error: "動画の変換に失敗しました。しばらく待ってから再度お試しください。" 
            });
          }
        }
      } else {
        switch (fileExtension) {
          case '.mp4':
            contentType = 'video/mp4';
            break;
          case '.avi':
            contentType = 'video/x-msvideo';
            break;
          case '.mkv':
            contentType = 'video/x-matroska';
            break;
          default:
            contentType = 'video/mp4';
        }
      }
      
      console.log(`使用ファイル: ${videoPath}, コンテンツタイプ: ${contentType}`);
      
      // Check if file exists
      try {
        await fs.access(videoPath);
        console.log(`動画ファイルが見つかりました: ${videoPath}`);
      } catch (error) {
        console.error(`動画ファイルが見つかりません: ${videoPath}`);
        return res.status(404).json({ error: "Video file not found" });
      }
      
      // Get file stats
      const stat = await fs.stat(videoPath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // Set CORS headers for video streaming
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');
      res.setHeader('Cache-Control', 'no-cache');

      if (range) {
        // Parse range header
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const stream = fsSync.createReadStream(videoPath, { start, end });
        
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        });
        
        stream.pipe(res);
      } else {
        // No range header, send entire file
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
        });
        
        const stream = fsSync.createReadStream(videoPath);
        stream.pipe(res);
      }
    } catch (error) {
      console.error("Video streaming error:", error);
      res.status(500).json({ error: "Failed to stream video" });
    }
  });

  // Manual MP4 conversion endpoint
  app.post("/api/videos/:id/convert-mp4", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      const inputPath = video.originalPath;
      const fileExtension = path.extname(inputPath).toLowerCase();
      
      if (fileExtension !== '.mov') {
        return res.json({ message: "Video is already in compatible format" });
      }
      
      console.log(`手動MP4変換開始: ${inputPath}`);
      const { convertToMp4 } = await import('./lib/ffmpeg');
      
      // Start conversion in background
      convertToMp4(inputPath)
        .then((convertedPath) => {
          console.log(`手動MP4変換完了: ${convertedPath}`);
        })
        .catch((err) => {
          console.error(`手動MP4変換エラー: ${err}`);
        });
      
      res.json({ message: "MP4変換を開始しました" });
    } catch (error) {
      console.error("MP4変換リクエストエラー:", error);
      res.status(500).json({ error: "MP4変換リクエストに失敗しました" });
    }
  });
  
  // Get video processing status - 改善版
  app.get("/api/videos/:id/status", async (req, res) => {
    try {
      console.log(`動画処理状況リクエスト - ID: ${req.params.id}`);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "無効な動画IDです" });
      }
      
      const video = await storage.getVideo(id);
      if (!video) {
        console.log(`動画ID: ${id} はデータベースに存在しません`);
        // 開発中は404エラーではなく、サンプルのステータス情報を返す
        return res.json({
          id: id,
          filename: "sample_video.mp4",
          status: "uploading",
          progress: 10,
          currentStep: "uploading",
          error: null
        });
      }
      
      console.log(`ステータス情報取得成功 - 動画ID: ${id}, ステータス: ${video.status}`);
      
      // Calculate progress based on status
      let progress = 0;
      let currentStep = "uploading";
      
      switch (video.status) {
        case "uploaded":
          progress = 10;
          currentStep = "uploading";
          break;
        case "transcribing":
          progress = 30;
          currentStep = "transcribing";
          break;
        case "generating":
          progress = 70;
          currentStep = "generating";
          break;
        case "completed":
          progress = 100;
          currentStep = "completed";
          break;
        case "failed":
          progress = 0;
          currentStep = "failed";
          break;
        default:
          progress = 5;
          currentStep = "preparing";
          break;
      }
      
      const response = {
        id: video.id,
        filename: video.filename,
        status: video.status,
        progress,
        currentStep,
        error: video.error
      };
      
      res.json(response);
    } catch (error) {
      console.error("動画処理状況取得エラー:", error);
      // フォールバックレスポンスを返す（クライアント側で処理を継続できるように）
      res.status(200).json({ 
        id: parseInt(req.params.id),
        filename: "処理中のファイル",
        status: "unknown",
        progress: 5,
        currentStep: "uploading",
        error: error instanceof Error ? error.message : "不明なエラー"
      });
    }
  });
  
  // Get captions for a video
  app.get("/api/videos/:id/captions", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }
      
      const captions = await storage.getCaptionsByVideoId(id);
      res.json(captions);
    } catch (error) {
      console.error("Error fetching captions:", error);
      res.status(500).json({ error: "Failed to fetch captions" });
    }
  });
  
  // 字幕翻訳機能
  app.post("/api/videos/:id/translate-captions", async (req, res) => {
    try {
      const clientIP = getClientIP(req);
      
      // AI生成レート制限チェック
      if (!aiGenerationLimiter.isAllowed(clientIP)) {
        const resetTime = aiGenerationLimiter.getResetTime(clientIP);
        const waitMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60));
        return res.status(429).json({ 
          error: `AI生成制限に達しました。${waitMinutes}分後に再試行してください。`,
          resetTime 
        });
      }

      const id = parseInt(req.params.id);
      const { targetLanguage } = req.body;

      if (isNaN(id)) {
        return res.status(400).json({ error: "無効な動画IDです" });
      }

      if (!targetLanguage) {
        return res.status(400).json({ error: "翻訳先言語を指定してください" });
      }

      // 動画の存在確認
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "動画が見つかりません" });
      }

      // 既存の字幕を取得
      const existingCaptions = await storage.getCaptionsByVideoId(id);
      if (existingCaptions.length === 0) {
        return res.status(400).json({ error: "翻訳する字幕がありません。まず字幕を生成してください。" });
      }

      console.log(`🌐 字幕翻訳開始 - 動画: ${video.filename}, 言語: ${targetLanguage}`);
      console.log(`📝 翻訳対象字幕数: ${existingCaptions.length}`);

      // AI生成制限を適用（レート制限チェックは既に上で実行済み）

      // OpenAI APIで翻訳
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const languageNames = {
        'ja': '日本語（校正・修正）',
        'en': '英語',
        'zh': '中国語（簡体字）',
        'zh-TW': '中国語（繁体字）',
        'ko': '韓国語',
        'es': 'スペイン語',
        'fr': 'フランス語',
        'de': 'ドイツ語',
        'pt': 'ポルトガル語',
        'ru': 'ロシア語',
        'ar': 'アラビア語',
        'hi': 'ヒンディー語',
        'th': 'タイ語',
        'vi': 'ベトナム語'
      };

      const targetLanguageName = languageNames[targetLanguage as keyof typeof languageNames] || targetLanguage;

      // 字幕テキストを結合
      const captionTexts = existingCaptions.map(cap => cap.text).join('\n');

      const translationPrompt = targetLanguage === 'ja' 
        ? `以下の日本語字幕テキストを校正・修正してください。
音声認識で生成されたテキストのため、以下の点を改善してください：
- 固有名詞（人名、地名、会社名など）の正しい表記
- 漢字変換の間違いを修正
- 自然な日本語表現に調整
- 句読点の適切な配置
- 一般的でない表記を標準的な表記に修正

各行を別々に修正し、元の行数と同じ行数で返してください。

元の字幕:
${captionTexts}

修正結果（各行を改行で区切って返してください）:`
        : `以下の日本語字幕を${targetLanguageName}に翻訳してください。
各行を別々に翻訳し、元の行数と同じ行数で返してください。
自然で読みやすい翻訳を心がけてください。

元の字幕:
${captionTexts}

翻訳結果（各行を改行で区切って返してください）:`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: targetLanguage === 'ja' 
              ? "あなたは優秀な校正者です。音声認識で生成された日本語テキストの固有名詞や表記間違いを修正し、自然な日本語に校正してください。"
              : "あなたは優秀な翻訳者です。動画字幕の翻訳を正確かつ自然に行ってください。"
          },
          {
            role: "user",
            content: translationPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const translatedText = response.choices[0].message.content || '';
      const translatedLines = translatedText.split('\n').filter(line => line.trim());

      // 翻訳された字幕で既存の字幕を更新
      const updatedCaptions = [];
      for (let i = 0; i < existingCaptions.length && i < translatedLines.length; i++) {
        const caption = existingCaptions[i];
        const updatedCaption = await storage.updateCaption(caption.id, {
          text: translatedLines[i].trim()
        });
        updatedCaptions.push(updatedCaption);
      }

      console.log(`✅ 字幕翻訳完了 - ${updatedCaptions.length}件の字幕を更新`);

      res.json({
        message: `字幕を${targetLanguageName}に翻訳しました`,
        captions: updatedCaptions,
        translatedCount: updatedCaptions.length
      });

    } catch (error) {
      console.error("字幕翻訳エラー:", error);
      res.status(500).json({ 
        error: "字幕の翻訳に失敗しました",
        details: error instanceof Error ? error.message : "不明なエラー"
      });
    }
  });

  // Stripe決済エンドポイント
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount, currency = "jpy" } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "有効な金額を指定してください" });
      }

      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: Math.round(amount), // 円の場合は整数
        currency: currency,
        metadata: {
          service: "Subbit",
          description: "動画字幕生成サービス"
        }
      });

      res.json({ 
        clientSecret: paymentIntent.client_secret,
        amount: amount,
        currency: currency
      });
    } catch (error: any) {
      console.error("Stripe PaymentIntent作成エラー:", error);
      res.status(500).json({ 
        error: "決済の準備に失敗しました",
        details: error.message 
      });
    }
  });

  // サブスクリプション決済エンドポイント
  app.post("/api/create-subscription", async (req, res) => {
    try {
      const { priceId, customerId } = req.body;
      
      if (!priceId) {
        return res.status(400).json({ error: "価格IDが必要です" });
      }

      let customer;
      if (customerId) {
        customer = await stripeClient.customers.retrieve(customerId);
      } else {
        // 新規顧客の場合はここで顧客情報を作成
        customer = await stripeClient.customers.create({
          metadata: {
            service: "Subbit"
          }
        });
      }

      const subscription = await stripeClient.subscriptions.create({
        customer: customer.id,
        items: [{
          price: priceId,
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      const latestInvoice = subscription.latest_invoice as any;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: latestInvoice?.payment_intent?.client_secret,
        customerId: customer.id
      });
    } catch (error: any) {
      console.error("Stripe Subscription作成エラー:", error);
      res.status(500).json({ 
        error: "サブスクリプションの作成に失敗しました",
        details: error.message 
      });
    }
  });

  // ゲスト用決済作成エンドポイント（ログイン不要）
  app.post("/api/create-payment-intent-guest", async (req, res) => {
    try {
      const { amount, currency = 'jpy', planType } = req.body;
      
      if (!amount || !planType) {
        return res.status(400).json({ error: "金額とプランタイプが必要です" });
      }
      
      // ゲストユーザー用の決済Intent作成
      const paymentIntent = await stripeClient.paymentIntents.create({
        amount: Math.round(amount * 100), // 円→銭に変換
        currency: currency,
        metadata: {
          planType: planType,
          guestPayment: 'true',
          service: 'Subbit'
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });
      
      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });
    } catch (error: any) {
      console.error("ゲスト決済作成エラー:", error);
      res.status(500).json({ 
        error: "決済の準備に失敗しました",
        details: error.message 
      });
    }
  });

  // 決済状況確認エンドポイント
  app.get("/api/payment-status/:paymentIntentId", async (req, res) => {
    try {
      const { paymentIntentId } = req.params;
      
      const paymentIntent = await stripeClient.paymentIntents.retrieve(paymentIntentId);
      
      res.json({
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata
      });
    } catch (error: any) {
      console.error("決済状況確認エラー:", error);
      res.status(500).json({ 
        error: "決済状況の確認に失敗しました",
        details: error.message 
      });
    }
  });

  // テスト用動画作成エンドポイント（開発用）
  app.post("/api/test/create-video", async (req, res) => {
    try {
      const testVideo = await storage.createVideo({
        filename: "test.mov",
        originalPath: "/tmp/test.mov",
        fileSize: 1000,
        status: "uploaded"
      });
      
      res.json({ 
        message: "テスト動画を作成しました",
        video: testVideo 
      });
    } catch (error) {
      console.error("テスト動画作成エラー:", error);
      res.status(500).json({ error: "テスト動画の作成に失敗しました" });
    }
  });

  // 音声認識によるテロップ自動生成（Whisper API）- レート制限付き
  app.post("/api/videos/:id/generate-captions", async (req, res) => {
    try {
      const clientIP = getClientIP(req);
      
      // AI生成レート制限チェック
      if (!aiGenerationLimiter.isAllowed(clientIP)) {
        const resetTime = aiGenerationLimiter.getResetTime(clientIP);
        const waitMinutes = Math.ceil((resetTime - Date.now()) / (1000 * 60));
        return res.status(429).json({ 
          error: `AI生成制限に達しました。${waitMinutes}分後に再試行してください。`,
          resetTime 
        });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "無効な動画IDです" });
      }
      
      // 動画情報を取得
      const video = await storage.getVideo(id);
      if (!video) {
        console.log(`動画ID: ${id} が見つかりません`);
        return res.status(404).json({ error: "動画が見つかりません" });
      }
      
      console.log("🎵 音声認識システム開始 - 動画:", video.filename);
      console.log("🎵 ファイルパス:", video.originalPath);
      
      // ファイルの存在確認
      if (!fsSync.existsSync(video.originalPath)) {
        console.error(`動画ファイルが存在しません: ${video.originalPath}`);
        return res.status(404).json({ error: "動画ファイルが見つかりません" });
      }
      
      // 既存のキャプションを完全に削除
      const existingCaptions = await storage.getCaptionsByVideoId(id);
      console.log(`削除対象のキャプション数: ${existingCaptions.length}`);
      for (const caption of existingCaptions) {
        console.log(`削除中: ID=${caption.id}, タイミング=${caption.startTime}-${caption.endTime}`);
        await storage.deleteCaption(caption.id);
      }

      // 🎵 Whisper API音声認識システム（最優先実行）
      let generatedCaptions = [];
      console.log("🎵🎵🎵 音声認識システム開始 🎵🎵🎵");
      console.log("🎵 動画ファイル:", video.originalPath);
      
      try {
        // Whisper APIで音声を文字起こし（話者検出機能付き）
        const { transcribeVideo } = await import('./lib/whisper.js');
        console.log("🎵 音声抽出と文字起こしを開始...");
        
        // リクエストボディから話者検出設定を取得
        const { enableSpeakerDetection = false, language = 'ja' } = req.body;
        console.log("🎤🎤🎤 話者検出設定受信:", { enableSpeakerDetection, language });
        console.log("🎤🎤🎤 リクエストボディ全体:", req.body);
        console.log("🎤🎤🎤 話者検出は有効:", enableSpeakerDetection === true);
        
        const transcriptionResult = await transcribeVideo(video.originalPath, {
          enableSpeakerDetection,
          language
        });
        console.log("🎵 音声認識結果:", transcriptionResult);
        
        if (transcriptionResult.speakerDetection) {
          console.log("🎤 話者検出結果あり:", transcriptionResult.speakerDetection);
        } else {
          console.log("🎤 話者検出結果なし - enableSpeakerDetection:", enableSpeakerDetection);
        }
        
        if (transcriptionResult.segments && transcriptionResult.segments.length > 0) {
          console.log("🎵 認識された音声セグメント数:", transcriptionResult.segments.length);
          
          // Get user plan for styling defaults
          let userPlan = 'free';
          if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
            try {
              const userId = (req as any).user.claims.sub;
              const user = await storage.getUser(userId);
              if (user) {
                userPlan = user.plan || 'free';
              }
            } catch (error) {
              console.log("ユーザープラン取得エラー:", error);
            }
          }
          
          // Apply plan-specific styling
          const captionDefaults = userPlan === 'free' ? {
            fontSize: "medium",
            color: "#FFFFFF",
            hasBackground: false
          } : {
            fontSize: "small", 
            color: "#FFFFFF",
            hasBackground: true
          };
          
          // 音声認識結果をテロップ形式に変換（話者情報付き）
          if (transcriptionResult.speakerDetection && enableSpeakerDetection) {
            // 話者検出結果を使用
            const uniqueSpeakers = new Set(transcriptionResult.speakerDetection.map(s => s.speakerId));
            console.log(`🎤 話者検出結果: ${uniqueSpeakers.size}人の話者を検出`);
            
            generatedCaptions = transcriptionResult.speakerDetection.map((speakerSegment, index) => {
              const speakerName = `話者${speakerSegment.speakerId}`;
              
              // 話者ごとに色を変える（Tailwindカラーを使用）
              const speakerColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
              const speakerColor = speakerColors[speakerSegment.speakerId - 1] || '#3B82F6';
              
              return {
                id: index + 1,
                startTime: Math.round(speakerSegment.start * 1000),
                endTime: Math.round(speakerSegment.end * 1000),
                text: `${speakerName}： ${speakerSegment.text.trim()}`,
                font: "gothic",
                fontSize: captionDefaults.fontSize,
                color: speakerColor,
                hasBackground: captionDefaults.hasBackground,
                speakerId: speakerSegment.speakerId,
                speakerConfidence: speakerSegment.confidence
              };
            });
          } else {
            // 従来の音声認識結果を使用
            generatedCaptions = transcriptionResult.segments.map((segment, index) => ({
              id: index + 1,
              startTime: Math.round(segment.start * 1000), // 秒→ミリ秒
              endTime: Math.round(segment.end * 1000),
              text: segment.text.trim(),
              font: "gothic",
              fontSize: captionDefaults.fontSize,
              color: captionDefaults.color,
              hasBackground: captionDefaults.hasBackground
            }));
          }
          
          console.log("🎵✅ 音声認識完了:", generatedCaptions.length, "個のテロップ生成");
          generatedCaptions.forEach((cap, i) => {
            console.log(`🎵 [${i+1}] ${cap.startTime}ms-${cap.endTime}ms: "${cap.text}"`);
          });
        } else {
          console.log("🎵❌ 音声認識結果が空 - 音声が検出されませんでした");
          throw new Error("音声が検出されませんでした");
        }
      } catch (error: any) {
        console.log("🎵❌ 音声認識システムエラー:", error.message || String(error));
        console.log("🎵 エラー詳細:", error);
        
        // 音声認識失敗時は何も生成しない（古いシステムを使わない）
        console.log("🎵 音声認識に失敗したため、テロップは生成されません");
        return res.status(500).json({ 
          error: "音声認識に失敗しました", 
          details: error.message || String(error)
        });
      }
      
      // 新しいキャプションをデータベースに保存
      const savedCaptions = [];
      for (const caption of generatedCaptions) {
        const newCaption = await storage.createCaption({
          videoId: id,
          startTime: caption.startTime,
          endTime: caption.endTime,
          text: caption.text,
          font: caption.font || "gothic",
          fontSize: caption.fontSize || "small",
          color: caption.color || "#FFFFFF"
        });
        savedCaptions.push(newCaption);
      }
      
      res.json({
        message: "テロップが正常に生成されました",
        captions: savedCaptions
      });
    } catch (error) {
      console.error("テロップ生成エラー:", error);
      res.status(500).json({ error: "テロップの生成に失敗しました", details: error instanceof Error ? error.message : "不明なエラー" });
    }
  });

  // ChatGPTによるテロップリライト
  app.post("/api/captions/:id/rewrite", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "無効なキャプションIDです" });
      }

      const caption = await storage.getCaption(id);
      if (!caption) {
        return res.status(404).json({ error: "キャプションが見つかりません" });
      }

      console.log("🤖 ChatGPTリライト開始 - 元テロップ:", caption.text);

      // OpenAI APIでテロップをリライト
      const { generateCaptions } = await import('./lib/openai.js');
      
      // 既存のOpenAI設定を使用
      const OpenAI = (await import('openai')).default;
      const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      
      const prompt = `以下の音声認識テキストに明らかな誤字があれば修正してください。ただし、話し方は一切変更しないでください。

"${caption.text}"

制約:
- 単語のスペルミスや明らかな認識エラーのみ修正
- 話し方（「はい」「あの」「まあ」等）は削除禁止
- 文章の構造や順番は変更禁止
- 内容の意味は変更禁止
- 修正不要なら元のテキストをそのまま返す

例: 「m 4」→「M4」、「マックブック」→「MacBook」

修正版:`;

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o", // 最新のモデルを使用
        messages: [
          { 
            role: "system", 
            content: "あなたは音声認識テキストの誤字脱字修正専門です。話し方や内容は一切変更せず、明らかな技術的エラーのみを修正してください。" 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.0,
        max_tokens: 150
      });

      const rewrittenText = response.choices[0].message.content?.trim() || caption.text;
      console.log("🤖 ChatGPTリライト完了:", rewrittenText);

      // リライトされたテロップでキャプションを更新
      const updatedCaption = await storage.updateCaption(id, {
        text: rewrittenText
      });

      res.json({
        message: "テロップがリライトされました",
        caption: updatedCaption,
        originalText: caption.text,
        rewrittenText: rewrittenText
      });
    } catch (error: any) {
      console.error("テロップリライトエラー:", error);
      res.status(500).json({ 
        error: "テロップのリライトに失敗しました", 
        details: error.message || String(error)
      });
    }
  });

  // Speaker detection endpoint
  app.post("/api/videos/:id/detect-speakers", async (req, res) => {
    try {
      const videoId = parseInt(req.params.id);
      if (isNaN(videoId)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }

      const video = await storage.getVideo(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Get existing captions for this video
      const captions = await storage.getCaptionsByVideoId(videoId);
      if (captions.length === 0) {
        return res.status(400).json({ error: "No captions found for this video. Please generate captions first." });
      }

      console.log(`🎤 話者判別開始: 動画ID=${videoId}, キャプション数=${captions.length}`);

      // Simple speaker detection based on timing patterns
      // In a real implementation, this would use audio analysis
      const speakers: Array<{
        id: string;
        name: string;
        segments: Array<{
          captionId: number;
          startTime: number;
          endTime: number;
          text: string;
        }>;
      }> = [];
      const speakerCount = Math.min(3, Math.max(2, Math.ceil(captions.length / 5))); // 2-3 speakers typically

      for (let i = 0; i < speakerCount; i++) {
        speakers.push({
          id: `speaker_${i + 1}`,
          name: `話者${i + 1}`,
          segments: []
        });
      }

      // Assign captions to speakers based on simple alternating pattern
      captions.forEach((caption, index) => {
        const speakerIndex = index % speakerCount;
        speakers[speakerIndex].segments.push({
          captionId: caption.id,
          startTime: caption.startTime,
          endTime: caption.endTime,
          text: caption.text
        });
      });

      console.log(`🎤 話者判別完了: ${speakers.length}人の話者を検出`);
      
      res.json({
        message: "Speaker detection completed",
        speakers: speakers,
        speakerCount: speakers.length
      });

    } catch (error) {
      console.error("話者判別エラー:", error);
      res.status(500).json({ 
        error: "Speaker detection failed", 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Update a caption
  app.patch("/api/captions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`字幕更新リクエスト: ID=${id}, データ:`, req.body);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid caption ID" });
      }
      
      // デバッグ: 現在保存されている字幕を確認
      const allCaptions = await storage.getCaptionsByVideoId(req.body.videoId || 0);
      console.log(`保存済み字幕数: ${allCaptions.length}, 字幕IDs:`, allCaptions.map(c => c.id));
      
      // Validate request body
      let result = updateCaptionSchema.safeParse(req.body);
      if (!result.success) {
        console.log("字幕更新バリデーションエラー:", result.error);
        return res.status(400).json({ error: "Invalid data", details: result.error });
      }
      
      // Check if user is authenticated and get their plan
      let userPlan = 'free'; // Default to free plan for unauthenticated users
      if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
        try {
          const userId = (req as any).user.claims.sub;
          const user = await storage.getUser(userId);
          if (user) {
            userPlan = user.plan || 'free';
          }
        } catch (error) {
          console.log("ユーザープラン取得エラー:", error);
        }
      }
      
      // Enforce Free plan subtitle style restrictions (but allow speaker colors)
      if (userPlan === 'free') {
        console.log("Freeプランユーザー: 字幕スタイルを固定設定に変更");
        
        // Check if this is a speaker detection or valid color (preserve all valid hex colors)
        const isValidHexColor = result.data.color && 
                               result.data.color.startsWith('#') && 
                               result.data.color.length === 7 &&
                               /^#[0-9A-F]{6}$/i.test(result.data.color);
        
        console.log(`色チェック: ${result.data.color}, 有効な色: ${isValidHexColor}`);
        
        result.data = {
          ...result.data,
          fontSize: "medium",
          color: isValidHexColor ? result.data.color : "#FFFFFF", // Preserve valid hex colors
          hasBackground: false
        };
      }
      
      const caption = await storage.getCaption(id);
      if (!caption) {
        console.log(`字幕が見つかりません: ID=${id}`);
        return res.status(404).json({ error: "Caption not found" });
      }
      
      console.log(`字幕更新前:`, caption);
      const updatedCaption = await storage.updateCaption(id, result.data);
      console.log(`字幕更新後:`, updatedCaption);
      
      res.json(updatedCaption);
    } catch (error) {
      console.error("Error updating caption:", error);
      res.status(500).json({ error: "Failed to update caption" });
    }
  });
  
  // Delete a caption
  app.delete("/api/captions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid caption ID" });
      }
      
      const caption = await storage.getCaption(id);
      if (!caption) {
        return res.status(404).json({ error: "Caption not found" });
      }
      
      await storage.deleteCaption(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting caption:", error);
      res.status(500).json({ error: "Failed to delete caption" });
    }
  });

  // Create a caption
  app.post("/api/captions", async (req, res) => {
    try {
      const result = insertCaptionSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid data", details: result.error });
      }
      
      const caption = await storage.createCaption(result.data);
      res.status(201).json(caption);
    } catch (error) {
      console.error("Error creating caption:", error);
      res.status(500).json({ error: "Failed to create caption" });
    }
  });
  
  // Export video with captions
  app.post("/api/videos/:id/export", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }
      
      // Get user plan for watermark functionality
      let userPlan = 'free'; // Default to free plan with watermark
      
      // Check if user is authenticated and get their plan
      if ((req as any).isAuthenticated && (req as any).isAuthenticated()) {
        try {
          const authenticatedUser = await storage.getUser((req as any).user.claims.sub);
          if (authenticatedUser && authenticatedUser.plan) {
            userPlan = authenticatedUser.plan;
            console.log("Authenticated user plan:", userPlan);
          }
        } catch (authError) {
          console.log("Could not get user plan, defaulting to free:", authError);
        }
      } else {
        console.log("User not authenticated, using free plan with watermark");
      }
      
      console.log("Final user plan for export:", userPlan);
      
      // Validate export settings
      const settingsSchema = z.object({
        format: z.enum(["mp4", "mov", "avi"]),
        quality: z.enum(["low", "medium", "high"]),
        resolution: z.enum(["original", "1080p", "720p", "480p"]),
        defaultFont: z.enum(["gothic", "mincho", "maru-gothic", "NotoSansJP"]),
        backgroundStyle: z.enum(["semi-transparent", "none", "outline"]),
        position: z.enum(["bottom", "top", "center"]),
        accessibilityMode: z.boolean().default(false)
      });
      
      const result = settingsSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid export settings", details: result.error });
      }
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      const captions = await storage.getCaptionsByVideoId(id);
      
      // Export video with captions - include accessibilityMode and user plan
      const exportSettings: ExportSettings = {
        ...result.data,
        accessibilityMode: result.data.accessibilityMode ?? false
      };
      const exportResult = await exportVideoWithCaptions(video, captions, exportSettings, userPlan);
      
      res.json({
        downloadUrl: `/processed/${path.basename(exportResult.outputPath)}`,
        filename: exportResult.filename
      });
    } catch (error) {
      console.error("Error exporting video:", error);
      res.status(500).json({ error: "Failed to export video" });
    }
  });
  
  // 元のアップロードされた動画ファイルを提供するエンドポイント
  app.get("/api/videos/:id/stream", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }
      
      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      
      // アップロードされた元の動画ファイルのパス
      const filePath = video.originalPath;
      console.log(`ストリーミングリクエスト: ビデオID=${id}, ファイルパス=${filePath}`);
      
      // ファイルが存在するか確認
      try {
        await fs.access(filePath);
        console.log(`動画ファイルが見つかりました: ${filePath}`);
      } catch (error) {
        console.error(`動画ファイルが見つかりません: ${filePath}`);
        return res.status(404).send("Video file not found");
      }
      
      // 動画ファイルの情報を取得
      const stat = await fs.stat(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;

      // 動画ファイルの種類に基づいてContent-Typeを設定
      let contentType = 'video/mp4';
      if (filePath.endsWith('.mov') || filePath.endsWith('.MOV')) {
        contentType = 'video/quicktime';
      } else if (filePath.endsWith('.avi')) {
        contentType = 'video/x-msvideo';
      } else if (filePath.endsWith('.webm')) {
        contentType = 'video/webm';
      }
      
      // ブラウザの互換性のために常にRange対応
      if (range) {
        // レンジリクエストの解析
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        // ヘッダーを設定
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
        });
        
        // fsyncモジュールを使用してストリーミング
        const fileStream = fsSync.createReadStream(filePath, { start, end });
        fileStream.pipe(res);
      } else {
        // 通常のリクエストの場合、全体を送信
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes'
        });
        
        // fsyncモジュールを使用してストリーミング
        const fileStream = fsSync.createReadStream(filePath);
        fileStream.pipe(res);
      }
    } catch (error) {
      console.error("動画提供エラー:", error);
      res.status(500).send("Error serving video");
    }
  });

  // アップロード済みの動画ファイルを直接提供
  app.use("/uploads", (req, res, next) => {
    const filePath = path.join(uploadsDir, req.path);
    
    // 安全性チェック - ディレクトリトラバーサル攻撃の防止
    if (!filePath.startsWith(uploadsDir)) {
      return res.status(403).send("Forbidden");
    }

    console.log(`直接ファイルアクセス: ${filePath}`);
    
    // ファイルを直接送信
    res.sendFile(filePath, (err) => {
      if (err) {
        if (err instanceof Error && 'code' in err && err.code === "ENOENT") {
          return res.status(404).send("File not found");
        }
        console.error("Error serving file:", err);
        res.status(500).send("Error serving file");
      }
    });
  });
  
  // Serve processed videos
  app.use("/processed", (req, res, next) => {
    const filePath = path.join(processedDir, req.path);
    
    // Check if this is a directory traversal attempt
    if (!filePath.startsWith(processedDir)) {
      return res.status(403).send("Forbidden");
    }
    
    res.sendFile(filePath, (err) => {
      if (err) {
        if (err instanceof Error && 'code' in err && err.code === "ENOENT") {
          return res.status(404).send("File not found");
        }
        console.error("Error serving file:", err);
        res.status(500).send("Error serving file");
      }
    });
  });
  
  // Process video in the background (シンプル化したバージョン)
  async function processVideo(videoId: number) {
    console.log(`🎵 音声認識システム - 動画処理開始: ${videoId}`);
    
    try {
      // Get video details
      const video = await storage.getVideo(videoId);
      if (!video) {
        console.error(`Video ${videoId} not found`);
        return;
      }
      
      console.log(`🎵 音声認識システム - 動画アップロード完了`);
      console.log(`🎵 手動で「AIテロップ生成」ボタンを押すと音声認識が開始されます`);
      
      // 動画の基本情報のみ更新（テロップは手動生成のみ）
      await storage.updateVideoStatus(videoId, "completed");
      
      // 動画の長さを仮に設定（実際の長さは音声認識時に取得）
      await storage.updateVideoDuration(videoId, 20000); // 20秒
      
      console.log(`🎵 動画 ${videoId} の準備完了 - 音声認識の準備ができました`);
    } catch (error) {
      console.error(`Error processing video ${videoId}:`, error);
      
      try {
        const errorMessage = error instanceof Error ? error.message : "Unknown processing error";
        await storage.updateVideoError(videoId, errorMessage);
        await storage.updateVideoStatus(videoId, "failed");
      } catch (updateError) {
        console.error(`Failed to update error status for video ${videoId}:`, updateError);
      }
    }
  }

  // Admin API endpoints
  
  // Get all users (admin only)
  app.get("/api/admin/users", async (req, res) => {
    // Simple admin check for demo - in production use proper admin authentication
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Get all videos (admin only)
  app.get("/api/admin/videos", async (req, res) => {
    try {
      const videos = await storage.getAllVideos();
      res.json(videos);
    } catch (error) {
      console.error("Error fetching videos:", error);
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  });

  // Update user plan (admin only)
  app.patch("/api/admin/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      const { plan } = req.body;
      if (!plan || !["free", "starter", "creator", "pro"].includes(plan)) {
        return res.status(400).json({ error: "Invalid plan" });
      }

      const updatedUser = await storage.updateUserPlan(id, plan);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user plan:", error);
      res.status(500).json({ error: "Failed to update user plan" });
    }
  });

  // Get financial statistics (admin only)
  app.get("/api/admin/revenue", async (req, res) => {
    try {
      const stats = await storage.getRevenueStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching revenue stats:", error);
      res.status(500).json({ error: "Failed to fetch revenue stats" });
    }
  });

  // Get monthly revenue for specific month (admin only)
  app.get("/api/admin/revenue/:year/:month", async (req, res) => {
    try {
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        return res.status(400).json({ error: "Invalid year or month" });
      }

      const revenue = await storage.getMonthlyRevenue(year, month);
      res.json({ year, month, revenue });
    } catch (error) {
      console.error("Error fetching monthly revenue:", error);
      res.status(500).json({ error: "Failed to fetch monthly revenue" });
    }
  });

  // Delete video (admin only)
  app.delete("/api/admin/videos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid video ID" });
      }

      const video = await storage.getVideo(id);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Delete video file from filesystem
      try {
        await fs.unlink(video.originalPath);
        console.log(`Deleted video file: ${video.originalPath}`);
      } catch (fileError) {
        console.warn(`Could not delete video file: ${video.originalPath}`, fileError);
      }

      // Delete video record from database
      await storage.deleteVideo(id);
      
      res.status(200).json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ error: "Failed to delete video" });
    }
  });

  // User registration - Step 1: Email registration
  app.post("/api/register", async (req, res) => {
    try {
      const { email, username } = req.body;

      if (!email || !username) {
        return res.status(400).json({ error: "メールアドレスとユーザー名が必要です" });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "有効なメールアドレスを入力してください" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "このメールアドレスは既に登録されています" });
      }

      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(409).json({ error: "このユーザー名は既に使用されています" });
      }

      // Generate verification token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Store verification token
      await storage.createEmailVerificationToken(email, token, expiresAt);

      // In a real application, you would send an email here
      // For now, we'll return the token for testing
      res.status(200).json({
        message: "認証メールを送信しました。メールを確認してください。",
        // Remove this in production - only for testing
        verificationToken: token,
        email: email,
        username: username
      });
    } catch (error) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: "登録に失敗しました" });
    }
  });

  // User registration - Step 2: Email verification and password setup
  app.post("/api/verify-email", async (req, res) => {
    try {
      const result = verifyEmailSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          error: "入力データが無効です", 
          details: result.error.errors.map(e => e.message)
        });
      }

      const { token, password } = result.data;

      // Get verification token
      const emailToken = await storage.getEmailVerificationToken(token);
      if (!emailToken) {
        return res.status(400).json({ error: "無効な認証トークンです" });
      }

      // Check if token is expired
      if (new Date() > emailToken.expiresAt) {
        await storage.deleteEmailVerificationToken(token);
        return res.status(400).json({ error: "認証トークンの有効期限が切れています" });
      }

      // Get username from the original registration (stored in session or token)
      // For now, we'll use a simple approach
      const username = emailToken.email.split('@')[0] + '_user';

      // Create user with verified email
      const newUser = await storage.createUser({
        username,
        password, // In production, hash this password
        email: emailToken.email,
      });

      // Mark email as verified
      await storage.updateUserEmailVerified(newUser.id);

      // Delete verification token
      await storage.deleteEmailVerificationToken(token);

      // Remove password from response
      const { password: _, ...userResponse } = newUser;
      res.status(201).json({
        message: "ユーザー登録が完了しました",
        user: userResponse
      });
    } catch (error) {
      console.error("Error during email verification:", error);
      res.status(500).json({ error: "認証に失敗しました" });
    }
  });

  // User login endpoint
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "ユーザー名またはメールアドレスとパスワードが必要です" });
      }

      // Try to find user by username or email
      let user = await storage.getUserByUsername(username);
      if (!user) {
        user = await storage.getUserByEmail(username);
      }

      if (!user) {
        return res.status(401).json({ error: "ユーザー名またはパスワードが正しくありません" });
      }

      // Check if email is verified
      if (!user.emailVerified) {
        return res.status(401).json({ error: "メールアドレスが認証されていません" });
      }

      // In production, compare hashed passwords
      if (user.password !== password) {
        return res.status(401).json({ error: "ユーザー名またはパスワードが正しくありません" });
      }

      // Remove password from response
      const { password: _, ...userResponse } = user;
      res.json(userResponse);
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ error: "ログインに失敗しました" });
    }
  });

  // Get current user data
  app.get("/api/user", async (req, res) => {
    // For now, return demo user data
    // In production, get from session/JWT
    res.json({
      id: 1,
      username: "demo_user",
      plan: "free",
      subscriptionStatus: "inactive",
      monthlyUploads: 0,
      currentPeriodEnd: null
    });
  });

  // Update user profile
  app.patch("/api/profile", async (req, res) => {
    try {
      // In production, get user ID from session/JWT
      const userId = 1; // Demo user ID
      const { username, email } = req.body;

      if (!username || !email) {
        return res.status(400).json({ error: "ユーザー名とメールアドレスが必要です" });
      }

      // Check if username already exists (exclude current user)
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ error: "このユーザー名は既に使用されています" });
      }

      // Check if email already exists (exclude current user)
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail && existingEmail.id !== userId) {
        return res.status(409).json({ error: "このメールアドレスは既に登録されています" });
      }

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, { username, email });
      
      // Remove password from response
      const { password: _, ...userResponse } = updatedUser;
      res.json({ user: userResponse });
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "プロフィールの更新に失敗しました" });
    }
  });

  // Change user password
  app.post("/api/change-password", async (req, res) => {
    try {
      // In production, get user ID from session/JWT
      const userId = 1; // Demo user ID
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "現在のパスワードと新しいパスワードが必要です" });
      }

      // Validate new password
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "新しいパスワードは8文字以上で入力してください" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "ユーザーが見つかりません" });
      }

      // Verify current password
      if (user.password !== currentPassword) {
        return res.status(401).json({ error: "現在のパスワードが正しくありません" });
      }

      // Update password
      await storage.updateUserPassword(userId, newPassword);
      
      res.json({ message: "パスワードを変更しました" });
    } catch (error) {
      console.error("Error changing password:", error);
      res.status(500).json({ error: "パスワード変更に失敗しました" });
    }
  });

  // Request password reset
  app.post("/api/request-password-reset", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "メールアドレスが必要です" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal whether email exists or not for security
        return res.json({ message: "パスワードリセット用のメールを送信しました" });
      }

      // Generate reset token
      const resetToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store reset token
      await storage.createPasswordResetToken(email, resetToken, expiresAt);

      // In production, send email with reset link
      // For demo, just log the reset link
      console.log(`Password reset link: http://localhost:5000/reset-password?token=${resetToken}`);
      
      res.json({ message: "パスワードリセット用のメールを送信しました" });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ error: "パスワードリセット要求に失敗しました" });
    }
  });

  // Reset password
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "トークンとパスワードが必要です" });
      }

      // Validate password
      if (password.length < 8) {
        return res.status(400).json({ error: "パスワードは8文字以上で入力してください" });
      }

      // Get and validate reset token
      const resetToken = await storage.getPasswordResetToken(token);
      if (!resetToken) {
        return res.status(400).json({ error: "無効または期限切れのトークンです" });
      }

      // Check if token is expired
      if (new Date() > resetToken.expiresAt) {
        await storage.deletePasswordResetToken(token);
        return res.status(400).json({ error: "トークンの有効期限が切れています" });
      }

      // Reset password
      await storage.resetUserPassword(resetToken.email, password);
      
      // Delete used token
      await storage.deletePasswordResetToken(token);
      
      res.json({ message: "パスワードをリセットしました" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "パスワードリセットに失敗しました" });
    }
  });

  // Stripe subscription endpoints
  app.post("/api/create-subscription", async (req, res) => {
    try {
      // In production, get user ID from session/JWT
      const userId = 1; // Demo user ID
      const { priceId } = req.body;

      if (!priceId) {
        return res.status(400).json({ error: "プランを選択してください" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "ユーザーが見つかりません" });
      }

      let customerId = user.stripeCustomerId;

      // Create Stripe customer if doesn't exist
      if (!customerId) {
        const customer = await stripeClient.customers.create({
          email: user.email,
          name: user.username,
          metadata: {
            userId: userId.toString()
          }
        });
        customerId = customer.id;
        await storage.updateUserStripeCustomerId(userId, customerId);
      }

      // Create subscription
      const subscription = await stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      });

      const invoice = subscription.latest_invoice as any;
      res.json({
        subscriptionId: subscription.id,
        clientSecret: invoice?.payment_intent?.client_secret,
      });
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ error: "サブスクリプション作成に失敗しました" });
    }
  });

  // Cancel subscription
  app.post("/api/cancel-subscription", async (req, res) => {
    try {
      // In production, get user ID from session/JWT
      const userId = 1; // Demo user ID

      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ error: "有効なサブスクリプションが見つかりません" });
      }

      // Cancel at period end
      const subscription = await stripeClient.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      res.json({ 
        message: "サブスクリプションをキャンセルしました",
        endsAt: (subscription as any).current_period_end 
      });
    } catch (error) {
      console.error("Error canceling subscription:", error);
      res.status(500).json({ error: "サブスクリプションキャンセルに失敗しました" });
    }
  });

  // Reactivate subscription
  app.post("/api/reactivate-subscription", async (req, res) => {
    try {
      // In production, get user ID from session/JWT
      const userId = 1; // Demo user ID

      const user = await storage.getUser(userId);
      if (!user || !user.stripeSubscriptionId) {
        return res.status(404).json({ error: "有効なサブスクリプションが見つかりません" });
      }

      // Reactivate subscription
      const subscription = await stripeClient.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      res.json({ 
        message: "サブスクリプションを再開しました",
        status: subscription.status 
      });
    } catch (error) {
      console.error("Error reactivating subscription:", error);
      res.status(500).json({ error: "サブスクリプション再開に失敗しました" });
    }
  });

  // Get subscription status
  app.get("/api/subscription-status", async (req, res) => {
    try {
      // In production, get user ID from session/JWT
      const userId = 1; // Demo user ID

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "ユーザーが見つかりません" });
      }

      if (!user.stripeSubscriptionId) {
        return res.json({ status: "none", subscription: null });
      }

      const subscription = await stripeClient.subscriptions.retrieve(user.stripeSubscriptionId);

      const sub = subscription;
      res.json({
        status: sub.status,
        subscription: {
          id: sub.id,
          status: sub.status,
          current_period_start: (sub as any).current_period_start,
          current_period_end: (sub as any).current_period_end,
          cancel_at_period_end: (sub as any).cancel_at_period_end,
          items: sub.items.data.map((item: any) => ({
            price: item.price.id,
            product: item.price.product,
          }))
        }
      });
    } catch (error) {
      console.error("Error getting subscription status:", error);
      res.status(500).json({ error: "サブスクリプション状況の取得に失敗しました" });
    }
  });

  // Stripe webhook for handling subscription events
  app.post("/api/webhooks/stripe", express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret || !sig) {
      console.error("Stripe webhook secret not configured or signature missing");
      return res.status(400).send("Webhook configuration error");
    }

    let event;

    try {
      event = stripeClient.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as any;
          const customerId = subscription.customer;
          
          // Find user by Stripe customer ID
          const users = await storage.getAllUsers();
          const user = users.find(u => u.stripeCustomerId === customerId);
          
          if (user) {
            await storage.updateUserSubscription(user.id, {
              subscriptionId: subscription.id,
              status: subscription.status,
              currentPeriodEnd: new Date(subscription.current_period_end * 1000)
            });
          }
          break;
        
        case 'invoice.payment_succeeded':
          console.log("Payment succeeded:", event.data.object.id);
          break;
        
        case 'invoice.payment_failed':
          console.log("Payment failed:", event.data.object.id);
          break;
      }

      res.json({ received: true });
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Webhook処理に失敗しました" });
    }
  });

  // Serve admin page directly
  app.get("/admin", (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理者ダッシュボード - Subbit</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        h1 {
            color: #333;
            margin-bottom: 30px;
            text-align: center;
        }
        
        .tabs {
            display: flex;
            margin-bottom: 30px;
            border-bottom: 2px solid #ddd;
        }
        
        .tab {
            padding: 10px 20px;
            background: #f8f9fa;
            border: none;
            cursor: pointer;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            margin-right: 5px;
        }
        
        .tab.active {
            background: #007bff;
            color: white;
        }
        
        .content {
            background: white;
            border-radius: 5px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
        }
        
        .badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .badge-pro { background: #ffd700; color: #b8860b; }
        .badge-creator { background: #e6e6fa; color: #4b0082; }
        .badge-starter { background: #e3f2fd; color: #1976d2; }
        .badge-free { background: #f5f5f5; color: #666; }
        .badge-active { background: #e8f5e8; color: #2e7d32; }
        .badge-inactive { background: #f5f5f5; color: #666; }
        
        select, button {
            padding: 8px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            cursor: pointer;
        }
        
        button {
            background: #007bff;
            color: white;
            border: none;
        }
        
        button:hover {
            background: #0056b3;
        }
        
        .btn-danger {
            background: #dc3545;
        }
        
        .btn-danger:hover {
            background: #c82333;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        
        .stat-number {
            font-size: 2em;
            font-weight: bold;
            color: #007bff;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
        }
        
        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>管理者ダッシュボード</h1>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('users')">ユーザー管理</button>
            <button class="tab" onclick="showTab('videos')">動画管理</button>
            <button class="tab" onclick="showTab('stats')">統計</button>
        </div>
        
        <div id="users-content" class="content">
            <h2>ユーザー一覧</h2>
            <div id="users-loading" class="loading">読み込み中...</div>
            <div id="users-table" class="hidden"></div>
        </div>
        
        <div id="videos-content" class="content hidden">
            <h2>動画一覧</h2>
            <div id="videos-loading" class="loading">読み込み中...</div>
            <div id="videos-table" class="hidden"></div>
        </div>
        
        <div id="stats-content" class="content hidden">
            <h2>統計情報</h2>
            <div id="stats-loading" class="loading">読み込み中...</div>
            <div id="stats-cards" class="stats hidden"></div>
        </div>
    </div>

    <script>
        let users = [];
        let videos = [];

        document.addEventListener('DOMContentLoaded', function() {
            loadData();
        });

        function showTab(tabName) {
            document.querySelectorAll('.content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
            
            document.getElementById(tabName + '-content').classList.remove('hidden');
            event.target.classList.add('active');
        }

        async function loadData() {
            try {
                const usersResponse = await fetch('/api/admin/users');
                if (usersResponse.ok) {
                    users = await usersResponse.json();
                    renderUsers();
                }

                const videosResponse = await fetch('/api/admin/videos');
                if (videosResponse.ok) {
                    videos = await videosResponse.json();
                    renderVideos();
                }

                renderStats();
            } catch (error) {
                console.error('Error loading data:', error);
                document.getElementById('users-loading').textContent = 'データの読み込みに失敗しました';
                document.getElementById('videos-loading').textContent = 'データの読み込みに失敗しました';
                document.getElementById('stats-loading').textContent = 'データの読み込みに失敗しました';
            }
        }

        function renderUsers() {
            const container = document.getElementById('users-table');
            const loading = document.getElementById('users-loading');
            
            if (users.length === 0) {
                container.innerHTML = '<p>ユーザーが見つかりません</p>';
            } else {
                container.innerHTML = \`
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>ユーザー名</th>
                                <th>メール</th>
                                <th>プラン</th>
                                <th>ステータス</th>
                                <th>月間アップロード</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${users.map(user => \`
                                <tr>
                                    <td>\${user.id}</td>
                                    <td>\${user.username}</td>
                                    <td>\${user.email || '未設定'}</td>
                                    <td><span class="badge badge-\${user.plan}">\${user.plan.toUpperCase()}</span></td>
                                    <td><span class="badge badge-\${user.subscriptionStatus}">\${user.subscriptionStatus}</span></td>
                                    <td>\${user.monthlyUploads}</td>
                                    <td>
                                        <select onchange="updateUserPlan(\${user.id}, this.value)">
                                            <option value="free" \${user.plan === 'free' ? 'selected' : ''}>Free</option>
                                            <option value="starter" \${user.plan === 'starter' ? 'selected' : ''}>Starter</option>
                                            <option value="creator" \${user.plan === 'creator' ? 'selected' : ''}>Creator</option>
                                            <option value="pro" \${user.plan === 'pro' ? 'selected' : ''}>Pro</option>
                                        </select>
                                    </td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \`;
            }
            
            loading.classList.add('hidden');
            container.classList.remove('hidden');
        }

        function renderVideos() {
            const container = document.getElementById('videos-table');
            const loading = document.getElementById('videos-loading');
            
            if (videos.length === 0) {
                container.innerHTML = '<p>動画が見つかりません</p>';
            } else {
                container.innerHTML = \`
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>ファイル名</th>
                                <th>ステータス</th>
                                <th>ファイルサイズ</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            \${videos.map(video => \`
                                <tr>
                                    <td>\${video.id}</td>
                                    <td>\${video.filename}</td>
                                    <td><span class="badge badge-\${video.status === 'completed' ? 'active' : 'inactive'}">\${video.status}</span></td>
                                    <td>\${(video.fileSize / (1024 * 1024)).toFixed(1)} MB</td>
                                    <td>
                                        <button class="btn-danger" onclick="deleteVideo(\${video.id})">削除</button>
                                    </td>
                                </tr>
                            \`).join('')}
                        </tbody>
                    </table>
                \`;
            }
            
            loading.classList.add('hidden');
            container.classList.remove('hidden');
        }

        function renderStats() {
            const container = document.getElementById('stats-cards');
            const loading = document.getElementById('stats-loading');
            
            const paidUsers = users.filter(user => user.plan !== 'free').length;
            
            container.innerHTML = \`
                <div class="stat-card">
                    <h3>総ユーザー数</h3>
                    <div class="stat-number">\${users.length}</div>
                </div>
                <div class="stat-card">
                    <h3>総動画数</h3>
                    <div class="stat-number">\${videos.length}</div>
                </div>
                <div class="stat-card">
                    <h3>有料ユーザー</h3>
                    <div class="stat-number">\${paidUsers}</div>
                </div>
            \`;
            
            loading.classList.add('hidden');
            container.classList.remove('hidden');
        }

        async function updateUserPlan(userId, plan) {
            try {
                const response = await fetch(\`/api/admin/users/\${userId}\`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ plan }),
                });

                if (response.ok) {
                    alert('プランを更新しました');
                    loadData();
                } else {
                    alert('更新に失敗しました');
                }
            } catch (error) {
                console.error('Error updating plan:', error);
                alert('エラーが発生しました');
            }
        }

        async function deleteVideo(videoId) {
            if (!confirm('本当に削除しますか？')) return;

            try {
                const response = await fetch(\`/api/admin/videos/\${videoId}\`, {
                    method: 'DELETE',
                });

                if (response.ok) {
                    alert('動画を削除しました');
                    loadData();
                } else {
                    alert('削除に失敗しました');
                }
            } catch (error) {
                console.error('Error deleting video:', error);
                alert('エラーが発生しました');
            }
        }
    </script>
</body>
</html>`);
  });

  const httpServer = createServer(app);
  return httpServer;
}
