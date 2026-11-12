import { shuffle } from './quiz.js';

export const mathModes = [
  {
    id: 'arithmetic', name: '加减法', title: '99以内加减法',
    description: '数字1～99，答案16～99，加减各5题。',
  },
  {
    id: 'multiplication-division', name: '乘除法', title: '九九乘除法',
    description: '九九乘法范围，乘除各5题，除法无余数。',
  },
];

const additionPool = [];
const subtractionPool = [];
const multiplicationPool = [];
const divisionPool = [];
for (let left = 1; left <= 99; left++) {
  for (let right = 1; right <= 99; right++) {
    const sum = left + right;
    if (left <= right && sum > 15 && sum <= 99) {
      additionPool.push({ left, right, operator: '+', answer: sum });
    }
    const difference = left - right;
    if (difference > 15 && difference <= 99) {
      subtractionPool.push({ left, right, operator: '−', answer: difference });
    }
  }
}
for (let left = 1; left <= 9; left++) {
  for (let right = 1; right <= 9; right++) {
    if (left <= right) {
      multiplicationPool.push({ left, right, operator: '×', answer: left * right });
    }
    divisionPool.push({ left: left * right, right, operator: '÷', answer: left });
  }
}

export function createMathWorksheet(random = Math.random, mode = 'arithmetic') {
  if (!mathModes.some(item => item.id === mode)) throw new Error('无效的数学练习类型');
  const pools = mode === 'arithmetic' ? [additionPool, subtractionPool] : [multiplicationPool, divisionPool];
  return shuffle(pools.flatMap(pool => shuffle(pool, random).slice(0, 5)), random)
    .map(question => ({ ...question }));
}

export function isValidMathAnswer(value) {
  return typeof value === 'string' && /^[0-9]{1,3}$/.test(value) && Number(value) <= 100;
}

export function gradeMathWorksheet(questions, answers) {
  if (questions.length !== 10 || answers.length !== questions.length) {
    throw new Error('请完成全部10道题后再提交');
  }
  const results = questions.map((question, index) => {
    if (!isValidMathAnswer(answers[index])) {
      throw new Error(`第${index + 1}题请输入0～100的整数`);
    }
    const submitted = Number(answers[index]);
    return { submitted, correct: submitted === question.answer };
  });
  const correctCount = results.filter(result => result.correct).length;
  return { results, correctCount, score: correctCount * 10 };
}
