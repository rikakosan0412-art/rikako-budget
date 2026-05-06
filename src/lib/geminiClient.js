import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini client with the API key from environment variables
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Converts a File object to a base64 string
 */
export async function fileToGenerativePart(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      // FileReader results in a Data URL: data:image/jpeg;base64,...
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Parses a receipt image and extracts date, amount, and memo.
 * @param {File} imageFile - The receipt image file
 * @returns {Promise<{date: string, amount: number, memo: string}>}
 */
export async function parseReceipt(imageFile) {
  if (!genAI) {
    throw new Error("Gemini API key is not configured.");
  }

  // Use gemini-flash-latest which has been verified to work with the user's API key
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
あなたは優秀な家計簿アシスタントです。
提供されたレシートの画像から、以下の情報を抽出し、JSON形式で返してください。

1. date: レシートの日付。YYYY-MM-DD 形式の文字列。
2. amount: 合計金額。数値のみ（カンマや円マークは不要）。
3. memo: 購入したものの概要。店舗名や代表的な商品名を簡潔に。例: "〇〇スーパー 食料品"
4. majorCategory: レシートの内容から推測される大カテゴリ。
5. subCategory: レシートの内容から推測される小カテゴリ（複数の商品がある場合は、一番金額の大きいものや全体を代表するものを基準に大まかに推測してください）。

【選択可能なカテゴリリスト（大カテゴリ: 小カテゴリの候補）】
- 食費: 食料品, 外食, 間食, その他
- 日用品: 美容, その他
- 交通費: 航空券, 在来線, 新幹線, 車, ガソリン, 高速, 駐車場, その他
- 趣味: 衣服, 嗜好品, スキー, 映画, 登山, 家具, 乗馬, 旅行, 飲み会, 本, その他
- 家賃: その他
- 光熱費: 水道, ガス, 電気, 通信, その他
- 医療: その他
- その他: その他

レスポンスは以下のフォーマットのJSONのみを出力してください（マークダウンのバッククオートなどは含めないでください）。
{
  "date": "2024-05-01",
  "amount": 1500,
  "memo": "イオン 食料品",
  "majorCategory": "食費",
  "subCategory": "食料品"
}
  `.trim();

  try {
    const imagePart = await fileToGenerativePart(imageFile);
    
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potential markdown formatting in the response (e.g. ```json ... ```)
    const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const parsedData = JSON.parse(cleanedText);
    
    // Fallback/Validation
    return {
      date: parsedData.date || new Date().toISOString().split('T')[0],
      amount: Number(parsedData.amount) || 0,
      memo: parsedData.memo || "レシート読み取り",
      majorCategory: parsedData.majorCategory || null,
      subCategory: parsedData.subCategory || null
    };
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw new Error("エラー詳細: " + (error.message || error));
  }
}
