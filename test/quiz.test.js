import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  answerCurrent, createQuestion, createRound, englishDifficulties, parseWordbook, shuffle,
} from '../src/quiz.js';

function seededRandom(seed) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('解析 UTF-8 BOM、CRLF、空行和字段空格，释义保留额外 #', () => {
  assert.deepEqual(parseWordbook('\uFEFF dog # 狗 \r\n\r\napple#苹果#水果\n'), {
    words: [{ english: 'dog', chinese: '狗' }, { english: 'apple', chinese: '苹果#水果' }],
    warnings: [],
  });
});

test('明确报告非法行与大小写重复行，只保留第一条', () => {
  const result = parseWordbook('dog#狗\nDOG#重复\nmissing\n#中文\ncat#\na#一个\n123#数字\ncafé#重音\nab##');
  assert.deepEqual(result.words, [{ english: 'dog', chinese: '狗' }, { english: 'ab', chinese: '#' }]);
  assert.equal(result.warnings.length, 7);
  for (let i = 0; i < result.warnings.length; i++) {
    assert.match(result.warnings[i], new RegExp(`^第 ${i + 2} 行：`));
  }
});

test('空词本不产生有效题目', () => {
  assert.deepEqual(parseWordbook(' \r\n\n'), { words: [], warnings: [] });
  assert.deepEqual(createRound([]), { questions: [], answers: [] });
});

test('仓库单词本有效', async () => {
  const text = await readFile(new URL('../单词本.txt', import.meta.url), 'utf8');
  const result = parseWordbook(text);
  assert.equal(result.warnings.length, 0);
  assert.ok(result.words.length >= 10);
});

test('打乱不重复、不修改原数组', () => {
  const words = Array.from({ length: 20 }, (_, i) => ({ english: `word${i}`, chinese: '词' }));
  const original = [...words];
  const sample = shuffle(words, seededRandom(42));
  assert.equal(sample.length, 20);
  assert.equal(new Set(sample).size, 20);
  assert.deepEqual(words, original);
  assert.notDeepEqual(shuffle(words, seededRandom(42)), words);
});

test('三种难度均覆盖全部词条且随机排序，不再有10词上限', async () => {
  const { words } = parseWordbook(await readFile(new URL('../单词本.txt', import.meta.url), 'utf8'));
  const original = [...words];
  for (const { id: mode } of englishDifficulties) {
    let calls = 0;
    const round = createRound(words, (word, random, difficulty) => {
      calls++;
      assert.equal(difficulty, mode);
      return createQuestion(word, random, difficulty);
    }, seededRandom(42), mode);
    const selected = round.questions.map(question => question.word);
    assert.equal(selected.length, words.length);
    assert.equal(calls, selected.length);
    assert.equal(new Set(selected).size, selected.length);
    assert.deepEqual(round.answers, []);
    assert.deepEqual(words, original);
    assert.deepEqual(new Set(selected), new Set(words));
    assert.notDeepEqual(selected, words);
    round.questions.forEach((question, index) => {
      assert.equal(answerCurrent(round, index, question.answer), true);
    });
    assert.equal(round.answers.filter(answer => answer.correct).length, words.length);
  }
});

test('三种难度支持短词本和空词本，旧模式和非法难度明确报错', () => {
  const words = [{ english: 'dog', chinese: '狗' }];
  for (const { id: mode } of englishDifficulties) {
    assert.equal(createRound(words, createQuestion, seededRandom(42), mode).questions.length, 1);
    assert.deepEqual(createRound([], createQuestion, seededRandom(42), mode), { questions: [], answers: [] });
  }
  for (const mode of ['sample', 'all', 'invalid']) {
    assert.throws(() => createRound(words, createQuestion, Math.random, mode), /无效的复习难度/);
  }
});

test('各种长度与标点：挖空范围、顺序、唯一正确答案及复原均满足约定', () => {
  const entries = ["an", "dog", "four", "apple", "journey", "mountain", "beautiful", "can't", "ice-cream", "New York"];
  for (const english of entries) {
    for (let seed = 0; seed < 100; seed++) {
      const question = createQuestion({ english, chinese: '测试' }, seededRandom(seed));
      const length = english.replace(/[^a-z]/gi, '').length;
      const limit = length < 5 ? 1 : length < 8 ? 2 : 3;
      assert.ok(question.blanks.length >= 1 && question.blanks.length <= limit);
      assert.ok(question.blanks.length < length);
      assert.deepEqual([...question.blanks].sort((a, b) => a - b), question.blanks);
      assert.ok(question.blanks.every(index => /[a-z]/i.test(english[index])));
      assert.equal(question.options.length, 4);
      assert.equal(new Set(question.options).size, 4);
      assert.equal(question.options.filter(option => option === question.answer).length, 1);
      assert.ok(question.options.every(option => /^[a-z]+$/i.test(option) && option.length === question.blanks.length));
      const restored = [...question.masked];
      question.blanks.forEach((index, i) => { restored[index] = question.answer[i]; });
      assert.equal(restored.join(''), english);
    }
  }
});

test('最小及最大随机值都能终止，并覆盖 1、2、3 个挖空', () => {
  for (const random of [() => 0, () => 0.999999]) {
    const question = createQuestion({ english: 'beautiful', chinese: '美丽的' }, random);
    assert.equal(new Set(question.options).size, 4);
    assert.equal(question.blanks.length, random() === 0 ? 1 : 3);
  }
  assert.equal(createQuestion({ english: 'apple', chinese: '苹果' }, () => 0.999999).blanks.length, 2);
  assert.throws(() => createQuestion({ english: 'a', chinese: '一个' }), /至少需要两个/);
});

test('正确答案可以出现在四个不同位置', () => {
  const positions = new Set();
  for (let seed = 0; seed < 200; seed++) {
    const question = createQuestion({ english: 'garden', chinese: '花园' }, seededRandom(seed));
    positions.add(question.options.indexOf(question.answer));
  }
  assert.equal(positions.size, 4);
});

test('科目题目工厂会用于所有抽中的词条', () => {
  const words = [{ english: 'dog', chinese: '狗' }, { english: 'cat', chinese: '猫' }];
  let calls = 0;
  const round = createRound(words, (word, random) => {
    calls++;
    return createQuestion(word, random);
  }, seededRandom(42));
  assert.equal(calls, 2);
  assert.equal(round.questions.length, 2);
});

test('重复点击同一题只计分一次，非法选项不改变状态', () => {
  const round = createRound([{ english: 'dog', chinese: '狗' }, { english: 'cat', chinese: '猫' }]);
  assert.throws(() => answerCurrent(round, 0, 'not-an-option'), /无效/);
  assert.equal(round.answers.length, 0);
  assert.equal(answerCurrent(round, 0, round.questions[0].answer), true);
  assert.equal(answerCurrent(round, 0, round.questions[0].answer), false);
  assert.equal(round.answers.length, 1);
  const wrong = round.questions[1].options.find(option => option !== round.questions[1].answer);
  assert.equal(answerCurrent(round, 1, wrong), true);
  assert.deepEqual(round.answers.map(answer => answer.correct), [true, false]);
  assert.equal(answerCurrent(round, 1, wrong), false);
  assert.throws(() => answerCurrent(round, 2, 'anything'), /无效/);
});

test('困难挖空约三分之二，至少保留1字母，选项唯一且可复原', () => {
  for (const english of ['it', 'dog', 'apple', 'blackboard', "can't", 'New York', 'ice-cream']) {
    for (let seed = 0; seed < 100; seed++) {
      const question = createQuestion({ english, chinese: '测试' }, seededRandom(seed), 'hard');
      const letters = english.match(/[a-z]/gi).length;
      assert.equal(question.blanks.length, Math.min(letters - 1, Math.ceil(letters * 2 / 3)));
      assert.equal(question.kind, 'choice');
      assert.equal(new Set(question.options).size, 4);
      assert.ok(question.options.includes(question.answer));
      const restored = [...question.masked];
      question.blanks.forEach((index, i) => { restored[index] = question.answer[i]; });
      assert.equal(restored.join(''), english);
    }
  }
});

test('挑战隐藏所有英文字母，保留标点，不提供四选一', () => {
  for (const english of ['dog', 'Dad', "can't", 'New York', 'ice-cream']) {
    const question = createQuestion({ english, chinese: '测试' }, seededRandom(42), 'challenge');
    assert.equal(question.kind, 'challenge');
    assert.equal(question.masked, english.replace(/[a-z]/gi, '_'));
    assert.equal(question.blanks.length, english.match(/[a-z]/gi).length);
    assert.deepEqual(question.options, []);
    assert.equal(question.answer, english);
  }
});

test('挑战忽略大小写和首尾空格，整词判定，空白不计分且重复提交锁定', () => {
  const words = [{ english: 'Dad', chinese: '爸爸' }];
  for (const [selected, correct] of [[' DAD ', true], ['dad', true], ['da', false], ['dog', false], ['爸爸', false], ['d ad', false]]) {
    const round = createRound(words, createQuestion, seededRandom(42), 'challenge');
    assert.throws(() => answerCurrent(round, 0, '  '), /请先输入/);
    assert.equal(round.answers.length, 0);
    assert.equal(answerCurrent(round, 0, selected), true);
    assert.deepEqual(round.answers[0], { selected: selected.trim(), correct });
    assert.equal(answerCurrent(round, 0, 'Dad'), false);
    assert.equal(round.answers.length, 1);
  }
});
