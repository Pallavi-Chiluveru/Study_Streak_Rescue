const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSuggestedTopics } = require('../services/groqService');
const { getFallbackTopicSuggestions } = require('../services/topicSuggestionService');

test('topic suggestions are trimmed, deduplicated case-insensitively, and capped', () => {
  const topics = normalizeSuggestedTopics({
    suggestedTopics: [
      ' Arrays ',
      'arrays',
      'Trees',
      'Graphs',
      'Recursion',
      'Dynamic Programming',
      'Stacks & Queues',
      'Strings',
      'Linked Lists',
      'Sorting',
      'Searching',
      'Extra topic'
    ]
  });

  assert.deepEqual(topics.slice(0, 3), ['Arrays', 'Trees', 'Graphs']);
  assert.equal(topics.length, 10);
});

test('topic suggestions require a structured array', () => {
  assert.throws(() => normalizeSuggestedTopics({ topics: ['Arrays'] }), /no valid topic suggestions/);
});
test('fallback suggestions remain contextual across different goals', () => {
  assert.deepEqual(
    getFallbackTopicSuggestions('DSA', 'Coding'),
    ['Arrays', 'Strings', 'Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'Recursion', 'Dynamic Programming']
  );
  assert.ok(getFallbackTopicSuggestions('Computer Networks Semester Exam', 'Academic').includes('OSI Model'));
  assert.ok(getFallbackTopicSuggestions('Cyber Security Certification', 'Certification').includes('Cryptography'));
  assert.ok(getFallbackTopicSuggestions('AWS Cloud Practitioner', 'Certification').includes('IAM'));
});

test('unknown goals receive category-level suggestions instead of an empty list', () => {
  const topics = getFallbackTopicSuggestions('Uncommon coding skill', 'Coding');
  assert.ok(topics.includes('Programming Fundamentals'));
  assert.ok(topics.length >= 6);
});