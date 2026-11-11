import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  answerCurrent, createQuestion, createRound, parseWordbook, sampleWords, shuffle,
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

test('仓库示例单词本有效且足够演示一轮 10 题', async () => {
  const text = await readFile(new URL('../单词本.txt', import.meta.url), 'utf8');
  const result = parseWordbook(text);
  assert.equal(result.warnings.length, 0);
  assert.ok(result.words.length >= 10);
});

test('抽样至多 10 个，不重复、不修改原数组', () => {
  const words = Array.from({ length: 20 }, (_, i) => ({ english: `word${i}`, chinese: '词' }));
  const original = [...words];
  const sample = sampleWords(words, seededRandom(42));
  assert.equal(sample.length, 10);
  assert.equal(new Set(sample).size, 10);
  assert.deepEqual(words, original);
  assert.equal(sampleWords(words.slice(0, 3)).length, 3);
  assert.notDeepEqual(shuffle(words, seededRandom(42)), words);
});

test('全量模式覆盖全部词条且随机排序，原随机模式仍只取 10 词', async () => {
  const { words } = parseWordbook(await readFile(new URL('../单词本.txt', import.meta.url), 'utf8'));
  const original = [...words];
  for (const mode of ['sample', 'all']) {
    let calls = 0;
    const round = createRound(words, (word, random) => {
      calls++;
      return createQuestion(word, random);
    }, seededRandom(42), mode);
    const selected = round.questions.map(question => question.word);
    assert.equal(selected.length, mode === 'all' ? words.length : Math.min(10, words.length));
    assert.equal(calls, selected.length);
    assert.equal(new Set(selected).size, selected.length);
    assert.deepEqual(round.answers, []);
    assert.deepEqual(words, original);
    if (mode === 'all') {
      assert.deepEqual(new Set(selected), new Set(words));
      assert.notDeepEqual(selected, words);
      round.questions.forEach((question, index) => {
        assert.equal(answerCurrent(round, index, question.answer), true);
      });
      assert.equal(round.answers.filter(answer => answer.correct).length, words.length);
    }
  }
});

test('两种模式均支持短词本和空词本，非法模式明确报错', () => {
  const words = [{ english: 'dog', chinese: '狗' }];
  for (const mode of ['sample', 'all']) {
    assert.equal(createRound(words, createQuestion, seededRandom(42), mode).questions.length, 1);
    assert.deepEqual(createRound([], createQuestion, seededRandom(42), mode), { questions: [], answers: [] });
  }
  assert.throws(() => createRound(words, createQuestion, Math.random, 'invalid'), /无效的复习模式/);
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
