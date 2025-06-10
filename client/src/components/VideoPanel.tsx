import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipForward, SkipBack, Volume2 } from "lucide-react";
import type { CaptionData } from "@shared/schema";

interface VideoPanelProps {
  videoUrl?: string;
  captions: CaptionData[];
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  playerRef: React.RefObject<HTMLVideoElement>;
  onPlayPause: () => void;
  onSkipForward: () => void;
  onSkipBackward: () => void;
  onTimeUpdate: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (time: number) => void;
  selectedCaptionId?: number;
  captionStyle?: {
    hasBackground: boolean;
    size: string;
    color: string;
  };
  editedCaptionColor?: string;
  editedCaptionSize?: string;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoPanel({
  videoUrl,
  captions,
  currentTime,
  duration,
  isPlaying,
  volume,
  playerRef,
  onPlayPause,
  onSkipForward,
  onSkipBackward,
  onTimeUpdate,
  onVolumeChange,
  onSeek,
  selectedCaptionId,
  captionStyle = { hasBackground: true, size: "medium", color: "#FFFFFF" },
  editedCaptionColor,
  editedCaptionSize
}: VideoPanelProps) {
  const [currentCaption, setCurrentCaption] = useState<CaptionData | null>(null);
  
  // Find the current caption based on the current time
  useEffect(() => {
    const timeMs = currentTime * 1000; // Convert seconds to milliseconds
    console.log("Current time (ms):", timeMs);
    console.log("Available captions:", captions);
    
    const activeCaption = captions.find(
      caption => timeMs >= caption.startTime && timeMs <= caption.endTime
    ) || null;
    
    console.log("Active caption:", activeCaption);
    setCurrentCaption(activeCaption);
  }, [currentTime, captions]);
  
  // Generate timeline labels
  const generateTimelineLabels = () => {
    if (!duration) return [];
    
    const labels = [];
    const interval = Math.floor(duration / 6); // 6 labels across the timeline
    
    for (let i = 0; i <= 6; i++) {
      labels.push(formatTime(i * interval));
    }
    
    return labels;
  };
  
  const timelineLabels = generateTimelineLabels();
  
  // Handle progress bar click
  const handleProgressClick = (value: number[]) => {
    onSeek(value[0]);
  };
  
  return (
    <div className="video-panel w-full md:w-3/5 bg-white rounded-lg shadow-md overflow-hidden">
      <div className="bg-black aspect-video relative">
        {videoUrl ? (
          <video
            ref={playerRef}
            src={videoUrl}
            className="w-full h-full object-contain"
            onTimeUpdate={onTimeUpdate}
            controls={true}
            preload="metadata"
            crossOrigin="anonymous"
            onLoadedData={() => {
              console.log("✅ 動画データ読み込み完了");
            }}
            onCanPlay={() => {
              console.log("✅ 動画再生準備完了:", videoUrl);
            }}
            onError={(e) => {
              const target = e.currentTarget;
              console.error("🔴 動画読み込みエラー:", e);
              console.error("🔴 エラー詳細:", target.error);
              console.log("🔴 動画URL:", videoUrl);
              console.log("🔴 ネットワーク状態:", target.networkState);
              console.log("🔴 Ready状態:", target.readyState);
              if (target.error) {
                console.log("🔴 エラーコード:", target.error.code);
                console.log("🔴 エラーメッセージ:", target.error.message);
                const errorMessages = {
                  1: "MEDIA_ERR_ABORTED - ユーザーによって中断されました",
                  2: "MEDIA_ERR_NETWORK - ネットワークエラーが発生しました", 
                  3: "MEDIA_ERR_DECODE - デコードエラーが発生しました",
                  4: "MEDIA_ERR_SRC_NOT_SUPPORTED - メディア形式がサポートされていません"
                };
                console.log("🔴 エラー説明:", errorMessages[target.error.code as keyof typeof errorMessages] || "不明なエラー");
              }
            }}
            onLoadStart={() => {
              console.log("動画読み込み開始:", videoUrl);
            }}
            onLoadedMetadata={() => {
              console.log("動画メタデータ読み込み完了");
              if (playerRef.current) {
                const videoDuration = playerRef.current.duration;
                if (videoDuration && isFinite(videoDuration)) {
                  console.log("継続時間を更新:", videoDuration);
                  onTimeUpdate();
                }
              }
            }}
            muted={false}
            playsInline
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white">
            動画を読み込み中...
          </div>
        )}
        
        {/* Caption display overlay */}
        <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none" style={{zIndex: 10}}>
          {currentCaption ? (
            <div 
              className="inline-block px-4 py-2 rounded font-medium transition-all duration-300"
              style={{
                backgroundColor: captionStyle.hasBackground ? 'rgba(0, 0, 0, 0.8)' : 'transparent',
                color: selectedCaptionId === currentCaption.id ? 
                  (editedCaptionColor || currentCaption.color || '#FFFFFF') : 
                  (currentCaption.color || '#FFFFFF'),
                fontSize: selectedCaptionId === currentCaption.id ? 
                  (editedCaptionSize === 'small' ? '12px' : editedCaptionSize === 'large' ? '16px' : '14px') :
                  (currentCaption.fontSize === 'small' ? '12px' : currentCaption.fontSize === 'large' ? '16px' : '14px'),
                fontFamily: '"Noto Sans CJK JP", "Noto Sans JP", sans-serif',
                textShadow: captionStyle.hasBackground ? 'none' : '2px 2px 4px rgba(0,0,0,0.8)',
                border: captionStyle.hasBackground ? '1px solid rgba(255,255,255,0.2)' : 'none',
              }}
            >
              {currentCaption.text}
            </div>
          ) : null}
        </div>
      </div>

      {/* Video Controls */}
      <div className="p-4 space-y-4">
        {/* Control buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={onSkipBackward}
            disabled={!duration || currentTime <= 0}
            className="w-10 h-10"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onPlayPause}
            className="w-12 h-12"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={onSkipForward}
            disabled={!duration || currentTime >= duration}
            className="w-10 h-10"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>

        {/* Volume control */}
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          <Slider
            value={[volume]}
            onValueChange={(value) => onVolumeChange(value[0])}
            max={1}
            step={0.1}
            className="flex-1"
          />
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Slider
            value={[duration > 0 ? currentTime : 0]}
            onValueChange={handleProgressClick}
            max={duration || 100}
            step={0.1}
            className="w-full"
          />
          
          {/* Timeline labels */}
          <div className="flex justify-between text-xs text-gray-500">
            {timelineLabels.map((label, index) => (
              <span key={index}>{label}</span>
            ))}
          </div>
        </div>

        {/* Current time display */}
        <div className="flex justify-between text-sm text-gray-600">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Caption timeline visualization */}
        <div className="relative h-6 bg-gray-200 rounded">
          {captions.map((caption) => {
            const startPercent = duration > 0 ? (caption.startTime / 1000 / duration) * 100 : 0;
            const widthPercent = duration > 0 ? ((caption.endTime - caption.startTime) / 1000 / duration) * 100 : 0;
            
            return (
              <div
                key={caption.id}
                className={`absolute h-full rounded transition-colors cursor-pointer ${
                  selectedCaptionId === caption.id ? 'bg-blue-500' : 'bg-blue-300'
                }`}
                style={{
                  left: `${startPercent}%`,
                  width: `${widthPercent}%`,
                }}
                onClick={() => onSeek(caption.startTime / 1000)}
                title={caption.text}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

