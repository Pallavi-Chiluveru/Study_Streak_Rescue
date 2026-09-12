const DEFAULT_TOPICS = [
  'Fundamentals',
  'Core Concepts',
  'Problem Solving',
  'Hands-on Practice',
  'Intermediate Concepts',
  'Advanced Concepts',
  'Revision',
  'Assessment'
];

const categoryDefaults = {
  coding: ['Programming Fundamentals', 'Core Concepts', 'Problem Solving', 'Debugging', 'Hands-on Practice', 'Testing', 'Projects', 'Review'],
  academic: ['Core Concepts', 'Key Terminology', 'Theory', 'Worked Examples', 'Practice Questions', 'Past Papers', 'Revision', 'Assessment'],
  certification: ['Exam Objectives', 'Core Services', 'Architecture', 'Security', 'Hands-on Practice', 'Practice Questions', 'Review', 'Mock Assessment'],
  'competitive exam': ['Core Concepts', 'Important Formulas', 'Problem Solving', 'Practice Questions', 'Previous Papers', 'Time Management', 'Revision', 'Mock Tests'],
  'interview preparation': ['Fundamentals', 'Common Questions', 'Problem Solving', 'Practical Scenarios', 'Communication', 'Mock Interviews', 'Review', 'Assessment']
};

const topicCatalog = {
  coding: [
    {
      keywords: ['dsa', 'data structure', 'algorithm'],
      topics: ['Arrays', 'Strings', 'Linked Lists', 'Stacks & Queues', 'Trees', 'Graphs', 'Recursion', 'Dynamic Programming']
    },
    {
      keywords: ['java', 'spring', 'backend'],
      topics: ['Java Fundamentals', 'Object-Oriented Programming', 'Collections', 'Exception Handling', 'Spring Boot', 'REST APIs', 'JPA & Hibernate', 'Databases']
    },
    {
      keywords: ['python'],
      topics: ['Python Fundamentals', 'Data Structures', 'Functions', 'Object-Oriented Programming', 'Modules & Packages', 'Error Handling', 'Testing', 'Projects']
    },
    {
      keywords: ['react', 'frontend', 'web development'],
      topics: ['HTML & CSS', 'JavaScript Fundamentals', 'Components', 'State Management', 'Routing', 'API Integration', 'Testing', 'Performance']
    }
  ],
  academic: [
    {
      keywords: ['computer network', 'networking'],
      topics: ['OSI Model', 'TCP/IP', 'IP Addressing', 'Subnetting', 'Routing', 'Transport Layer', 'Application Layer', 'Network Security']
    },
    {
      keywords: ['dbms', 'database'],
      topics: ['ER Model', 'Relational Model', 'SQL', 'Normalization', 'Transactions', 'Concurrency Control', 'Indexing', 'Database Security']
    },
    {
      keywords: ['operating system'],
      topics: ['Processes & Threads', 'CPU Scheduling', 'Synchronization', 'Deadlocks', 'Memory Management', 'File Systems', 'I/O Management', 'Security']
    }
  ],
  certification: [
    {
      keywords: ['aws', 'cloud practitioner', 'cloud'],
      topics: ['Cloud Concepts', 'IAM', 'EC2', 'S3', 'VPC', 'AWS Pricing', 'Shared Responsibility Model', 'Cloud Security']
    },
    {
      keywords: ['cyber', 'security', 'comptia', 'cissp'],
      topics: ['Network Security', 'Cryptography', 'Authentication', 'Web Security', 'Threats & Vulnerabilities', 'Access Control', 'Security Operations', 'Incident Response']
    }
  ],
  'interview preparation': [
    {
      keywords: ['aptitude', 'quantitative'],
      topics: ['Percentages', 'Ratio & Proportion', 'Averages', 'Profit & Loss', 'Time & Work', 'Time, Speed & Distance', 'Probability', 'Logical Reasoning']
    }
  ]
};

const normalize = value => String(value || '').trim().toLocaleLowerCase();

const getFallbackTopicSuggestions = (goalTitle, category) => {
  const normalizedGoal = normalize(goalTitle);
  const normalizedCategory = normalize(category);
  const categoryEntries = topicCatalog[normalizedCategory] || [];
  const match = categoryEntries.find(entry => entry.keywords.some(keyword => normalizedGoal.includes(keyword)));
  if (match) return [...match.topics];

  const crossCategoryMatch = Object.values(topicCatalog)
    .flat()
    .find(entry => entry.keywords.some(keyword => normalizedGoal.includes(keyword)));
  if (crossCategoryMatch) return [...crossCategoryMatch.topics];

  return [...(categoryDefaults[normalizedCategory] || DEFAULT_TOPICS)];
};

module.exports = { DEFAULT_TOPICS, categoryDefaults, topicCatalog, getFallbackTopicSuggestions };