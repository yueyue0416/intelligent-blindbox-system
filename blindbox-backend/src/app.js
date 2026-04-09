const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
require('dotenv').config()
const axios = require('axios')
const pool = require('./db')
//langchain动态导入入口
let recommendationAgentLangChainCached = null

async function getRecommendationAgentLangChain() {
  if (!recommendationAgentLangChainCached) {
    const mod = await import('./agents/recommendationAgent.langchain.mjs')
    recommendationAgentLangChainCached =
      mod.createRecommendationAgentLangChain({
        getAllSeriesFromDb
      })
  }
  return recommendationAgentLangChainCached
}


//langgraph动态入口
let supervisorGraphCached = null

async function getSupervisorGraph() {
  if (!supervisorGraphCached) {
    const mod = await import("./graphs/supervisor.langgraph.mjs")
    supervisorGraphCached = mod.createSupervisorGraph({
      recommendationAgent,
      ruleAgent,
    })
  }
  return supervisorGraphCached
}

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send('Blindbox backend is running')
})

// ========== 数据库查询函数 ==========

async function getAllSeriesFromDb() {
  const [seriesRows] = await pool.query(`
    SELECT id, name, price, description, hidden_tip
    FROM series
    ORDER BY created_at DESC
  `)

  const [itemRows] = await pool.query(`
    SELECT series_id, item_name
    FROM series_items
    ORDER BY id ASC
  `)

  const itemsMap = {}
  for (const row of itemRows) {
    if (!itemsMap[row.series_id]) {
      itemsMap[row.series_id] = []
    }
    itemsMap[row.series_id].push(row.item_name)
  }

  return seriesRows.map(row => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    desc: row.description,
    hiddenTip: row.hidden_tip,
    items: itemsMap[row.id] || []
  }))
}

async function getSeriesByIdFromDb(seriesId) {
  const [seriesRows] = await pool.query(
    `
    SELECT id, name, price, description, hidden_tip
    FROM series
    WHERE id = ?
    `,
    [seriesId]
  )

  if (seriesRows.length === 0) {
    return null
  }

  const [itemRows] = await pool.query(
    `
    SELECT item_name
    FROM series_items
    WHERE series_id = ?
    ORDER BY id ASC
    `,
    [seriesId]
  )

  const row = seriesRows[0]

  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    desc: row.description,
    hiddenTip: row.hidden_tip,
    items: itemRows.map(item => item.item_name)
  }
}
// ========== rag(python)接口 ==========
app.post('/api/rag-debug', async (req, res) => {
  try {
    const { question } = req.body
    const result = await debugPythonRag(question)
    res.json(result)
  } catch (error) {
    console.error('Python RAG 调试失败：', error.message)
    res.status(500).json({
      success: false,
      message: 'Python RAG 调试失败',
      detail: error.message
    })
  }
})
// ========== 业务接口 ==========

app.get('/api/series', async (req, res) => {
  try {
    const series = await getAllSeriesFromDb()
    res.json(series)
  } catch (error) {
    console.error('获取系列失败：', error)
    res.status(500).json({ message: '获取系列失败' })
  }
})

//收到前端传来的系列 ID → 去数据库确认系列存在 → 取出这个系列所有可抽款式 → 随机抽一个 → 写入历史记录 → 返回结果。
app.get('/api/series/:id', async (req, res) => {
  try {
    const item = await getSeriesByIdFromDb(req.params.id)

    if (!item) {
      return res.status(404).json({ message: '未找到该系列' })
    }

    res.json(item)
  } catch (error) {
    console.error('获取系列详情失败：', error)
    res.status(500).json({ message: '获取系列详情失败' })
  }
})

app.post('/api/draw', async (req, res) => {
  const conn = await pool.getConnection()

  try {
    const { seriesId } = req.body

    const [seriesRows] = await conn.query(
      `SELECT id, name FROM series WHERE id = ?`,
      [seriesId]
    )

    if (seriesRows.length === 0) {
      return res.status(404).json({ message: '未找到该系列' })
    }

    const [itemRows] = await conn.query(
      `SELECT item_name FROM series_items WHERE series_id = ?`,
      [seriesId]
    )

    if (itemRows.length === 0) {
      return res.status(400).json({ message: '该系列没有可抽取款式' })
    }

    const randomIndex = Math.floor(Math.random() * itemRows.length)
    const result = itemRows[randomIndex].item_name

    await conn.query(
      `
      INSERT INTO draw_history (series_id, result_item_name)
      VALUES (?, ?)
      `,
      [seriesId, result]
    )

    res.json({
      success: true,
      result,
      record: {
        seriesId: seriesRows[0].id,
        seriesName: seriesRows[0].name,
        result,
        time: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('抽盒失败：', error)
    res.status(500).json({ message: '抽盒失败' })
  } finally {
    conn.release()
  }
})

app.get('/api/history', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        h.id,
        h.series_id,
        s.name AS series_name,
        h.result_item_name,
        h.draw_time
      FROM draw_history h
      JOIN series s ON h.series_id = s.id
      ORDER BY h.draw_time DESC
      LIMIT 100
    `)

    const result = rows.map(row => ({
      id: row.id,
      seriesId: row.series_id,
      seriesName: row.series_name,
      result: row.result_item_name,
      time: row.draw_time
    }))

    res.json(result)
  } catch (error) {
    console.error('获取历史失败：', error)
    res.status(500).json({ message: '获取历史失败' })
  }
})

// ========== RAG 文档读取（先保留本地 txt，不动） ==========

const docsDir = path.join(__dirname, '../data/docs')

function loadDocuments() {
  const fileNames = fs.readdirSync(docsDir)

  return fileNames.map((fileName) => {
    const filePath = path.join(docsDir, fileName)
    const content = fs.readFileSync(filePath, 'utf-8')

    return {
      fileName,
      content
    }
  })
}

// 统一文本：转小写、去掉多余空格、去掉常见标点
function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[，。！？；：、“”‘’（）()《》【】\[\],.!?;:\s]/g, '')
    .trim()
}

// 去掉低信息问句词
function removeNoiseWords(text) {
  const noiseWords = [
    '请问', '一下', '一下子', '什么', '什么意思', '怎么', '如何',
    '为什么', '为啥', '有没有', '有吗', '吗', '呢', '啊', '呀',
    '这个', '那个', '哪些', '多少', '是否', '一下下'
  ]

  let result = text
  for (const word of noiseWords) {
    result = result.replaceAll(word, '')
  }
  return result
}

// 提取 2~4 字短语，长度越长通常信息量越高
function extractPhrases(question) {
  const normalized = removeNoiseWords(normalizeText(question))
  const phrases = new Set()

  if (!normalized) return []

  // 整句本身先放进去
  if (normalized.length >= 2) {
    phrases.add(normalized)
  }

  // 取 2~4 字连续片段
  for (let size = 4; size >= 2; size--) {
    for (let i = 0; i <= normalized.length - size; i++) {
      const sub = normalized.slice(i, i + size)

      // 过滤过于无意义的片段
      if (sub.length >= 2) {
        phrases.add(sub)
      }
    }
  }

  return Array.from(phrases)
}

// 根据问题内容，对不同文档类型做一点简单加权
function getFileBonus(question, fileName) {
  const q = normalizeText(question)
  let bonus = 0

  if (
    (q.includes('规则') || q.includes('隐藏款') || q.includes('抽盒')) &&
    fileName.includes('rules')
  ) {
    bonus += 3
  }

  if (
    (q.includes('推荐') || q.includes('依据') || q.includes('为什么')) &&
    fileName.includes('faq')
  ) {
    bonus += 3
  }

  if (
    (q.includes('系列') || q.includes('适合谁') || q.includes('风格')) &&
    fileName.includes('series_intro')
  ) {
    bonus += 3
  }

  return bonus
}

function scoreChunk(question, chunk) {
  const normalizedQuestion = removeNoiseWords(normalizeText(question))
  const normalizedChunk = normalizeText(chunk.text)
  const phrases = extractPhrases(question)

  let score = 0
  const matchedPhrases = []
  const reasons = []

  if (!normalizedChunk) {
    return { score: 0, matchedPhrases: [], reasons: [] }
  }

  // 1. 整句强命中
  if (
    normalizedQuestion &&
    normalizedQuestion.length >= 2 &&
    normalizedChunk.includes(normalizedQuestion)
  ) {
    score += 20
    matchedPhrases.push(normalizedQuestion)
    reasons.push('整句命中 +20')
  }

  // 2. 短语命中：长度越长加分越高
  for (const phrase of phrases) {
    if (!phrase || phrase.length < 2) continue

    if (normalizedChunk.includes(phrase)) {
      const phraseScore = phrase.length * phrase.length
      score += phraseScore
      matchedPhrases.push(phrase)
      reasons.push(`短语命中(${phrase}) +${phraseScore}`)
    }
  }

  // 3. 只有在“已经有真实命中”的前提下，才给文件类型加权
  const uniqueMatched = Array.from(new Set(matchedPhrases))
  if (uniqueMatched.length > 0) {
    const bonus = getFileBonus(question, chunk.fileName)
    if (bonus > 0) {
      score += bonus
      reasons.push(`文件加权(${chunk.fileName}) +${bonus}`)
    }
  }

  // 4. 定义类问题专门加权
  const definitionQuestionTriggers = ['什么意思', '是什么', '定义', '含义', '是指']
  const isDefinitionQuestion = definitionQuestionTriggers.some(word =>
    question.includes(word)
  )

  if (isDefinitionQuestion) {
    const definitionChunkTriggers = ['定义', '是指', '含义', '指的是']
    const hitDefinitionChunk = definitionChunkTriggers.some(word =>
      normalizedChunk.includes(normalizeText(word))
    )

    if (hitDefinitionChunk) {
      score += 10
      reasons.push('定义类问题命中定义句 +10')
      matchedPhrases.push('定义类命中')
    }
  }

  // 5. 规则类问题专门加权
  const ruleQuestionTriggers = ['规则', '怎么抽', '抽盒规则', '玩法']
  const isRuleQuestion = ruleQuestionTriggers.some(word =>
    question.includes(word)
  )

  if (isRuleQuestion) {
    const ruleChunkTriggers = ['规则', '说明', '玩法']
    const hitRuleChunk = ruleChunkTriggers.some(word =>
      normalizedChunk.includes(normalizeText(word))
    )

    if (hitRuleChunk) {
      score += 6
      reasons.push('规则类问题命中规则句 +6')
      matchedPhrases.push('规则类命中')
    }
  }

  // 6. 推荐类问题专门加权
  const recommendQuestionTriggers = ['为什么推荐', '推荐依据', '推荐这个系列', '推荐原因']
  const isRecommendQuestion = recommendQuestionTriggers.some(word =>
    question.includes(word)
  )

  if (isRecommendQuestion) {
    const recommendChunkTriggers = ['推荐', '适合', '依据', '原因']
    const hitRecommendChunk = recommendChunkTriggers.some(word =>
      normalizedChunk.includes(normalizeText(word))
    )

    if (hitRecommendChunk) {
      score += 6
      reasons.push('推荐类问题命中推荐句 +6')
      matchedPhrases.push('推荐类命中')
    }
  }

  return {
    score,
    matchedPhrases: Array.from(new Set(matchedPhrases)),
    reasons
  }
}

function retrieveDocs(question, topK = 3) {
  const docs = loadDocuments()
  const chunks = []

  for (const doc of docs) {
    const parts = doc.content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    for (const part of parts) {
      chunks.push({
        fileName: doc.fileName,
        text: part
      })
    }
  }

  const scoredChunks = chunks.map(chunk => {
    const { score, matchedPhrases, reasons } = scoreChunk(question, chunk)
    return {
      ...chunk,
      score,
      matchedPhrases,
      reasons
    }
  })

  return scoredChunks
    // 必须有真实短语命中，不能只靠文件加权混进来
    .filter(chunk => chunk.matchedPhrases && chunk.matchedPhrases.length > 0)
    // 至少要有一定分数，避免边缘噪声
    .filter(chunk => chunk.score >= 6)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      // 分数相同时，优先更短、更像“定义句/规则句”的 chunk
      return a.text.length - b.text.length
    })
    .slice(0, topK)
}
// ========== Agent ==========
//函数实现了一个手动版的“工具型 Agent”，它通过直接调用 DeepSeek API，让模型自主决定是否查询数据库，最终给出一个结构化的盲盒推荐结果
/*async function recommendationAgent(input) {
  const { budget, style, wantHidden } = input

  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_all_series',
        description: '获取当前所有盲盒系列信息，包括系列ID、名称、价格、简介、隐藏款提示等',
        parameters: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    }
  ]

  async function executeTool(functionName) {
    if (functionName === 'get_all_series') {
      return await getAllSeriesFromDb()
    }
    throw new Error(`未知工具：${functionName}`)
  }

  const messages = [
    {
      role: 'system',
      content:
        '你是一个盲盒推荐顾问。你可以在需要时调用工具获取盲盒系列数据。最终请严格输出 JSON，不要输出多余文字。'
    },
    {
      role: 'user',
      content: `
请根据用户需求推荐一个最合适的盲盒系列。

【用户信息】
- 预算：${budget}
- 风格偏好：${style}
- 是否想追隐藏款：${wantHidden ? '是' : '否'}

【任务要求】
1. 如有需要，可以调用工具获取系列数据
2. 最终请严格按下面 JSON 格式返回，不要输出多余文字

{
  "id": "系列ID",
  "name": "系列名称",
  "reason": "推荐理由"
}
`
    }
  ]

  const firstResponse = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.3
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const assistantMessage = firstResponse.data.choices[0].message

  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    messages.push(assistantMessage)

    for (const toolCall of assistantMessage.tool_calls) {
      const functionName = toolCall.function.name
      const toolResult = await executeTool(functionName)

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      })
    }

    const secondResponse = await axios.post(
      'https://api.deepseek.com/chat/completions',
      {
        model: 'deepseek-chat',
        messages,
        temperature: 0.3,
        response_format: {
          type: 'json_object'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )

    const finalContent = secondResponse.data.choices[0].message.content
    return JSON.parse(finalContent)
  }

  if (assistantMessage.content) {
    return JSON.parse(assistantMessage.content)
  }

  throw new Error('RecommendationAgent 没有返回有效结果')
}*/

async function recommendationAgent(input) {
  const agent = await getRecommendationAgentLangChain()
  return await agent(input)
}
/*  轻量Rag(js实现）
async function ruleAgent(input) {
  const { question, recommendation } = input
  const retrievedChunks = retrieveDocs(question)

  const contextText = retrievedChunks
    .map((chunk, index) => `资料${index + 1}（来源：${chunk.fileName}）：${chunk.text}`)
    .join('\n')

  const recommendationText = recommendation
    ? `\n【当前推荐结果】\n推荐系列：${recommendation.name}\n推荐理由：${recommendation.reason}\n`
    : ''

  const prompt = `
你是一个盲盒规则解释助手。请基于给定资料回答用户问题，不要脱离资料自由发挥。

【用户问题】
${question}
${recommendationText}

【检索到的资料】
${contextText}

【要求】
1. 只基于资料回答
2. 如果资料不足，就明确说“当前资料不足以完整回答该问题”
3. 回答尽量简洁清楚

请按以下 JSON 返回：
{
  "answer": "你的回答"
}
`

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个严谨的盲盒规则解释助手，只基于提供资料回答。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.2,
      response_format: {
        type: 'json_object'
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  )

  const content = response.data.choices[0].message.content
  return JSON.parse(content)
}
*/
async function ruleAgent(input) {
  const { question, recommendation } = input

  if (recommendation) {
    const result = await explainByPythonRag(question, recommendation)

    return {
      answer: result.answer
    }
  }

  const result = await askPythonRag(question)

  return {
    answer: result.answer
  }
}
//手写版langgraph实现
/*async function supervisorAgent(input) {
  const { budget, style, wantHidden, question } = input

  const hasRecommendInfo =
    budget !== undefined || style || wantHidden !== undefined

  const hasQuestion = !!question && question.trim() !== ''

  if (hasRecommendInfo && hasQuestion) {
    const recommendation = await recommendationAgent({
      budget,
      style,
      wantHidden
    })

    const explanation = await ruleAgent({
      question,
      recommendation
    })

    return {
      type: 'recommendation_with_explanation',
      recommendation,
      explanation
    }
  }

  if (hasRecommendInfo) {
    const recommendation = await recommendationAgent({
      budget,
      style,
      wantHidden
    })

    return {
      type: 'recommendation',
      recommendation
    }
  }

  if (hasQuestion) {
    const explanation = await ruleAgent({ question })

    return {
      type: 'rule_answer',
      explanation
    }
  }

  throw new Error('SupervisorAgent 无法识别当前任务类型')
}*/
async function supervisorAgent(input) {
  const graph = await getSupervisorGraph()

  const state = await graph.invoke({
    budget: input.budget,
    style: input.style,
    wantHidden: input.wantHidden,
    question: input.question,
  })

  if (state.resultType === "recommendation_with_explanation") {
    return {
      type: "recommendation_with_explanation",
      recommendation: state.recommendation,
      answer: state.answer,
    }
  }

  return {
    type: "recommendation",
    recommendation: state.recommendation,
  }
}
app.post('/api/agent', async (req, res) => {
  try {
    const result = await supervisorAgent(req.body)

    res.json({
      success: true,
      result
    })
  } catch (error) {
    console.error('多智能体联调失败：', error.message)
    res.status(500).json({
      success: false,
      message: '多智能体处理失败',
      detail: error.message
    })
  }
})
app.post('/api/rag-debug', (req, res) => {
  try {
    const { question } = req.body

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: 'question 不能为空'
      })
    }

    const retrievedChunks = retrieveDocs(question, 5)

    const contextText = retrievedChunks
      .map((chunk, index) => {
        return `资料${index + 1}（来源：${chunk.fileName}，分数：${chunk.score}，命中：${chunk.matchedPhrases.join('、')}）：${chunk.text}`
      })
      .join('\n')

    res.json({
      success: true,
      question,
      retrievedChunks,
      contextText
    })
  } catch (error) {
    console.error('RAG 调试失败：', error)
    res.status(500).json({
      success: false,
      message: 'RAG 调试失败'
    })
  }
})
async function askPythonRag(question) {
  const response = await axios.post(
    `${process.env.PY_RAG_BASE_URL}/rag/ask`,
    {
      question
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  )

  return response.data
}
async function explainByPythonRag(question, recommendation) {
  const response = await axios.post(
    `${process.env.PY_RAG_BASE_URL}/rag/explain`,
    {
      question,
      recommendation
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  )

  return response.data
}
async function debugPythonRag(question) {
  const response = await axios.post(
    `${process.env.PY_RAG_BASE_URL}/rag/debug`,
    {
      question
    },
    {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 30000
    }
  )

  return response.data
}
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`)
})