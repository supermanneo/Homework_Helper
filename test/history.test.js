import test from 'node:test';
import assert from 'node:assert/strict';
import { appendScore, formatCompletionTime, historyGroups, percentageScore, readScores } from '../src/history.js';

const completedAt = '2026-11-12T06:16:04.728Z';
const record = score => ({ score, completedAt });

function memoryStorage() {
  const data = new Map();
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, value),
  };
}

test('空历史、单次成绩、五分组隔离以及重新读取持久化分数', () => {
  const storage = memoryStorage();
  assert.equal(historyGroups.length, 5);
  for (const [index, group] of historyGroups.entries()) {
    assert.deepEqual(readScores(group.id, storage), []);
    assert.deepEqual(appendScore(group.id, index * 25, storage, completedAt), [record(index * 25)]);
  }
  historyGroups.forEach((group, index) => {
    assert.deepEqual(readScores(group.id, storage), [record(index * 25)]);
  });
  assert.deepEqual(appendScore('english-easy', 100, storage, completedAt), [record(0), record(100)]);
  assert.deepEqual(readScores('english-hard', storage), [record(25)]);
});

test('新增乘除法保留旧加减历史键和分数，两类各独立保留20次', () => {
  const storage = memoryStorage();
  storage.setItem('dudu.scores.v1.math-arithmetic', '[70,100]');
  assert.deepEqual(readScores('math-arithmetic', storage), [{ score: 70, completedAt: null }, { score: 100, completedAt: null }]);
  assert.deepEqual(readScores('math-multiplication-division', storage), []);
  appendScore('math-multiplication-division', 60, storage);
  assert.equal(storage.getItem('dudu.scores.v1.math-arithmetic'), '[70,100]');
  for (let score = 0; score < 25; score++) {
    appendScore('math-arithmetic', score, storage, completedAt);
    appendScore('math-multiplication-division', 100 - score, storage, completedAt);
  }
  assert.deepEqual(readScores('math-arithmetic', storage), Array.from({ length: 20 }, (_, i) => record(i + 5)));
  assert.deepEqual(readScores('math-multiplication-division', storage), Array.from({ length: 20 }, (_, i) => record(95 - i)));
});
test('每组只保存最近20个得分和时间，按完成顺序且无多余字段', () => {
  const storage = memoryStorage();
  for (let score = 0; score < 25; score++) appendScore('english-challenge', score, storage, completedAt);
  assert.deepEqual(readScores('english-challenge', storage), Array.from({ length: 20 }, (_, i) => record(i + 5)));
  assert.deepEqual(readScores('math-arithmetic', storage), []);
});

test('百分制四舍五入且验证边界', () => {
  assert.equal(percentageScore(0, 35), 0);
  assert.equal(percentageScore(35, 35), 100);
  assert.equal(percentageScore(17, 35), 49);
  assert.equal(percentageScore(1, 3), 33);
  assert.equal(percentageScore(2, 3), 67);
  for (const [correct, total] of [[0, 0], [1, 0], [-1, 10], [11, 10], [1.5, 10], [1, 3.5]]) {
    assert.throws(() => percentageScore(correct, total), /无法计算/);
  }
});

test('非法分数与未知分组不能写入', () => {
  const storage = memoryStorage();
  for (const score of [-1, 101, 2.5, NaN, Infinity, '50', null]) {
    assert.throws(() => appendScore('english-easy', score, storage), /得分必须/);
  }
  assert.throws(() => readScores('invalid', storage), /无效的成绩分组/);
  assert.deepEqual(readScores('english-easy', storage), []);
});

test('损坏历史明确报错、不覆盖；读取和写入权限/容量错误透传', () => {
  for (const raw of ['{', '{}', 'null', '["50"]', '[-1]', '[101]', '[1.5]', '[{"score":50}]',
    '[{"score":50,"completedAt":"invalid"}]', '[{"score":50,"completedAt":"2026-02-30T00:00:00.000Z"}]',
    '[{"score":101,"completedAt":null}]', JSON.stringify(Array(21).fill(50))]) {
    let saved = false;
    const storage = { getItem: () => raw, setItem: () => { saved = true; } };
    assert.throws(() => readScores('english-easy', storage), /历史成绩/);
    assert.throws(() => appendScore('english-easy', 50, storage), /历史成绩/);
    assert.equal(saved, false);
  }
  const denied = new Error('Storage permission denied');
  const full = new Error('Quota exceeded');
  assert.throws(() => readScores('english-easy', { getItem() { throw denied; } }), error => error === denied);
  assert.throws(() => appendScore('english-easy', 50, { getItem: () => null, setItem() { throw full; } }), error => error === full);
});

test('旧分数与时间记录混合兼容，只在成功追加时迁移，不补造旧时间', () => {
  const storage = memoryStorage();
  const key = 'dudu.scores.v1.english-easy';
  const original = JSON.stringify([60, record(80), { score: 70, completedAt: null }]);
  storage.setItem(key, original);
  assert.deepEqual(readScores('english-easy', storage), [
    { score: 60, completedAt: null }, record(80), { score: 70, completedAt: null },
  ]);
  assert.equal(storage.getItem(key), original);
  appendScore('english-easy', 100, storage, completedAt);
  const saved = JSON.parse(storage.getItem(key));
  assert.deepEqual(saved.at(-1), record(100));
  assert.deepEqual(saved[0], { score: 60, completedAt: null });
  assert.ok(saved.every(item => Object.keys(item).sort().join(',') === 'completedAt,score'));
});

test('同小时多轮保留各自时间，默认记录当前完成时间；非法时间拒绝写入', () => {
  const storage = memoryStorage();
  appendScore('english-easy', 70, storage, completedAt);
  const later = '2026-11-12T06:59:59.000Z';
  appendScore('english-easy', 80, storage, later);
  assert.deepEqual(readScores('english-easy', storage), [record(70), { score: 80, completedAt: later }]);
  const before = Date.now();
  appendScore('english-easy', 90, storage);
  const actual = Date.parse(readScores('english-easy', storage).at(-1).completedAt);
  assert.ok(actual >= before && actual <= Date.now());
  for (const time of [null, '', 'bad', 0, '2026-02-30T00:00:00.000Z']) {
    assert.throws(() => appendScore('english-easy', 100, storage, time), /无效的完成时间/);
  }
  assert.equal(readScores('english-easy', storage).length, 3);
});

test('本地时间格式包括跨年日期，明细到秒、曲线到小时，旧时间明确未知', () => {
  const date = new Date(2027, 0, 1, 0, 5, 9);
  assert.equal(formatCompletionTime(date.toISOString()), '2027-01-01 00:05:09');
  assert.equal(formatCompletionTime(date.toISOString(), true), '2027-01-01 00时');
  assert.equal(formatCompletionTime(new Date(2026, 11, 31, 23, 59, 59).toISOString(), true), '2026-12-31 23时');
  assert.equal(formatCompletionTime(null), '时间未知');
  assert.throws(() => formatCompletionTime('invalid'), /无效/);
});
