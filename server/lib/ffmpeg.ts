import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import { promises as fsPromises } from "fs";
import path from "path";
import { writeFile, mkdir, unlink } from "fs/promises";
import type { Video, Caption, ExportSettings } from "@shared/schema";

// Check if file exists and is readable
async function validateInputFile(inputPath: string): Promise<void> {
  try {
    // Simple existence check first
    if (!fs.existsSync(inputPath)) {
      throw new Error(`File not found: ${inputPath}`);
    }
    
    const stats = fs.statSync(inputPath);
    if (!stats.isFile()) {
      throw new Error(`Input is not a file: ${inputPath}`);
    }
    
    // Check file size
    const fileSizeMB = stats.size / (1024 * 1024);
    console.log(`Input file size: ${fileSizeMB.toFixed(2)} MB`);
    
    if (stats.size === 0) {
      throw new Error(`Input file is empty: ${inputPath}`);
    }
    
  } catch (error) {
    throw new Error(`File validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Convert video to MP4 for better browser compatibility
export async function convertToMp4(inputPath: string): Promise<string> {
  // Validate input file first
  await validateInputFile(inputPath);
  
  const outputPath = inputPath.replace(path.extname(inputPath), '_converted.mp4');
  
  // Check file size to determine compression level
  const stats = fs.statSync(inputPath);
  const fileSizeMB = stats.size / (1024 * 1024);
  const isLargeFile = fileSizeMB > 500; // Files larger than 500MB
  
  return new Promise((resolve, reject) => {
    const ffmpegCommand = ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .format('mp4');
    
    if (isLargeFile) {
      // Aggressive compression for large files
      ffmpegCommand.outputOptions([
        '-movflags', 'faststart',
        '-preset', 'fast',
        '-crf', '28', // Higher CRF for more compression
        '-vf', 'scale=1280:720', // Downscale to 720p for preview
        '-r', '30', // Limit framerate to 30fps
        '-max_muxing_queue_size', '9999',
        '-avoid_negative_ts', 'make_zero'
      ]);
    } else {
      // Standard compression for normal files
      ffmpegCommand.outputOptions([
        '-movflags', 'faststart',
        '-preset', 'medium',
        '-crf', '23',
        '-max_muxing_queue_size', '9999',
        '-avoid_negative_ts', 'make_zero'
      ]);
    }
    
    ffmpegCommand
      .on('start', (commandLine: string) => {
        console.log('🎬 MP4変換開始:', commandLine);
        console.log(`Large file optimization: ${isLargeFile ? 'enabled' : 'disabled'}`);
      })
      .on('progress', (progress: any) => {
        if (progress.percent) {
          console.log(`🎬 変換進捗: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('🎬 MP4変換完了:', outputPath);
        resolve(outputPath);
      })
      .on('error', (err: any) => {
        console.error('🎬 MP4変換エラー:', err);
        reject(new Error(`Video conversion failed: ${err.message || err}`));
      })
      .run();
  });
}

const processedDir = path.join(process.cwd(), 'processed');
const tempDir = path.join(process.cwd(), 'temp');

// Ensure directories exist
async function ensureDirsExist() {
  await mkdir(processedDir, { recursive: true });
  await mkdir(tempDir, { recursive: true });
}

// Generate subtitle file with proper UTF-8 encoding
async function generateSubtitleFile(captions: Caption[], settings: ExportSettings): Promise<string> {
  const subtitlePath = path.join(tempDir, `subtitles-${Date.now()}.srt`);
  let srtContent = "\ufeff"; // UTF-8 BOM for better compatibility
  
  // Generate SRT file
  captions.forEach((caption, index) => {
    const startTime = formatSrtTime(caption.startTime);
    const endTime = formatSrtTime(caption.endTime);
    
    // Add subtitle entry
    srtContent += `${index + 1}\n`;
    srtContent += `${startTime} --> ${endTime}\n`;
    srtContent += `${caption.text}\n\n`;
  });
  
  // Write with explicit UTF-8 encoding and BOM
  await writeFile(subtitlePath, srtContent, { encoding: 'utf8' });
  return subtitlePath;
}

// Format time for SRT file (00:00:00,000)
function formatSrtTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = ms % 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (num: number) => num.toString().padStart(2, '0');
  const padMs = (num: number) => num.toString().padStart(3, '0');
  
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${padMs(milliseconds)}`;
}

// Get quality settings
function getQualitySettings(quality: string): string {
  switch (quality) {
    case "high":
      return "-crf 18 -preset slow";
    case "medium":
      return "-crf 23 -preset medium";
    case "low":
      return "-crf 28 -preset fast";
    default:
      return "-crf 23 -preset medium";
  }
}

// Get resolution settings
function getResolutionSettings(resolution: string): string {
  switch (resolution) {
    case "4k":
      return "-vf scale=3840:2160";
    case "1080p":
      return "-vf scale=1920:1080";
    case "720p":
      return "-vf scale=1280:720";
    case "480p":
      return "-vf scale=854:480";
    default:
      return ""; // Keep original resolution
  }
}

function formatAssTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((ms % 1000) / 10);
  
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
}

// HEX色をBGR形式に変換（ASSファイル用）
function hexToBgr(hex: string): string {
  // #を削除して6桁にする
  const cleanHex = hex.replace('#', '').padStart(6, '0');
  
  // RGBを抽出
  const r = cleanHex.substring(0, 2);
  const g = cleanHex.substring(2, 4);
  const b = cleanHex.substring(4, 6);
  
  // BGRの順序で結合（ASSは00BBGGRRの形式）
  return `00${b}${g}${r}`.toUpperCase();
}

async function generateAssSubtitleFile(captions: Caption[], settings: ExportSettings): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const assFilePath = path.join(process.cwd(), 'temp', `subtitles_${timestamp}.ass`);
  
  await ensureDirsExist();
  
  // ダウンロードしたNoto Sans CJK JPフォントファイルを直接指定（ファイル名のみ）
  const fontName = 'NotoSansCJKjp-Regular';
  
  // 個別キャプション用のスタイルを生成
  const styles = captions.map((caption, index) => {
    // 動画エクスポート用のフォントサイズ（プレビューサイズに合わせて調整）
    const fontSize = caption.fontSize === 'small' ? 32 : 
                     caption.fontSize === 'large' ? 40 : 36;
    const outline = settings.accessibilityMode ? 3 : 2;
    
    // 色をHEX形式からBGR形式に変換（ASSファイル用）
    const hexColor = caption.color || '#FFFFFF';
    const bgrColor = hexToBgr(hexColor);
    
    // デバッグ用ログ
    console.log(`Caption ${index}: hex=${hexColor}, bgr=${bgrColor}, hasBackground=${caption.hasBackground}`);
    
    // 背景設定 - hasBackgroundプロパティに基づいて背景を設定
    const backColour = caption.hasBackground ? '&H80000000' : '&H00000000'; // 半透明黒背景 or 透明
    const bold = 0; // 太字なし
    const italic = 0; // 斜体なし
    const underline = 0; // 下線なし
    const strikeout = 0; // 取り消し線なし
    const scaleX = 100; // 横幅スケール
    const scaleY = 100; // 縦幅スケール
    const spacing = 0; // 文字間隔
    const angle = 0; // 回転角度
    const borderStyle = 1; // 境界線スタイル
    const alignment = 2; // 下部中央配置
    const marginL = 0; // 左マージン
    const marginR = 0; // 右マージン
    const marginV = 30; // 下マージン
    
    return `Style: Caption${index},${fontName},${fontSize},&H${bgrColor},&H000000,${backColour},&H000000,${bold},${italic},${underline},${strikeout},${scaleX},${scaleY},${spacing},${angle},${borderStyle},${outline},0,${alignment},${marginL},${marginR},${marginV},1`;
  }).join('\n');
  
  const assContent = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: 1280
PlayResY: 720
Collisions: Normal
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styles}

[Events]
Format: Start, End, Style, Text
${captions.map((caption, index) => {
  const startTime = formatAssTime(caption.startTime);
  const endTime = formatAssTime(caption.endTime);
  
  // AI生成テキストの不可視文字や問題のある文字をクリーンアップ
  const cleanText = caption.text
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // ゼロ幅文字を削除
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // 制御文字を削除
    .replace(/\r\n/g, ' ') // CRLFを半角スペースに
    .replace(/\r/g, ' ') // CRを半角スペースに
    .replace(/\n/g, ' ') // LFを半角スペースに
    .replace(/\t/g, ' ') // タブを半角スペースに
    .replace(/\s+/g, ' ') // 連続する空白を1つに
    .trim(); // 前後の空白を削除
  
  return `Dialogue: ${startTime},${endTime},Caption${index},${cleanText}`;
}).join('\n')}`;
  
  // UTF-8 BOMを追加して確実な日本語エンコーディング
  const utf8Bom = '\uFEFF';
  const finalContent = utf8Bom + assContent;
  
  await writeFile(assFilePath, finalContent, 'utf8');
  return assFilePath;
}

// Get subtitle style for FFmpeg
function getSubtitleStyle(settings: ExportSettings): string {
  // 日本語対応のフォント設定（monospaceフォント使用）
  let style = 'Fontname=monospace,Fontsize=40,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=5,Bold=1,BackColour=&H80000000';
  
  // 位置設定
  const position = settings.position || 'bottom';
  if (position === 'top') {
    style += ',Alignment=8'; // 上部中央
  } else if (position === 'center') {
    style += ',Alignment=5'; // 中央
  } else {
    style += ',Alignment=2'; // 下部中央（デフォルト）
  }
  
  // 背景設定
  const backgroundStyle = settings.backgroundStyle || 'none';
  if (backgroundStyle === 'box') {
    style += ',BackColour=&H80000000,BorderStyle=4';
  }
  
  return style;
}

// Export video with captions using FFmpeg subtitles filter
export async function exportVideoWithCaptions(
  video: Video,
  captions: Caption[],
  settings: ExportSettings,
  userPlan?: string
): Promise<{ outputPath: string; filename: string }> {
  await ensureDirsExist();
  
  // Generate a unique filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFilename = `${path.basename(video.filename, path.extname(video.filename))}_captioned_${timestamp}.${settings.format}`;
  const outputPath = path.join(processedDir, outputFilename);
  
  // Generate subtitle file
  const subtitlePath = await generateSubtitleFile(captions, settings);
  
  // Get quality and resolution settings
  const qualitySettings = getQualitySettings(settings.quality);
  const resolutionSettings = getResolutionSettings(settings.resolution);
  
  // Get subtitle style
  const subtitleStyle = getSubtitleStyle(settings);
  
  // システムフォント方式：確実な日本語表示のためフォントファイル指定なし
  // const fontPath = path.join(process.cwd(), 'fonts', 'NotoSansJP-Regular.ttf');
  
  // キャプションが存在しない場合のエラーハンドリング
  if (!captions || captions.length === 0) {
    throw new Error('キャプションが見つかりません。先にAIテロップ生成を実行してください。');
  }

  // ASSファイルを生成して確実な日本語表示を実現
  const assFilePath = await generateAssSubtitleFile(captions, settings);
  
  // プラン別透かし機能
  console.log("Watermark check - User plan:", userPlan);
  let videoFilter = '';
  const fontsDir = path.join(process.cwd(), 'fonts');
  
  // Freeプランまたは未認証の場合は透かしを追加
  if (userPlan === 'free' || !userPlan) {
    console.log("Adding watermark for free plan user");
    const watermarkText = 'Created with Subbit';
    videoFilter = `drawtext=text='${watermarkText}':fontcolor=white:fontsize=28:x=w-text_w-20:y=20:shadowcolor=black:shadowx=2:shadowy=2,ass=${assFilePath}:fontsdir=${fontsDir}`;
    console.log("Video filter with watermark:", videoFilter);
  } else {
    console.log("Premium user - no watermark added");
    videoFilter = `ass=${assFilePath}:fontsdir=${fontsDir}`;
    console.log("Video filter without watermark:", videoFilter);
  }
  
  // 解像度フィルターと組み合わせ
  if (resolutionSettings) {
    const resFilter = resolutionSettings.replace('-vf ', '');
    videoFilter = `${resFilter},${videoFilter}`;
  }
  
  return new Promise((resolve, reject) => {
    const command = ffmpeg(video.originalPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .addOption('-vf', videoFilter);
    
    // 品質設定を追加
    if (qualitySettings) {
      command.addOptions(qualitySettings.split(' '));
    }
    
    command
      .on('start', (commandLine: any) => {
        console.log('FFmpeg started:', commandLine);
      })
      .on('progress', (progress: any) => {
        console.log(`Export progress: ${progress.percent ? Math.round(progress.percent) : 0}%`);
      })
      .on('end', async () => {
        console.log('✅ Video export completed');
        // SRTファイルをクリーンアップ
        try {
          await unlink(subtitlePath);
        } catch (cleanupError) {
          console.log('SRT cleanup warning:', cleanupError);
        }
        resolve({
          outputPath,
          filename: outputFilename
        });
      })
      .on('error', async (err: any) => {
        console.error('❌ FFmpeg error:', err);
        // SRTファイルをクリーンアップ
        try {
          await unlink(subtitlePath);
        } catch (cleanupError) {
          console.log('SRT cleanup warning:', cleanupError);
        }
        reject(new Error('Failed to export video with captions'));
      })
      .run();
  });
}