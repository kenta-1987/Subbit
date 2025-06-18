import dotenv from "dotenv";
dotenv.config();
console.log("STRIPE_SECRET_KEY:", process.env.STRIPE_SECRET_KEY);
import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { createServer } from "http";

console.log("✅ index.ts: サーバー起動処理開始"); // ← ここに入れる！

const app = express();
const server = createServer(app);

// CORSミドルウェア
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Expose-Headers", "Content-Range, Accept-Ranges, Content-Encoding");

  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

// APIルーティング登録
registerRoutes(app);

// フロントエンド提供
if (process.env.NODE_ENV === "development") {
  setupVite(app, server);
} else {
  serveStatic(app);
}

// サーバー起動
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  log(`🚀 Server is running at http://localhost:${PORT}`);
});
