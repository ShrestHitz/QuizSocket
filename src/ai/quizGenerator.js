/**
 * Intelligent Document & Text to Quiz Generator
 * Parses study guides, articles, and networking notes into playable multiplayer quizzes.
 */

function generateQuizFromText(text, options = {}) {
  const title = options.title || "AI Generated Quiz: " + (text.slice(0, 30).trim() + "...");
  const difficulty = options.difficulty || "Medium";
  const preferredType = options.type || "mixed"; // "multiple-choice", "true-false", "fill-blank", "mixed"

  // Clean lines and paragraphs
  const sentences = text
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.?!])\s+|\n+/)
    .map(s => s.trim())
    .filter(s => s.length > 25);

  const questions = [];
  let questionCounter = 1;

  // Pattern detection:
  // 1. Definition patterns: "X is a Y", "X refers to Y", "X operates at Y"
  // 2. Numerical / port patterns: "Port 80 is used for HTTP", "IPv6 uses 128 bits"
  // 3. Contrast patterns: "Unlike X, Y does Z"
  // 4. Acronyms & expansions: "DNS stands for Domain Name System"

  for (const sentence of sentences) {
    if (questions.length >= 8) break;

    // Pattern: "X stands for Y" or "X represents Y"
    const acronymMatch = sentence.match(/([A-Z]{2,6})\s+(stands for|means|is an abbreviation for|represents)\s+([^,.]+)/i);
    if (acronymMatch) {
      const acronym = acronymMatch[1].toUpperCase();
      const meaning = acronymMatch[3].trim();
      const distractors = generateDistractorsForTerm(meaning, "acronym");
      
      const qOptions = shuffleArray([meaning, ...distractors]);
      questions.push({
        id: `ai-q${questionCounter++}`,
        type: "multiple-choice",
        question: `What does the networking acronym "${acronym}" stand for?`,
        options: qOptions,
        correctAnswer: qOptions.indexOf(meaning),
        timeLimit: 15,
        explanation: `As noted: "${sentence}"`
      });
      continue;
    }

    // Pattern: Port numbers "Port (\d+) is (used for|assigned to) (.+)"
    const portMatch = sentence.match(/port\s+(\d+)\s+(is used for|is designated for|handles|runs)\s+([^,.]+)/i);
    if (portMatch) {
      const portNum = portMatch[1];
      const service = portMatch[3].trim();
      const distractors = ["Port 22", "Port 80", "Port 443", "Port 53", "Port 8080"]
        .filter(p => p !== `Port ${portNum}`)
        .slice(0, 3);

      const correctStr = `Port ${portNum}`;
      const qOptions = shuffleArray([correctStr, ...distractors]);
      questions.push({
        id: `ai-q${questionCounter++}`,
        type: "multiple-choice",
        question: `Which standard port is used for ${service}?`,
        options: qOptions,
        correctAnswer: qOptions.indexOf(correctStr),
        timeLimit: 15,
        explanation: `Source text: "${sentence}"`
      });
      continue;
    }

    // Pattern: "X is defined as Y" or "X is a / an Y"
    const defMatch = sentence.match(/^([A-Z][a-zA-Z0-9\s-]{2,30})\s+(is|are|provides|operates as|refers to)\s+(.+)/i);
    if (defMatch && defMatch[1].length < 35) {
      const subject = defMatch[1].trim();
      const predicate = defMatch[3].trim().replace(/\.$/, '');

      // Alternate between True/False and Multiple Choice
      if (preferredType === "true-false" || (preferredType === "mixed" && questionCounter % 2 === 0)) {
        const isTrue = Math.random() > 0.3; // 70% true statements
        let displayStatement = sentence;
        if (!isTrue) {
          // Alter the predicate slightly
          displayStatement = `${subject} does not provide or handle ${predicate.split(' ').slice(0, 5).join(' ')}.`;
        }

        questions.push({
          id: `ai-q${questionCounter++}`,
          type: "true-false",
          question: `True or False: ${displayStatement}`,
          options: ["True", "False"],
          correctAnswer: isTrue ? 0 : 1,
          timeLimit: 15,
          explanation: `Context from document: "${sentence}"`
        });
      } else {
        // Multiple choice based on definition
        const distractors = generateDistractorsForTerm(subject, "concept");
        const qOptions = shuffleArray([subject, ...distractors]);
        questions.push({
          id: `ai-q${questionCounter++}`,
          type: "multiple-choice",
          question: `Which concept is described as: "${predicate.slice(0, 110)}${predicate.length > 110 ? '...' : ''}"?`,
          options: qOptions,
          correctAnswer: qOptions.indexOf(subject),
          timeLimit: 20,
          explanation: `Context: "${sentence}"`
        });
      }
      continue;
    }
  }

  // If text was short or didn't match enough patterns, synthesize high-value questions from keywords
  if (questions.length < 3) {
    const fallbackQuizzes = getTopicFallbackQuestions(text);
    for (const fq of fallbackQuizzes) {
      if (questions.length >= 5) break;
      questions.push({
        id: `ai-q${questionCounter++}`,
        ...fq
      });
    }
  }

  return {
    id: "ai-" + Date.now().toString(36),
    title: title,
    category: "AI Generated",
    description: `Generated from document analysis with ${questions.length} questions.`,
    difficulty: difficulty,
    badgeColor: "#FF5B89",
    createdAt: new Date().toISOString(),
    questions: questions
  };
}

function shuffleArray(arr) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateDistractorsForTerm(term, type) {
  const pool = {
    acronym: [
      "Dynamic Network System",
      "Direct Network Service",
      "Distributed Node Protocol",
      "Digital Network Synchronizer",
      "Direct Node Sharing",
      "Dynamic Packet Switching"
    ],
    concept: [
      "Transport Layer Flow Control",
      "Address Resolution Protocol",
      "Network Address Translation",
      "Border Gateway Routing Protocol",
      "Virtual Local Area Network",
      "Subnet Mask Partitioning"
    ]
  };

  const options = pool[type] || pool.concept;
  return shuffleArray(options.filter(o => o.toLowerCase() !== term.toLowerCase())).slice(0, 3);
}

function getTopicFallbackQuestions(text) {
  const lower = text.toLowerCase();
  if (lower.includes("layer") || lower.includes("osi") || lower.includes("tcp")) {
    return [
      {
        type: "multiple-choice",
        question: "How many layers are defined in the standard ISO/OSI Reference Model?",
        options: ["7 Layers", "4 Layers", "5 Layers", "8 Layers"],
        correctAnswer: 0,
        timeLimit: 15,
        explanation: "The OSI model consists of 7 layers: Physical, Data Link, Network, Transport, Session, Presentation, and Application."
      },
      {
        type: "multiple-choice",
        question: "Which layer handles physical addressing via MAC addresses?",
        options: ["Data Link Layer (Layer 2)", "Network Layer (Layer 3)", "Physical Layer (Layer 1)", "Transport Layer (Layer 4)"],
        correctAnswer: 0,
        timeLimit: 15,
        explanation: "The Data Link layer handles framing, physical MAC addressing, and local network hop-to-hop frame transmission."
      },
      {
        type: "true-false",
        question: "True or False: IP (Internet Protocol) operates at the Network Layer (Layer 3).",
        options: ["True", "False"],
        correctAnswer: 0,
        timeLimit: 15,
        explanation: "True! IPv4 and IPv6 operate at Layer 3 to route packets across interconnected networks."
      }
    ];
  }

  return [
    {
      type: "multiple-choice",
      question: "Which of the following describes a key characteristic of reliable real-time socket communication?",
      options: [
        "Persistent bidirectional event-driven connection",
        "Stateless request-response cycle on every interaction",
        "Polling the server once every minute",
        "Unidirectional UDP broadcast without ACK"
      ],
      correctAnswer: 0,
      timeLimit: 15,
      explanation: "Real-time socket communication maintains an open, bidirectional connection where server and clients can push updates instantaneously."
    },
    {
      type: "true-false",
      question: "True or False: Low network latency is critical for multiplayer quiz response timing.",
      options: ["True", "False"],
      correctAnswer: 0,
      timeLimit: 15,
      explanation: "True! Synchronized timestamps and low latency ensure accurate scoring and fair response collection."
    }
  ];
}

module.exports = {
  generateQuizFromText
};
