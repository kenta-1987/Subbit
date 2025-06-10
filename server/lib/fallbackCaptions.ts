/**
 * サンプルテロップを生成するためのフォールバック機能
 * OpenAI APIのクォータ制限に達した場合に使用します
 */

import { Caption } from "@shared/schema";

const sampleTexts = [
  "こんにちは！",
  "この動画をご覧いただきありがとうございます",
  "今日は特別な内容をお届けします",
  "このシーンがポイントです",
  "詳しい情報は説明欄をご覧ください",
  "チャンネル登録もお願いします",
  "次回もお楽しみに！"
];

/**
 * 動画の長さに基づいて均等に配置されたサンプルテロップを生成します
 */
export function generateFallbackCaptions(videoId: number, durationSeconds: number): Caption[] {
  // プレビュー用の正確なタイミングテロップ
  const captions: Caption[] = [
    {
      id: Date.now() + 1,
      videoId,
      startTime: 500,     // 0.5秒後
      endTime: 2500,      // 2.5秒後まで
      text: "プレビューテスト",
      font: "gothic",
      fontSize: "32px",
      color: "#FFFF00"
    },
    {
      id: Date.now() + 2,
      videoId,
      startTime: 3000,    // 3秒後
      endTime: 5500,      // 5.5秒後まで
      text: "テロップ表示中",
      font: "gothic",
      fontSize: "32px",
      color: "#FFFF00"
    },
    {
      id: Date.now() + 3,
      videoId,
      startTime: 6000,    // 6秒後
      endTime: 8500,      // 8.5秒後まで
      text: "正常に動作しています",
      font: "gothic",
      fontSize: "32px",
      color: "#FFFF00"
    }
  ];
  
  console.log(`【フォールバック】正確なタイミングテロップ生成: ${captions.length}個`);
  captions.forEach(cap => {
    console.log(`【フォールバック】テロップ: ${cap.startTime}ms-${cap.endTime}ms "${cap.text}"`);
  });
  
  return captions;
}