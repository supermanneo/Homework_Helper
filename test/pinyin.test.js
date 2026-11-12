import test from 'node:test';
import assert from 'node:assert/strict';
import { pinyinGroups } from '../src/pinyin.js';

test('小学拼音表包含23声母、24韵母和16整体认读音节且各类不重复', () => {
  assert.deepEqual(pinyinGroups.map(group => group.name), ['声母', '韵母', '整体认读音节']);
  assert.deepEqual(pinyinGroups.map(group => group.sections.flatMap(section => section.items).length), [23, 24, 16]);
  for (const group of pinyinGroups) {
    const items = group.sections.flatMap(section => section.items);
    assert.equal(new Set(items).size, items.length);
  }
  assert.equal(pinyinGroups[0].sections[0].items.join(' '), 'b p m f d t n l g k h j q x zh ch sh r z c s y w');
  assert.equal(pinyinGroups[2].sections[0].items.join(' '), 'zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying');
});

test('韵母规范分类和顺序，保留ü、üe及ün，无声调', () => {
  const sections = pinyinGroups[1].sections;
  assert.deepEqual(sections.map(section => section.name), ['单韵母', '复韵母', '特殊韵母', '前鼻韵母', '后鼻韵母']);
  assert.deepEqual(sections.map(section => section.items.join(' ')), [
    'a o e i u ü', 'ai ei ui ao ou iu ie üe', 'er', 'an en in un ün', 'ang eng ing ong',
  ]);
  assert.ok(pinyinGroups.flatMap(group => group.sections.flatMap(section => section.items)).every(text => /^[a-zü]+$/.test(text)));
});
