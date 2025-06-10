/**
 * Format seconds to HH:MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds)) {
    return "00:00";
  }
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hours = h > 0 ? `${h}:` : "";
  const minutes = m < 10 && h > 0 ? `0${m}:` : `${m}:`;
  const secs = s < 10 ? `0${s}` : `${s}`;
  
  return `${hours}${minutes}${secs}`;
}

/**
 * Format milliseconds to HH:MM:SS format for input display
 */
export function formatTimeInput(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    seconds.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Parse HH:MM:SS format to milliseconds
 */
export function parseTimeInput(timeStr: string): number {
  // Check if the format is correct
  const regex = /^(\d{1,2}):(\d{1,2}):(\d{1,2})$/;
  const match = timeStr.match(regex);
  
  if (!match) {
    throw new Error('Invalid time format. Use HH:MM:SS');
  }
  
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const seconds = parseInt(match[3], 10);
  
  // Validate each component
  if (minutes >= 60 || seconds >= 60) {
    throw new Error('Minutes and seconds must be less than 60');
  }
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}
