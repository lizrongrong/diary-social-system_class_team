const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function generateSummary({ diary }) {
  const text = diary.content || '';
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !text) {
    console.error('[aiService] Missing apiKey or text. API Key present:', !!apiKey, 'Text length:', text ? text.length : 0);
    return { summary: '失敗', suggestion: '', model_version: 'none' };
  }

  // 既然您確認 gemini-2.5-flash 可用，我們就用它
  const modelName = (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      // 雖然開了 JSON mode，但有時 AI 還是會包 Markdown，我們在下面處理
      generationConfig: { responseMimeType: "application/json" }
    });

    const prompt = `
      分析這篇日記：
      "${text}"

      請回傳 JSON 格式，包含：
      1. "summary": 繁體中文摘要，不需要提到"作者"2字，或是把"作者"改為"你"來表示 (50字內)。
      2. "suggestion": 給作者的一句溫暖建議 (50字內)。
      3. "emotion_score": 物件，包含以下八種情緒的百分比 (整數)：{"開心":..,"難過":..,"生氣":..,"焦慮":..,"平靜":..,"興奮":..,"疲累":..,"感動":..}，總和請調整為 100。
      4. "dominant_emotion": 文字，表示 emotion_score 中最高的情緒名稱。
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const raw = response.text();

    console.log('[aiService] AI 回傳的原始內容:', raw); // 讓我們看看它到底傳了什麼

    // --- 關鍵修正：去除 Markdown 符號 (```json 和 ```) ---
    const cleanJson = raw.replace(/^```json/g, '').replace(/^```/g, '').replace(/```$/g, '').trim();

    const parsed = JSON.parse(cleanJson);

    // Normalize emotion_score: ensure all keys present and sum to 100
    const desiredKeys = ['開心', '難過', '生氣', '焦慮', '平靜', '興奮', '疲累', '感動']
    let emotionScore = parsed.emotion_score || parsed.emotions || null
    if (typeof emotionScore === 'string') {
      try { emotionScore = JSON.parse(emotionScore) } catch (e) { emotionScore = null }
    }

    const normalized = {}
    if (emotionScore && typeof emotionScore === 'object') {
      // extract numeric values, default 0
      let total = 0
      for (const k of desiredKeys) {
        const v = Number(emotionScore[k]) || 0
        normalized[k] = Math.max(0, Math.round(v))
        total += normalized[k]
      }
      // if total is 0, fallback: equal distribution
      if (total === 0) {
        const equal = Math.floor(100 / desiredKeys.length)
        desiredKeys.forEach((k, i) => normalized[k] = i === desiredKeys.length - 1 ? 100 - equal * (desiredKeys.length - 1) : equal)
      } else if (total !== 100) {
        // scale to sum 100
        desiredKeys.forEach((k, i) => {
          if (i === desiredKeys.length - 1) {
            // ensure last makes sum 100
            const sumSoFar = desiredKeys.slice(0, -1).reduce((s, key) => s + (normalized[key] || 0), 0)
            normalized[k] = Math.max(0, 100 - sumSoFar)
          } else {
            normalized[k] = Math.round((normalized[k] / total) * 100)
          }
        })
      }
    } else {
      // fallback equal distribution
      const equal = Math.floor(100 / desiredKeys.length)
      desiredKeys.forEach((k, i) => normalized[k] = i === desiredKeys.length - 1 ? 100 - equal * (desiredKeys.length - 1) : equal)
    }

    // determine dominant emotion
    let dominant = Object.keys(normalized).reduce((a, b) => (normalized[a] >= normalized[b] ? a : b), '開心')

    return {
      summary: parsed.summary || '失敗',
      suggestion: parsed.suggestion || '',
      emotion_score: normalized,
      dominant_emotion: parsed.dominant_emotion || dominant,
      model_version: modelName,
    };

  } catch (error) {
    console.error('[aiService] Error generating content:', error);
    if (error.response) {
      console.error('[aiService] Error response:', JSON.stringify(error.response, null, 2));
    }
    // 如果解析失敗，印出原始文字幫助除錯
    return { summary: '失敗', suggestion: '', model_version: 'error' };
  }
}

module.exports = { generateSummary };