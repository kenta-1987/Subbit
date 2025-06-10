import OpenAI from "openai";
import { createReadStream, promises as fs } from "fs";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { SimpleSpeakerDetection } from './speakerDetectionNew';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const execAsync = promisify(exec);

interface TranscriptionSegment {
  start: number; // start time in seconds
  end: number;   // end time in seconds
  text: string;  // text content
}

interface SpeakerSegment {
  start: number;
  end: number;
  speakerId: number;
  confidence: number;
  text: string;
}

interface TranscriptionResult {
  duration: number; // total duration in seconds
  language: string; // detected language
  segments: TranscriptionSegment[];
  speakerDetection?: SpeakerSegment[];
}

// Check if file exists and get size
async function checkFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch (error) {
    throw new Error(`File not found or inaccessible: ${filePath}`);
  }
}

// Get audio file from video using FFmpeg
async function extractAudioFromVideo(videoPath: string): Promise<string> {
  // Check if input file exists and get size
  const fileSize = await checkFileSize(videoPath);
  console.log(`Input file size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);
  
  // Create a temporary directory for audio files if it doesn't exist
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const tempDir = path.join(__dirname, '..', '..', 'temp');
  
  await fs.mkdir(tempDir, { recursive: true });
  
  const outputPath = path.join(tempDir, `audio_${Date.now()}.mp3`);
  
  try {
    // More robust FFmpeg command with error handling for large files
    const command = `ffmpeg -i "${videoPath}" -vn -ar 22050 -ac 1 -b:a 64k -f mp3 "${outputPath}" -y`;
    console.log(`Extracting audio with command: ${command}`);
    
    const { stderr } = await execAsync(command, { 
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large files
      timeout: 300000 // 5 minute timeout
    });
    
    if (stderr && stderr.includes('Error')) {
      console.error("FFmpeg stderr:", stderr);
    }
    
    // Check if output file was created and has reasonable size
    const outputSize = await checkFileSize(outputPath);
    console.log(`Extracted audio size: ${(outputSize / (1024 * 1024)).toFixed(2)} MB`);
    
    if (outputSize === 0) {
      throw new Error("Audio extraction produced empty file");
    }
    
    return outputPath;
  } catch (error) {
    console.error("Failed to extract audio:", error);
    // Try to clean up failed output file
    try {
      await fs.unlink(outputPath);
    } catch {}
    throw new Error(`Failed to extract audio from video: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Transcribe audio file using Whisper API
export async function transcribeVideo(videoPath: string, options?: { language?: string; enableSpeakerDetection?: boolean }): Promise<TranscriptionResult> {
  try {
    // Extract audio from video
    const audioPath = await extractAudioFromVideo(videoPath);
    
    // Get video duration
    const { stdout: durationOutput } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
    );
    const duration = parseFloat(durationOutput.trim());
    
    // Transcribe with Whisper - リトライ機能付き
    const MAX_RETRIES = 3;
    let retries = 0;
    let transcription: any;
    
    while (retries < MAX_RETRIES) {
      try {
        // Check audio file size before sending to Whisper
        const audioSize = await checkFileSize(audioPath);
        const maxSizeMB = 25; // Whisper API limit is 25MB
        
        if (audioSize > maxSizeMB * 1024 * 1024) {
          throw new Error(`Audio file too large (${(audioSize / (1024 * 1024)).toFixed(2)}MB). Maximum size is ${maxSizeMB}MB.`);
        }
        
        console.log(`Sending ${(audioSize / (1024 * 1024)).toFixed(2)}MB audio file to Whisper API...`);
        
        const audioStream = createReadStream(audioPath);
        transcription = await openai.audio.transcriptions.create({
          file: audioStream,
          model: "whisper-1",
          response_format: "verbose_json",
          timestamp_granularities: ["segment"],
          language: options?.language || undefined
        });
        break; // 成功したらループを抜ける
      } catch (error: any) {
        retries++;
        console.log(`Transcription attempt ${retries} failed:`, error.message || error);
        
        if (retries >= MAX_RETRIES) {
          // 詳細なエラー情報を提供
          if (error.code === 'insufficient_quota') {
            throw new Error('OpenAI APIの利用制限に達しました。プランをアップグレードしてください。');
          } else if (error.code === 'invalid_api_key') {
            throw new Error('OpenAI APIキーが無効です。正しいAPIキーを設定してください。');
          } else if (error.status === 429) {
            throw new Error('OpenAI APIのレート制限に達しました。しばらく待ってから再試行してください。');
          } else {
            throw new Error(`音声認識に失敗しました: ${error.message || error}`);
          }
        }
        
        // 次のリトライまで少し待機
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Delete temp audio file
    await fs.unlink(audioPath).catch(err => {
      console.error("Failed to delete temp audio file:", err);
    });
    
    // Check if transcription was successful
    if (!transcription) {
      throw new Error("音声認識処理が完了しませんでした");
    }
    
    // Format the result
    const segments: TranscriptionSegment[] = [];
    
    if (transcription.segments) {
      for (const segment of transcription.segments) {
        segments.push({
          start: segment.start || 0,
          end: segment.end || 0,
          text: segment.text
        });
      }
    }
    
    let speakerDetection: SpeakerSegment[] | undefined;
    
    // 話者検出が有効な場合は実行
    console.log('🎤 話者検出設定チェック:', { 
      enableSpeakerDetection: options?.enableSpeakerDetection, 
      segmentsLength: segments.length,
      audioPath 
    });
    
    if (options?.enableSpeakerDetection && segments.length > 0) {
      console.log('🎤 話者検出を開始します...');
      try {
        const speakerEngine = new SimpleSpeakerDetection();
        speakerDetection = await speakerEngine.detectSpeakers(audioPath, segments);
        const uniqueSpeakers = new Set(speakerDetection.map(s => s.speakerId));
        console.log(`🎤 話者検出完了: ${uniqueSpeakers.size}人の話者を検出`);
        console.log('🎤 検出された話者セグメント:', speakerDetection.map(s => ({
          speakerId: s.speakerId,
          confidence: s.confidence,
          text: s.text.substring(0, 30) + '...'
        })));
      } catch (error) {
        console.warn('話者検出でエラーが発生しましたが、処理を続行します:', error);
        console.error('話者検出エラー詳細:', error);
        speakerDetection = undefined;
      }
    } else {
      console.log('🎤 話者検出スキップ - 設定無効または音声セグメントなし');
    }
    
    return {
      duration,
      language: transcription.language || "ja",
      segments,
      speakerDetection
    };
  } catch (error) {
    console.error("Transcription error:", error);
    throw new Error("Failed to transcribe video");
  }
}
