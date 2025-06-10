export interface ChunkUploadOptions {
  file: File;
  chunkSize?: number;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface ChunkUploadResult {
  success: boolean;
  videoId?: string;
  error?: string;
}

console.log("🚀 chunkUpload.ts initialized");

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks for better stability
const MAX_RETRIES = 3;
const CHUNK_TIMEOUT = 120000; // 2 minutes timeout per chunk

export async function uploadFileInChunks({
  file,
  chunkSize = DEFAULT_CHUNK_SIZE,
  onProgress,
  onError
}: ChunkUploadOptions): Promise<ChunkUploadResult> {
  try {
    console.log(`🚀 チャンク分割アップロード開始: ${file.name}, サイズ: ${file.size} bytes`);
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0;

    console.log(`📦 総チャンク数: ${totalChunks}, チャンクサイズ: ${chunkSize} bytes`);

    // Initialize upload session
    console.log('🔧 アップロードセッション初期化中...');
    const initResponse = await fetch('/api/videos/upload/init', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileSize: file.size,
        totalChunks,
        mimeType: file.type
      })
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error('❌ 初期化エラー:', {
        status: initResponse.status,
        statusText: initResponse.statusText,
        errorText,
        url: initResponse.url
      });
      throw new Error(`アップロードの初期化に失敗しました (${initResponse.status}: ${errorText})`);
    }

    const { uploadId } = await initResponse.json();
    console.log('✅ アップロードセッション作成成功:', uploadId);

    // Upload chunks with retry and timeout
    console.log('📤 チャンクアップロード開始...');
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);

      console.log(`📦 チャンク ${chunkIndex + 1}/${totalChunks} アップロード中... (${chunk.size} bytes)`);

      let retryCount = 0;
      let chunkUploaded = false;

      while (retryCount < MAX_RETRIES && !chunkUploaded) {
        try {
          const formData = new FormData();
          formData.append('chunk', chunk);
          formData.append('uploadId', uploadId);
          formData.append('chunkIndex', chunkIndex.toString());
          formData.append('totalChunks', totalChunks.toString());

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), CHUNK_TIMEOUT);

          const chunkResponse = await fetch('/api/videos/upload/chunk', {
            method: 'POST',
            body: formData,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!chunkResponse.ok) {
            const errorText = await chunkResponse.text();
            throw new Error(`HTTP ${chunkResponse.status}: ${errorText}`);
          }

          chunkUploaded = true;
          uploadedChunks++;
          const progress = (uploadedChunks / totalChunks) * 100;
          console.log(`✅ チャンク ${chunkIndex + 1} 完了 (進捗: ${progress.toFixed(1)}%)`);
          onProgress?.(progress);

        } catch (error) {
          retryCount++;
          console.warn(`⚠️ チャンク ${chunkIndex + 1} 失敗 (試行 ${retryCount}/${MAX_RETRIES}):`, error);
          
          if (retryCount >= MAX_RETRIES) {
            console.error(`❌ チャンク ${chunkIndex + 1} 最大試行回数に達しました`);
            throw new Error(`チャンク ${chunkIndex + 1} のアップロードに失敗しました（${MAX_RETRIES}回試行）`);
          }
          
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
    }

    // Finalize upload
    const finalizeResponse = await fetch('/api/videos/upload/finalize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uploadId })
    });

    if (!finalizeResponse.ok) {
      throw new Error('アップロードの完了処理に失敗しました');
    }

    const result = await finalizeResponse.json();
    return {
      success: true,
      videoId: result.videoId
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'アップロードに失敗しました';
    onError?.(new Error(errorMessage));
    return {
      success: false,
      error: errorMessage
    };
  }
}