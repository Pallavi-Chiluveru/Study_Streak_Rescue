const Groq = require('groq-sdk');

let client;
const getGroqClient = () => client || (client = new Groq({ apiKey: process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY, timeout: 20000, maxRetries: 1 }));
const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const validPriorities = new Set(['low', 'medium', 'high']);
const validDifficulties = new Set(['easy', 'medium', 'hard']);

const createFallbackBreakdown = (title, topics = [], sessionLength = 45, difficulty = 'medium', priority = 'medium') => {
  const topicList = Array.isArray(topics) && topics.filter(Boolean).length
    ? topics.filter(Boolean)
    : [title, 'Core Fundamentals', 'Practice and Review'];

  const tasks = topicList.flatMap((topic, index) => [
    {
      title: `${topic} fundamentals`,
      description: `Learn the key concepts and vocabulary for ${topic}.`,
      estimatedMinutes: sessionLength,
      priority: index === 0 ? 'high' : priority,
      difficulty
    },
    {
      title: `${topic} practice`,
      description: `Apply ${topic} with focused exercises and retrieval practice.`,
      estimatedMinutes: Math.min(60, sessionLength + 15),
      priority: index === 0 ? 'high' : 'medium',
      difficulty
    }
  ]);

  return normalizeBreakdown({
    goalSummary: `A practical learning plan for ${title}.`,
    estimatedTotalMinutes: tasks.reduce((total, task) => total + task.estimatedMinutes, 0),
    difficulty,
    tasks
  });
};

const normalizeBreakdown = (value) => {
  if (!value || !Array.isArray(value.tasks) || value.tasks.length === 0) {
    throw new Error('Groq returned no valid tasks');
  }

  const tasks = value.tasks.map((task, index) => ({
    title: String(task.title || `Learning task ${index + 1}`).trim().slice(0, 160),
    description: String(task.description || '').trim().slice(0, 500),
    estimatedMinutes: Math.max(5, Number(task.estimatedMinutes) || 45),
    priority: validPriorities.has(task.priority) ? task.priority : 'medium',
    difficulty: validDifficulties.has(task.difficulty) ? task.difficulty : 'medium',
    order: Number(task.order) || index + 1
  }));

  return {
    goalSummary: String(value.goalSummary || 'Personalized learning plan').trim(),
    estimatedTotalMinutes: tasks.reduce((total, task) => total + task.estimatedMinutes, 0),
    difficulty: validDifficulties.has(value.difficulty) ? value.difficulty : 'medium',
    tasks,
    provider: 'groq'
  };
};

const parseJson = text => {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) throw new Error('Groq returned invalid JSON');
    return JSON.parse(cleaned.slice(start, end + 1));
  }
};

const generateTaskBreakdown = async ({ title, description, topics, sessionLength = 45, difficulty = 'medium', priority = 'medium' }) => {
  // Keep existing local setups working while the documented variable is renamed.
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    return { ...createFallbackBreakdown(title, topics, sessionLength, difficulty, priority), provider: 'fallback' };
  }

  try {
    const groq = getGroqClient();
    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: `You are a learning planner. Break the learner goal into sequential micro-tasks. Return valid JSON only with goalSummary, difficulty, and tasks. Each task must include title, description, estimatedMinutes, priority, difficulty, and order. Do not invent unrelated topics.\nGoal: ${title}\nDescription: ${description || ''}\nTopics: ${Array.isArray(topics) ? topics.join(', ') : ''}\nSession length: ${sessionLength} minutes\nDifficulty: ${difficulty}\nPriority: ${priority}`
      }]
    });

    const content = completion.choices?.[0]?.message?.content;
    return normalizeBreakdown(parseJson(content || ''));
  } catch (error) {
    console.error('Groq planning failed.');
    return { ...createFallbackBreakdown(title, topics, sessionLength, difficulty, priority), provider: 'fallback' };
  }
};

const requestStructuredPlanning = async (instruction, input) => {
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_')) throw new Error('AI unavailable');
  const completion = await getGroqClient().chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: instruction }, { role: 'user', content: JSON.stringify(input) }]
  });
  return parseJson(completion.choices?.[0]?.message?.content || '');
};

const normalizeSuggestedTopics = (value) => {
  if (!value || !Array.isArray(value.suggestedTopics)) throw new Error('Groq returned no valid topic suggestions');
  const seen = new Set();
  return value.suggestedTopics
    .map(topic => String(topic || '').trim().replace(/\s+/g, ' ').slice(0, 80))
    .filter(topic => {
      const key = topic.toLocaleLowerCase();
      if (!topic || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
};

const suggestTopics = async ({ goalTitle, category, description }) => {
  const result = await requestStructuredPlanning(
    'You are helping create a learning plan. Based only on the learner goal title, category, and description, suggest the most relevant major topics or modules that would help achieve the goal. Return strict JSON shaped as {"suggestedTopics":["Topic"]}. Return 6 to 10 concise topic names. Do not invent deadlines. Do not include explanations or unrelated topics. For broad goals, stay general and do not invent specific technologies.',
    { goalTitle, category, description: description || '' }
  );
  return normalizeSuggestedTopics(result);
};

module.exports = {
  MODEL,
  parseJson,
  generateTaskBreakdown,
  normalizeBreakdown,
  normalizeSuggestedTopics,
  requestStructuredPlanning,
  suggestTopics
};