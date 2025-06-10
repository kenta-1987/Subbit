import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Undo2, Download, Home } from "lucide-react";
import VideoPanel from "./VideoPanel";
import EditorPanel from "./EditorPanel";
import { useQuery } from "@tanstack/react-query";
import { getVideo, getCaptions } from "@/lib/api";
import useVideoPlayer from "@/hooks/useVideoPlayer";
import { CaptionData } from "@shared/schema";

interface EditorWorkspaceProps {
  videoId: number | null;
  onExport: () => void;
  onHome?: () => void;
}

export default function EditorWorkspace({ videoId, onExport, onHome }: EditorWorkspaceProps) {
  const [selectedCaptionId, setSelectedCaptionId] = useState<number | null>(null);
  const [editedCaptionColor, setEditedCaptionColor] = useState<string>("");
  const [editedCaptionSize, setEditedCaptionSize] = useState<string>("");
  const [editedCaptionBackground, setEditedCaptionBackground] = useState<boolean>(true);
  
  // Undo functionality state
  const [undoStack, setUndoStack] = useState<Array<{
    captionId: number;
    color: string;
    size: string;
    background: boolean;
  }>>([]);
  
  // Dynamic caption style based on edited values
  const captionStyle = {
    hasBackground: editedCaptionBackground,
    size: editedCaptionSize || "small",
    color: editedCaptionColor || "#FFFFFF"
  };
  
  // Fetch video details
  const { data: video } = useQuery({
    queryKey: ['/api/videos', videoId],
    queryFn: () => videoId ? getVideo(videoId) : null,
    enabled: !!videoId
  });
  
  // Fetch captions
  const { data: fetchedCaptions = [] } = useQuery({
    queryKey: ['/api/captions', videoId],
    queryFn: () => videoId ? getCaptions(videoId) : [],
    enabled: !!videoId
  });

  // サンプルのキャプションデータ（APIからデータが取得できない場合用）
  const sampleCaptions: CaptionData[] = [
    {
      id: 9001,
      videoId: videoId || 1,
      startTime: 0, // 0秒から
      endTime: 4000, // 4秒まで
      text: "これはサンプルキャプションです",
      font: "gothic",
      fontSize: "small",
      color: "#FFFFFF"
    },
    {
      id: 9002,
      videoId: videoId || 1,
      startTime: 4000, // 4秒から
      endTime: 7000, // 7秒まで
      text: "動画にテロップを追加できます",
      font: "gothic",
      fontSize: "small",
      color: "#FFFFFF"
    },
    {
      id: 9003,
      videoId: videoId || 1,
      startTime: 7000, // 7秒から
      endTime: 10000, // 10秒まで
      text: "テロップの表示時間も編集できます",
      font: "gothic",
      fontSize: "small",
      color: "#FFFFFF"
    }
  ];

  // 取得したキャプションがない場合はサンプルデータを使用
  const captions = fetchedCaptions.length > 0 ? fetchedCaptions : sampleCaptions;
  
  // Video player controls
  const {
    playerRef,
    currentTime,
    duration,
    isPlaying,
    volume,
    playPause,
    skipForward,
    skipBackward,
    handleTimeUpdate,
    handleVolumeChange,
    handleSeek
  } = useVideoPlayer();
  
  // Get selected caption
  const selectedCaption = captions.find(c => c.id === selectedCaptionId) || null;
  
  // Handle caption selection
  const handleSelectCaption = (caption: CaptionData) => {
    setSelectedCaptionId(caption.id);
    handleSeek(caption.startTime / 1000); // Convert ms to seconds
  };

  // Handle edit changes and save to undo stack
  const handleEditChange = (color: string, size: string, hasBackground?: boolean) => {
    if (selectedCaptionId) {
      // Save current state to undo stack before changing
      setUndoStack(prev => [...prev, {
        captionId: selectedCaptionId,
        color: editedCaptionColor,
        size: editedCaptionSize,
        background: editedCaptionBackground
      }]);
    }
    
    setEditedCaptionColor(color);
    setEditedCaptionSize(size);
    if (hasBackground !== undefined) {
      setEditedCaptionBackground(hasBackground);
    }
  };

  // Handle undo functionality
  const handleUndo = () => {
    if (undoStack.length > 0) {
      const lastState = undoStack[undoStack.length - 1];
      setEditedCaptionColor(lastState.color);
      setEditedCaptionSize(lastState.size);
      setEditedCaptionBackground(lastState.background);
      setSelectedCaptionId(lastState.captionId);
      
      // Remove the last state from undo stack
      setUndoStack(prev => prev.slice(0, -1));
    }
  };
  
  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
        <h2 className="text-xl sm:text-2xl font-semibold">テロップエディタ</h2>
        <div className="flex gap-2 w-full sm:w-auto">
          {onHome && (
            <Button 
              variant="outline" 
              className="flex-1 sm:flex-none"
              onClick={onHome}
            >
              <Home className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">ホーム</span>
              <span className="sm:hidden">ホーム</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            className="flex-1 sm:flex-none"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
          >
            <Undo2 className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">元に戻す</span>
            <span className="sm:hidden">元に戻す</span>
          </Button>
          <Button 
            variant="default" 
            className="bg-accent hover:bg-amber-600 text-neutral-800 flex-1 sm:flex-none"
            onClick={onExport}
          >
            <Download className="h-4 w-4 mr-1" />
            エクスポート
          </Button>
        </div>
      </div>
      
      <div className="workspace-container flex flex-col md:flex-row gap-6">
        <VideoPanel 
          videoUrl={videoId ? `/api/videos/${videoId}/stream` : undefined}
          captions={captions}
          currentTime={currentTime}
          duration={duration}
          isPlaying={isPlaying}
          volume={volume}
          playerRef={playerRef}
          onPlayPause={playPause}
          onSkipForward={skipForward}
          onSkipBackward={skipBackward}
          onTimeUpdate={handleTimeUpdate}
          onVolumeChange={handleVolumeChange}
          onSeek={handleSeek}
          selectedCaptionId={selectedCaptionId}
          captionStyle={captionStyle}
          editedCaptionColor={editedCaptionColor}
          editedCaptionSize={editedCaptionSize}
        />
        
        <EditorPanel 
          captions={captions}
          selectedCaption={selectedCaption}
          onSelectCaption={handleSelectCaption}
          videoId={videoId}
          onEditChange={handleEditChange}
        />
      </div>
    </section>
  );
}
