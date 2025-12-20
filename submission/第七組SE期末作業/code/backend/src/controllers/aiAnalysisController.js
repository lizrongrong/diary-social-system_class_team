const AIAnalysis = require('../models/AIAnalysis')
const Diary = require('../models/Diary')
const { generateSummary } = require('../services/aiService')

exports.getAnalysis = async (req, res) => {
  try {
    const { id } = req.params
    const analysis = await AIAnalysis.findByDiaryId(id)
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' })
    res.json({ analysis })
  } catch (err) {
    console.error('getAnalysis error', err)
    res.status(500).json({ error: 'Server error' })
  }
}

exports.generateAnalysis = async (req, res) => {
  try {
    const { id } = req.params
    const diary = await Diary.findById(id)
    if (!diary) return res.status(404).json({ error: 'Diary not found' })

    // If an analysis exists and is completed, do not allow regeneration
    // Unless the previous result was "失敗" (failed content)
    const existing = await AIAnalysis.findByDiaryId(id)
    if (existing && existing.status === 'completed' && existing.summary !== '失敗') {
      return res.status(409).json({ error: 'Analysis already completed', analysis: existing })
    }

    // mark pending (creates record if missing)
    await AIAnalysis.markPendingIfMissing(id)

    // generate summary, suggestion and emotion scores using aiService
    const { summary, suggestion, emotion_score, dominant_emotion, model_version } = await generateSummary({ diary })

    // store summary, suggestion, emotion_score, dominant_emotion and model_version
    await AIAnalysis.createOrUpdate(id, { summary, suggestion, emotion_score, dominant_emotion, model_version, status: 'completed' })

    const stored = await AIAnalysis.findByDiaryId(id)
    res.json({ analysis: stored })
  } catch (err) {
    console.error('generateAnalysis error', err)
    try {
      const { id } = req.params
      await AIAnalysis.markFailed(id)
    } catch (e) { }
    res.status(500).json({ error: 'Generation failed' })
  }
}
