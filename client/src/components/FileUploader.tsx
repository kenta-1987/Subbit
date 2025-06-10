import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

import { uploadFileInChunks } from "@/lib/chunkUpload";
import useVideoState from "@/hooks/useVideoState";

interface FileUploaderProps {
  onUploadStart: () => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024; // チャンク分割対応で5GBまで
const ACCEPTED_FILE_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/x-ms-wmv"];
const ACCEPTED_FILE_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv", ".wmv"];

export default function FileUploader({ onUploadStart }: FileUploaderProps) {
  console.log("🚀 FileUploader CHUNK VERSION 2.0 - CACHE CLEARED");
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { setVideoId } = useVideoState();

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "ファイルサイズエラー",
        description: "ファイルサイズは5GB以下にしてください。",
        variant: "destructive"
      });
      return false;
    }

    // Check file type
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !ACCEPTED_FILE_EXTENSIONS.map(ext => ext.substring(1)).includes(extension)) {
        toast({
          title: "ファイル形式エラー",
          description: "サポートされるファイル形式: MP4, MOV, AVI, MKV, WMV",
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleFiles = async (fileList: FileList) => {
    console.log("🔥 handleFiles called with", fileList.length, "files");
    const file = fileList[0];
    console.log("🔥 Selected file:", file.name, "size:", file.size);
    
    if (!validateFile(file)) {
      console.log("🔥 File validation failed");
      return;
    }
    
    console.log("🔥 File validation passed, starting upload...");

    try {
      // アップロード開始を設定
      setIsUploading(true);
      setUploadProgress(0);
      
      // アップロード開始を通知
      toast({
        title: "アップロード開始",
        description: `ファイル「${file.name}」のアップロードを開始しました (${Math.round(file.size/1024/1024)}MB)`,
      });
      
      console.log("⭐ FileUploader: チャンク分割アップロード開始");
      console.log("Uploading file:", file.name, "size:", file.size, "type:", file.type);
      
      // チャンク分割アップロードを使用
      console.log("⭐ FileUploader: uploadFileInChunks を呼び出し中...");
      const result = await uploadFileInChunks({
        file,
        onProgress: (progress) => {
          setUploadProgress(progress);
          console.log(`Upload progress: ${progress}%`);
        },
        onError: (error) => {
          console.error("Chunk upload error:", error);
          throw error;
        }
      });
      
      if (!result.success || !result.videoId) {
        throw new Error(result.error || "アップロードに失敗しました");
      }
      
      console.log("Chunk upload successful, video ID:", result.videoId);
      setVideoId(parseInt(result.videoId || "0"));
      
      toast({
        title: "アップロード成功",
        description: "ファイルのアップロードが完了しました",
      });
      
      // アップロード完了
      setIsUploading(false);
      onUploadStart();
    } catch (error) {
      console.error("Upload error:", error);
      setIsUploading(false);
      
      // 体験版制限エラーの特別処理
      if (error instanceof Error && error.message.includes("体験版")) {
        toast({
          title: "体験版制限",
          description: error.message,
          variant: "destructive",
          action: (
            <Button variant="outline" size="sm" onClick={() => {
              window.location.href = "/api/login";
            }}>
              アカウント登録
            </Button>
          )
        });
      } else {
        toast({
          title: "アップロードエラー",
          description: error instanceof Error ? error.message : "ファイルのアップロード中にエラーが発生しました。",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <div
      className={`upload-area rounded-lg p-10 text-center mb-6 ${
        isUploading 
          ? "border-primary border-2 bg-primary/5" 
          : isDragOver 
            ? "border-primary bg-primary/5 cursor-pointer border-2" 
            : "border-neutral-400 border-dashed border-2 cursor-pointer"
      }`}
      onClick={isUploading ? undefined : () => {
        console.log("🔥 Upload area clicked, opening file dialog");
        fileInputRef.current?.click();
      }}
      onDragOver={isUploading ? undefined : handleDragOver}
      onDragLeave={isUploading ? undefined : handleDragLeave}
      onDrop={isUploading ? undefined : handleDrop}
    >
      {isUploading ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium">アップロード中...</h3>
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
          <p className="text-neutral-500">{Math.round(uploadProgress)}% 完了</p>
          <p className="text-sm text-neutral-400">大きなファイルの場合は時間がかかることがあります</p>
        </div>
      ) : (
        <>
          <Upload className="h-16 w-16 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">ファイルをドラッグ＆ドロップ</h3>
          <p className="text-neutral-500 mb-4">または</p>
          <Button>ファイルを選択</Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="video/*"
            onChange={handleFileSelect}
          />
          <p className="text-neutral-400 text-sm mt-4">対応形式: MP4, MOV, AVI, MKV, WMV</p>
        </>
      )}
    </div>
  );
}
