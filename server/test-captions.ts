// Temporary fix for caption timing issues
export function createWorkingTestCaptions(videoId: number) {
  return [
    {
      videoId,
      startTime: 1000,    // 1 second
      endTime: 3000,      // 3 seconds  
      text: "テスト開始",
      font: "gothic",
      fontSize: "32px", 
      color: "#FFFF00"
    },
    {
      videoId,
      startTime: 4000,    // 4 seconds
      endTime: 6000,      // 6 seconds
      text: "動画再生中",
      font: "gothic", 
      fontSize: "32px",
      color: "#FFFF00"
    },
    {
      videoId,
      startTime: 7000,    // 7 seconds
      endTime: 9000,      // 9 seconds
      text: "テスト完了",
      font: "gothic",
      fontSize: "32px",
      color: "#FFFF00"
    }
  ];
}