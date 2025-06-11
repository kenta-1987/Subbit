import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

// CORSミドルウェア（全リクエスト許可）
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

// ルーティング登録
registerRoutes(app);

// 環境に応じたフロントエンドの提供
if (process.env.NODE_ENV === "development") {
  setupVite(app);
} else {
  serveStatic(app);
}

// ✅ サーバー起動（PORT環境変数がなければ5000で起動）
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  log(`🚀 Server is running at http://localhost:${PORT}`);
});

