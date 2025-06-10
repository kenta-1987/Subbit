import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/videoUtils";
import { CaptionData } from "@shared/schema";

interface VideoPreviewProps {
  videoUrl?: string;
  captions: CaptionData[];
}

export default function VideoPreview({ videoUrl, captions }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [currentCaption, setCurrentCaption] = useState<CaptionData | null>(null);

  // Update current caption based on time
  useEffect(() => {
    const timeMs = currentTime * 1000;
    const activeCaption = captions.find(
      caption => timeMs >= caption.startTime && timeMs <= caption.endTime
    ) || null;
    setCurrentCaption(activeCaption);
  }, [currentTime, captions]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0] / 100;
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Container */}
      <div className="bg-black aspect-video relative">
        {videoUrl ? (
          <>
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls={false}
              preload="metadata"
            >
              <source src={videoUrl} type="video/mp4" />
              <source src={videoUrl} type="video/quicktime" />
              お使いのブラウザは動画再生をサポートしていません
            </video>

            {/* リアルタイム テロップ表示 */}
            {currentCaption && (
              <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                <div 
                  className="inline-block px-6 py-3 rounded-lg font-bold transition-all duration-500 ease-in-out"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    color: currentCaption.color || '#FFFFFF',
                    fontSize: currentCaption.fontSize || '28px',
                    fontFamily: currentCaption.font === 'gothic' ? '"Hiragino Kaku Gothic Pro", "ヒラギノ角ゴ Pro", "Yu Gothic Medium", "游ゴシック Medium", YuGothic, "游ゴシック体", "Noto Sans JP", sans-serif' : 
                                currentCaption.font === 'mincho' ? '"Hiragino Mincho Pro", "ヒラギノ明朝 Pro", "Yu Mincho", "游明朝", YuMincho, "游明朝体", "Noto Serif JP", serif' : 
                                '"Rounded M+ 1c", "M PLUS Rounded 1c", sans-serif',
                    textShadow: '2px 2px 4px rgba(0,0,0,0.9), -1px -1px 2px rgba(255,255,255,0.1)',
                    border: '2px solid rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(4px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    maxWidth: '90%',
                    wordBreak: 'keep-all',
                    lineHeight: '1.3'
                  }}
                >
                  {currentCaption.text}
                </div>
              </div>
            )}

            {/* プレビュー表示案内 */}
            {!currentCaption && captions.length > 0 && (
              <div className="absolute bottom-8 left-0 right-0 text-center pointer-events-none">
                <div className="inline-block px-4 py-2 rounded bg-black bg-opacity-50 text-white text-sm border border-white border-opacity-30">
                  🎬 プレビュー: 再生するとテロップが表示されます
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <div className="text-6xl mb-4 opacity-30">🎬</div>
              <p className="opacity-50">動画プレビュー</p>
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="p-6 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <div className="text-gray-600 text-sm font-medium">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handlePlayPause}
              className="text-gray-700 hover:text-blue-600 hover:bg-blue-50"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <Volume2 className="h-4 w-4 text-gray-500" />
            <Slider
              className="w-20"
              value={[volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
            />
          </div>
        </div>
        
        {/* Progress Bar */}
        <Slider
          className="w-full mb-4"
          min={0}
          max={duration || 100}
          step={0.1}
          value={[currentTime]}
          onValueChange={handleSeek}
        />

        {/* Caption Info */}
        {captions.length > 0 && (
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
              <span className="mr-2">💬</span>
              {captions.length}個のテロップが表示されます
            </div>
          </div>
        )}
      </div>
    </div>
  );
}