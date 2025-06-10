import { createCanvas, loadImage, registerFont } from 'canvas';
import { promises as fs } from 'fs';
import path from 'path';
import { Caption } from '@shared/schema';

const tempDir = path.join(process.cwd(), 'temp');

// テロップ画像生成クラス
export class CaptionRenderer {
  
  constructor() {
    // DejaVu Sansフォントを登録（日本語文字対応）
    try {
      registerFont('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', { family: 'DejaVu Sans' });
      registerFont('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', { family: 'DejaVu Sans Bold' });
    } catch (error) {
      console.log('フォント登録警告:', error);
    }
  }
  
  async generateCaptionImages(captions: Caption[], videoWidth: number = 1920, videoHeight: number = 1080): Promise<string[]> {
    // 一時ディレクトリ作成
    await fs.mkdir(tempDir, { recursive: true });
    
    const imagePaths: string[] = [];
    
    for (let i = 0; i < captions.length; i++) {
      const caption = captions[i];
      const imagePath = await this.createCaptionImage(caption, i, videoWidth, videoHeight);
      imagePaths.push(imagePath);
    }
    
    return imagePaths;
  }
  
  private async createCaptionImage(caption: Caption, index: number, videoWidth: number, videoHeight: number): Promise<string> {
    // キャンバス作成
    const canvas = createCanvas(videoWidth, videoHeight);
    const ctx = canvas.getContext('2d');
    
    // 透明背景
    ctx.clearRect(0, 0, videoWidth, videoHeight);
    
    // フォント設定（基本フォントで大きく表示）
    const fontSize = 56;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // テキスト位置（画面下部）
    const x = videoWidth / 2;
    const y = videoHeight - 100;
    
    // 背景ボックス（黒い半透明背景）
    const textMetrics = ctx.measureText(caption.text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;
    const padding = 20;
    
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(
      x - textWidth/2 - padding, 
      y - textHeight/2 - padding, 
      textWidth + padding*2, 
      textHeight + padding*2
    );
    
    // 太いアウトライン（縁取り）
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 6;
    ctx.strokeText(caption.text, x, y);
    
    // メインテキスト（白）
    ctx.fillStyle = 'white';
    ctx.fillText(caption.text, x, y);
    
    // 画像として保存
    const filename = `caption_${index}_${Date.now()}.png`;
    const filepath = path.join(tempDir, filename);
    
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(filepath, buffer);
    
    return filepath;
  }
  
  // 生成した画像ファイルをクリーンアップ
  async cleanup(imagePaths: string[]) {
    for (const imagePath of imagePaths) {
      try {
        await fs.unlink(imagePath);
      } catch (error) {
        console.log(`画像ファイル削除エラー: ${imagePath}`, error);
      }
    }
  }
}