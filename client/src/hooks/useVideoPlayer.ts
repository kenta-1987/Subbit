import { useState, useRef, useEffect } from "react";

export default function useVideoPlayer() {
  const playerRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handleDurationChange = () => {
      setDuration(player.duration || 0);
    };
    
    const handlePlay = () => {
      setIsPlaying(true);
    };
    
    const handlePause = () => {
      setIsPlaying(false);
    };

    player.addEventListener("loadedmetadata", handleDurationChange);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    
    return () => {
      player.removeEventListener("loadedmetadata", handleDurationChange);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
    };
  }, []);

  const handleTimeUpdate = () => {
    const player = playerRef.current;
    if (!player) return;
    setCurrentTime(player.currentTime);
    
    // Update duration if it wasn't set yet
    if (duration === 0 && player.duration && isFinite(player.duration)) {
      setDuration(player.duration);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    const player = playerRef.current;
    if (!player) return;
    
    try {
      player.volume = Math.max(0, Math.min(1, newVolume));
      setVolume(newVolume);
    } catch (error) {
      console.error("音量設定エラー:", error);
    }
  };

  const playPause = async () => {
    const player = playerRef.current;
    if (!player) return;

    try {
      if (isPlaying) {
        player.pause();
        setIsPlaying(false);
      } else {
        // Wait for video to be ready if needed
        if (player.readyState < 2) {
          console.log("動画がまだ準備できていません - 読み込み待機中...");
          // Wait for loadeddata event
          await new Promise((resolve) => {
            const handleLoaded = () => {
              player.removeEventListener('loadeddata', handleLoaded);
              resolve(undefined);
            };
            player.addEventListener('loadeddata', handleLoaded);
            // Also trigger a load if needed
            player.load();
          });
        }
        
        const playPromise = player.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      }
    } catch (error) {
      console.error("動画再生エラー:", error);
      setIsPlaying(false);
    }
  };

  const skipForward = () => {
    const player = playerRef.current;
    if (!player) return;
    
    // Check if duration and currentTime are valid numbers
    if (isNaN(player.duration) || isNaN(player.currentTime) || !isFinite(player.duration)) {
      console.warn("Invalid duration or currentTime for skip forward");
      return;
    }
    
    const newTime = Math.min(player.duration, player.currentTime + 5);
    if (isFinite(newTime)) {
      player.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const skipBackward = () => {
    const player = playerRef.current;
    if (!player) return;
    
    // Check if currentTime is valid
    if (isNaN(player.currentTime) || !isFinite(player.currentTime)) {
      console.warn("Invalid currentTime for skip backward");
      return;
    }
    
    const newTime = Math.max(0, player.currentTime - 5);
    if (isFinite(newTime)) {
      player.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeek = (time: number) => {
    const player = playerRef.current;
    if (!player) return;
    
    // Validate the time value
    if (!isFinite(time) || isNaN(time) || time < 0) {
      console.warn("Invalid time value for seek:", time);
      return;
    }
    
    // Ensure time doesn't exceed duration
    const maxTime = isFinite(player.duration) ? player.duration : time;
    const seekTime = Math.min(time, maxTime);
    
    player.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  return {
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
  };
}
