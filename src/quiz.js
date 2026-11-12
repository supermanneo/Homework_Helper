const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

export const englishDifficulties = [
  { id: 'easy', name: '简单', description: '少量缺字 · 中文提示 · 四选一' },
  { id: 'hard', name: '困难', description: '约三分之二缺字 · 中文提示 · 四选一' },
  { id: 'challenge', name: '挑战', description: '看中文释义 · 自己输入完整单词' },
];

export function parseWordbook(text) {
  const words = [];
  const warnings = [];
  const seen = new Set();
  text.replace(/^\uFEFF/, '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const separator = line.indexOf('#');
    const english = separator < 0 ? '' : line.slice(0, separator).trim();
    const chinese = separator < 0 ? '' : line.slice(separator + 1).trim();
    const letters = english.match(/[a-z]/gi) || [];
    let reason = '';
    if (separator < 0) reason = '缺少 # 分隔符';
    else if (!english || !chinese) reason = '英文或中文释义为空';
    else if (!/^[a-zA-Z]+(?:[ '-][a-zA-Z]+)*$/.test(english)) {
      reason = '英文只支持英文字母、单个空格、英文撇号和连字符';
    } else if (letters.length < 2) reason = '至少需要两个英文字母才能挖空';
    else if (seen.has(english.toLowerCase())) reason = '英文重复，已保留第一次出现的词条';
    if (reason) {
      warnings.push(`第 ${index + 1} 行：${reason}`);
      return;
    }
    seen.add(english.toLowerCase());
    words.push({ english, chinese });
  });
  return { words, warnings };
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function createQuestion(word, random = Math.random, difficulty = 'easy') {
  if (!englishDifficulties.some(item => item.id === difficulty)) throw new Error('无效的复习难度');
  const indices = [...word.english].flatMap((letter, index) => /[a-z]/i.test(letter) ? [index] : []);
  if (indices.length < 2) throw new Error('题目至少需要两个英文字母');
  if (difficulty === 'challenge') {
    return {
      kind: 'challenge', word, blanks: indices,
      masked: [...word.english].map((letter, index) => indices.includes(index) ? '_' : letter).join(''),
      answer: word.english, options: [],
    };
  }
  // 短词最多缺一个，中等长度最多缺两个，长词最多缺三个。
  const limit = indices.length < 5 ? 1 : indices.length < 8 ? 2 : 3;
  const count = difficulty === 'hard'
    ? Math.min(indices.length - 1, Math.ceil(indices.length * 2 / 3))
    : 1 + Math.floor(random() * limit);
  const blanks = shuffle(indices, random).slice(0, count).sort((a, b) => a - b);
  const answer = blanks.map(index => word.english[index]).join('');
  const options = new Set([answer]);
  // 各缺字位置独立随机排列；即使随机源重复也能生成唯一选项并终止。
  const alphabets = [...answer].map(original => shuffle([...ALPHABET], random)
    .map(letter => original === original.toUpperCase() ? letter.toUpperCase() : letter));
  for (let i = 0; i < ALPHABET.length; i++) {
    options.add(alphabets.map(alphabet => alphabet[i]).join(''));
    if (options.size === 4) break;
  }
  return {
    kind: 'choice',
    word,
    blanks,
    masked: [...word.english].map((letter, index) => blanks.includes(index) ? '_' : letter).join(''),
    answer,
    options: shuffle([...options], random),
  };
}

export function createRound(words, makeQuestion = createQuestion, random = Math.random, difficulty = 'easy') {
  if (!englishDifficulties.some(item => item.id === difficulty)) throw new Error('无效的复习难度');
  return {
    questions: shuffle(words, random).map(word => makeQuestion(word, random, difficulty)),
    answers: [],
  };
}

export function submitAnswer(round, option) {
  const question = round.questions[round.answers.length];
  if (!question) throw new Error('无效的作答');
  if (question.kind === 'challenge') {
    if (typeof option !== 'string' || !option.trim()) throw new Error('请先输入完整的英文单词');
    const selected = option.trim();
    round.answers.push({ selected, correct: selected.toLowerCase() === question.answer.toLowerCase() });
  } else {
    if (!question.options.includes(option)) throw new Error('无效的作答');
    round.answers.push({ selected: option, correct: option === question.answer });
  }
}

export function answerCurrent(round, questionIndex, option) {
  if (questionIndex !== round.answers.length) return false;
  submitAnswer(round, option);
  return true;
}
