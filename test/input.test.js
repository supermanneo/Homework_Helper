import test from 'node:test';
import assert from 'node:assert/strict';
import { createLetterEntry, editLetterEntry, letterAnswer, editNumber, inputLayouts } from '../src/input.js';

test('按科目提供26个有序字母与10个数字，未知输入报错', () => {
  assert.equal(inputLayouts.english.join(''), 'abcdefghijklmnopqrstuvwxyz');
  assert.equal([...inputLayouts.math].sort().join(''), '0123456789');
  assert.throws(() => editNumber('', 'a'), /无效/);
  assert.throws(() => createLetterEntry('---'), /英文字母/);
});

test('逐格输入保留标点，自动前进并在末格停留，大小写统一', () => {
  const state = createLetterEntry("Dad's bag");
  assert.equal(state.letters.length, 7);
  assert.equal(letterAnswer(state), null);
  for (const key of 'DADSBAG') editLetterEntry(state, key);
  assert.equal(state.active, 6);
  assert.equal(letterAnswer(state), "dad's bag");
  editLetterEntry(state, 'x');
  assert.equal(letterAnswer(state), "dad's bax");
});

test('任意格覆盖，删除当前或回退，清空及独立新题', () => {
  const state = createLetterEntry('dog');
  editLetterEntry(state, 'x');
  state.active = 0;
  editLetterEntry(state, 'd');
  assert.equal(state.letters[0], 'd');
  editLetterEntry(state, 'delete');
  assert.equal(state.active, 0);
  assert.equal(letterAnswer(state), null);
  for (const key of 'dog') editLetterEntry(state, key);
  editLetterEntry(state, 'delete');
  assert.deepEqual(state.letters, ['d', 'o', '']);
  editLetterEntry(state, 'delete');
  assert.deepEqual(state.letters, ['d', '', '']);
  editLetterEntry(state, 'clear');
  assert.deepEqual(state.letters, ['', '', '']);
  assert.equal(state.active, 0);
  assert.notEqual(createLetterEntry('dog').letters, state.letters);
  assert.throws(() => editLetterEntry(state, '1'), /无效/);
});

test('数字输入不自动跳题，最多三位，保留错误答案并支持删除清空', () => {
  let value = '';
  for (const key of '1000') value = editNumber(value, key);
  assert.equal(value, '100');
  assert.equal(editNumber(value, 'delete'), '10');
  assert.equal(editNumber(value, 'clear'), '');
  assert.equal(editNumber('', 'delete'), '');
  assert.equal(editNumber('99', '9'), '999');
  assert.equal(editNumber('', '0'), '0');
});
