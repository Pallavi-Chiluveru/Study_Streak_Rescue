const Groq = require('groq-sdk');

const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
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

const parseJson = (text) => JSON.parse(text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim());

const generateTaskBreakdown = async ({ title, description, topics, sessionLength = 45, difficulty = 'medium', priority = 'medium' }) => {
  // Keep existing local setups working while the documented variable is renamed.
  const apiKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.includes('your_')) {
    return { ...createFallbackBreakdown(title, topics, sessionLength, difficulty, priority), provider: 'fallback' };
  }

  try {
    const groq = new Groq({ apiKey });
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
    console.error(`Groq planning failed (${MODEL}):`, error.message);
    return { ...createFallbackBreakdown(title, topics, sessionLength, difficulty, priority), provider: 'fallback' };
  }
};

module.exports = { MODEL, generateTaskBreakdown, normalizeBreakdown };
