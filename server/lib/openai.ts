import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * 動画の内容に基づいて、適切なテロップを自動生成する
 * 
 * @param videoContent 動画の内容を表す説明文やキーワード
 * @param duration 動画の長さ（秒）
 * @returns 生成されたキャプションデータ
 */
export async function generateCaptions(videoContent: string, duration: number) {
  try {
    console.log("AIによるテロップ生成を開始...");
    console.log(`動画内容: ${videoContent}, 長さ: ${duration}秒`);

    // API使用量を抑えるため、キャプション数を制限
    const captionCount = Math.min(3, Math.floor(duration / 5));
    
    // 簡略化したプロンプト（トークン数削減）
    const prompt = `
動画のテロップを${captionCount}個生成してください。

動画内容: ${videoContent.substring(0, 100)}
長さ: ${duration}秒

JSON形式で返してください:
{
  "captions": [
    {
      "startTime": 開始時間（ミリ秒）,
      "endTime": 終了時間（ミリ秒）,
      "text": "テロップ"
    }
  ]
}

ガイドライン:
- 簡潔なテロップ（15文字以内）
- 表示時間は3秒
- 均等に配置
- 最初は0秒から開始
`;

    // OpenAI APIによるテロップ生成（低コスト設定）
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // より安価なモデルを使用
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.5,
      max_tokens: 500, // トークン数制限
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("AIからの応答にコンテンツがありません");
    }

    try {
      // JSON形式でパース
      const parsedData = JSON.parse(content);
      console.log("AIによるテロップ生成成功:", parsedData);
      return parsedData.captions;
    } catch (parseError) {
      console.error("AIレスポンスのJSONパースエラー:", parseError);
      console.log("生のレスポンス:", content);
      throw new Error("AIレスポンスの解析に失敗しました");
    }
  } catch (error) {
    console.error("テロップ自動生成エラー:", error);
    throw error;
  }
}

/**
 * 動画のタイトルやファイル名から、内容を簡単に説明する文字列を生成
 */
export async function generateVideoDescription(title: string): Promise<string> {
  try {
    console.log(`タイトル「${title}」の内容推測を開始...`);

    const prompt = `
ビデオタイトル「${title}」の内容を30文字程度で簡潔に推測してください。
日本語で回答。
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // より安価なモデル
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 100
    });

    const description = response.choices[0].message.content?.trim() || "";
    console.log("生成された説明:", description);
    return description;
  } catch (error) {
    console.error("動画説明生成エラー:", error);
    return `一般的な${title}に関する動画`; // エラー時のフォールバック
  }
}