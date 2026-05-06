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

レスポンスは以下のフォーマットのJSONのみを出力してください（マークダウンのバッククオートなどは含めないでください）。
{
  "date": "2024-05-01",
  "amount": 1500,
  "memo": "イオン 食料品"
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
      memo: parsedData.memo || "レシート読み取り"
    };
  } catch (error) {
    console.error("Error parsing receipt:", error);
    throw new Error("エラー詳細: " + (error.message || error));
  }
}
