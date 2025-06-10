import { apiRequest } from "./queryClient";
import type { 
  Video, 
  CaptionData, 
  VideoStatusResponse,
  ExportSettings
} from "@shared/schema";

// Upload a video file with progress tracking
export const uploadVideo = async (
  file: File, 
  onProgress?: (progress: number) => void
): Promise<Video> => {
  const formData = new FormData();
  formData.append("video", file);

  console.log("Sending upload request with file:", file.name);

  try {
    // Use XMLHttpRequest to track upload progress
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          onProgress(percentComplete);
          console.log(`Upload progress: ${percentComplete}%`);
        }
      });
      
      // Handle completed upload
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            console.log("Upload response data:", data);
            resolve(data);
          } catch (error) {
            reject(new Error("Invalid response format"));
          }
        } else {
          let errorMessage;
          try {
            const errorData = JSON.parse(xhr.responseText);
            errorMessage = errorData.error || `Upload failed: ${xhr.statusText}`;
          } catch (e) {
            errorMessage = `Upload failed: ${xhr.statusText || xhr.responseText || "Unknown error"}`;
          }
          reject(new Error(errorMessage));
        }
      });
      
      // Handle network errors
      xhr.addEventListener("error", () => {
        reject(new Error("Network error occurred during upload"));
      });
      
      // Handle aborted uploads
      xhr.addEventListener("abort", () => {
        reject(new Error("Upload was aborted"));
      });
      
      // Set up and send the request
      xhr.open("POST", "/api/videos/upload");
      xhr.send(formData);
    });
  } catch (error) {
    console.error("Upload request failed:", error);
    throw error;
  }
};

// Get video details
export const getVideo = async (id: number): Promise<Video> => {
  const response = await fetch(`/api/videos/${id}`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  return response.json();
};

// Get video processing status
export const getVideoStatus = async (id: number): Promise<VideoStatusResponse> => {
  try {
    const response = await fetch(`/api/videos/${id}/status`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || response.statusText || 'Unknown error';
      throw new Error(errorMessage);
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching video status for ID ${id}:`, error);
    // エラーを再スローするが、より詳細な情報を含める
    throw new Error(`動画の処理状況の取得に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
  }
};

// Get captions for a video
export const getCaptions = async (videoId: number): Promise<CaptionData[]> => {
  const response = await fetch(`/api/videos/${videoId}/captions`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || response.statusText);
  }
  return response.json();
};

// Update a caption
export const updateCaption = async (
  captionId: number, 
  data: Partial<CaptionData>
): Promise<CaptionData> => {
  const res = await apiRequest("PATCH", `/api/captions/${captionId}`, data);
  return res.json();
};

// Delete a caption
export const deleteCaption = async (captionId: number): Promise<void> => {
  await apiRequest("DELETE", `/api/captions/${captionId}`);
};

// Export video with captions
export const exportVideo = async (
  videoId: number, 
  settings: ExportSettings
): Promise<{ downloadUrl: string; filename: string }> => {
  const res = await apiRequest("POST", `/api/videos/${videoId}/export`, settings);
  return res.json();
};

// AIによるテロップ自動生成（話者検出機能付き）
export const generateAICaptions = async (
  videoId: number, 
  content?: string,
  options?: {
    enableSpeakerDetection?: boolean;
    language?: string;
  }
): Promise<CaptionData[]> => {
  const res = await apiRequest("POST", `/api/videos/${videoId}/generate-captions`, { 
    content,
    enableSpeakerDetection: options?.enableSpeakerDetection || false,
    language: options?.language || 'ja'
  });
  const data = await res.json();
  return data.captions;
};

// ChatGPTによるテロップリライト
export const rewriteCaption = async (
  captionId: number
): Promise<{ message: string; caption: CaptionData; originalText: string; rewrittenText: string }> => {
  const res = await apiRequest("POST", `/api/captions/${captionId}/rewrite`);
  return res.json();
};
