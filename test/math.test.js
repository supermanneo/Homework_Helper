import test from 'node:test';
import assert from 'node:assert/strict';
import { createMathWorksheet, gradeMathWorksheet, isValidMathAnswer } from '../src/math.js';

function seededRandom(seed) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('500轮数学卷满足题量、加减平衡、整数范围和无重复约束', () => {
  const answers = new Set();
  for (let seed = 0; seed < 500; seed++) {
    const questions = createMathWorksheet(seededRandom(seed));
    assert.equal(questions.length, 10);
    assert.equal(questions.filter(question => question.operator === '+').length, 5);
    assert.equal(questions.filter(question => question.operator === '−').length, 5);
    const identities = questions.map(({ left, right, operator, answer }) => {
      assert.ok(Number.isInteger(left) && left >= 0 && left <= 100);
      assert.ok(Number.isInteger(right) && right >= 0 && right <= 100);
      assert.ok(Number.isInteger(answer) && answer > 15 && answer <= 100);
      assert.equal(answer, operator === '+' ? left + right : left - right);
      if (operator === '+') assert.ok(left <= right);
      answers.add(answer);
      return `${left}${operator}${right}`;
    });
    assert.equal(new Set(identities).size, 10);
  }
  assert.ok(answers.has(16));
  assert.ok(answers.has(100));
});

test('常量随机源也能终止，不会重复抽题；每轮对象独立', () => {
  for (const random of [() => 0, () => 0.999999]) {
    const first = createMathWorksheet(random);
    const second = createMathWorksheet(random);
    assert.deepEqual(first, second);
    assert.equal(new Set(first.map(question => `${question.left}${question.operator}${question.right}`)).size, 10);
    first[0].answer = -1;
    assert.notEqual(second[0].answer, -1);
    assert.notEqual(createMathWorksheet(random)[0].answer, -1);
  }
  assert.notDeepEqual(createMathWorksheet(seededRandom(42)), createMathWorksheet(seededRandom(99)));
});

test('数学输入只接受0～100的整数字符串，包括错误答案0和15', () => {
  for (const value of ['0', '15', '16', '99', '100', '001']) {
    assert.equal(isValidMathAnswer(value), true);
  }
  for (const value of ['', ' ', '-1', '+16', '16.0', '2.5', '1e2', '101', '1000', 'abc', '十六', '１６', '16\n', null, undefined, 16]) {
    assert.equal(isValidMathAnswer(value), false, String(value));
  }
});

test('整卷计分：全对100、部分70、全错0，结果保留所填答案', () => {
  const questions = createMathWorksheet(seededRandom(42));
  const answers = questions.map(question => String(question.answer));
  const perfect = gradeMathWorksheet(questions, answers);
  assert.equal(perfect.score, 100);
  assert.equal(perfect.correctCount, 10);
  assert.ok(perfect.results.every(result => result.correct));
  const partial = gradeMathWorksheet(questions, answers.map((value, index) => index < 3 ? '0' : value));
  assert.equal(partial.score, 70);
  assert.equal(partial.correctCount, 7);
  assert.deepEqual(partial.results[0], { submitted: 0, correct: false });
  assert.equal(gradeMathWorksheet(questions, answers.map(() => '15')).score, 0);
  assert.deepEqual(answers, questions.map(question => String(question.answer)));
});

test('未填完或非法输入明确报错，不修改原答案', () => {
  const questions = createMathWorksheet();
  const answers = questions.map(question => String(question.answer));
  assert.throws(() => gradeMathWorksheet(questions, []), /全部10道题/);
  assert.throws(() => gradeMathWorksheet([], []), /全部10道题/);
  answers[2] = '';
  assert.throws(() => gradeMathWorksheet(questions, answers), /第3题/);
  assert.equal(answers[2], '');
});
