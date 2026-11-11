import { shuffle } from './quiz.js';

const additionPool = [];
const subtractionPool = [];
for (let left = 0; left <= 100; left++) {
  for (let right = 0; right <= 100; right++) {
    const sum = left + right;
    if (left <= right && sum > 15 && sum <= 100) {
      additionPool.push({ left, right, operator: '+', answer: sum });
    }
    const difference = left - right;
    if (difference > 15 && difference <= 100) {
      subtractionPool.push({ left, right, operator: '−', answer: difference });
    }
  }
}

export function createMathWorksheet(random = Math.random) {
  return shuffle([
    ...shuffle(additionPool, random).slice(0, 5),
    ...shuffle(subtractionPool, random).slice(0, 5),
  ], random).map(question => ({ ...question }));
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
