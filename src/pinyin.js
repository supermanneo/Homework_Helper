export const pinyinGroups = [
  {
    id: 'initials', name: '声母', sections: [
      { name: '声母', items: 'b p m f d t n l g k h j q x zh ch sh r z c s y w'.split(' ') },
    ],
  },
  {
    id: 'finals', name: '韵母', sections: [
      { name: '单韵母', items: ['a', 'o', 'e', 'i', 'u', 'ü'] },
      { name: '复韵母', items: 'ai ei ui ao ou iu ie üe'.split(' ') },
      { name: '特殊韵母', items: ['er'] },
      { name: '前鼻韵母', items: 'an en in un ün'.split(' ') },
      { name: '后鼻韵母', items: 'ang eng ing ong'.split(' ') },
    ],
  },
  {
    id: 'syllables', name: '整体认读音节', sections: [
      { name: '整体认读音节', items: 'zhi chi shi ri zi ci si yi wu yu ye yue yuan yin yun ying'.split(' ') },
    ],
  },
];

// 坐标10/35/60/85对应四线；单层a、g和各字母升部、降部不依赖系统字体。
const glyphs = {
  a: 'M22 40 C18 32 4 33 4 48 C4 63 18 63 22 55 M22 36 V60',
  b: 'M4 10 V60 M4 42 C12 29 24 34 24 48 C24 62 12 64 4 55',
  c: 'M23 39 C10 28 3 39 3 48 C3 59 13 65 23 57',
  d: 'M22 10 V60 M22 41 C14 29 3 35 3 48 C3 63 15 64 22 55',
  e: 'M4 47 H24 C24 31 4 30 4 47 C4 61 14 65 24 56',
  f: 'M9 60 V22 Q9 8 23 12 M3 35 H21',
  g: 'M22 40 C14 29 3 35 3 48 C3 63 16 63 22 54 M22 36 V72 Q22 88 6 81',
  h: 'M4 10 V60 M4 43 C10 30 23 33 23 44 V60',
  i: 'M13 35 V60 M13 22 V23',
  j: 'M18 35 V73 Q18 88 4 81 M18 22 V23',
  k: 'M5 10 V60 M23 35 L5 49 M12 44 L25 60',
  l: 'M13 10 V60',
  m: 'M3 60 V35 M3 42 Q9 29 15 39 V60 M15 42 Q23 28 27 40 V60',
  n: 'M4 60 V35 M4 43 C10 30 23 33 23 44 V60',
  o: 'M14 35 C0 35 0 60 14 60 C28 60 28 35 14 35 Z',
  p: 'M4 35 V85 M4 42 C12 29 24 34 24 48 C24 62 12 64 4 55',
  q: 'M22 35 V85 M22 41 C14 29 3 35 3 48 C3 63 15 64 22 55',
  r: 'M6 60 V35 M6 44 Q13 31 23 36',
  s: 'M23 38 C9 29 -1 42 13 47 C32 53 18 67 4 57',
  t: 'M11 18 V50 Q11 64 23 58 M3 35 H22',
  u: 'M4 35 V51 C4 65 17 63 23 52 M23 35 V60',
  ü: 'M4 35 V51 C4 65 17 63 23 52 M23 35 V60 M7 22 V23 M20 22 V23',
  w: 'M2 35 L7 60 L15 39 L22 60 L28 35',
  x: 'M4 35 L24 60 M24 35 L4 60',
  y: 'M3 35 L14 60 M25 35 L10 77 Q7 86 2 82',
  z: 'M4 35 H24 L4 60 H24',
};

function svgNode(tag, attributes) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  return node;
}

export function pinyinCard(text) {
  if (![...text].every(letter => typeof glyphs[letter] === 'string') || !text) {
    throw new Error('不支持的拼音字形');
  }
  const width = Math.max(50, text.length * 32 + 14);
  const svg = svgNode('svg', { viewBox: `0 0 ${width} 96`, class: 'pinyin-card', role: 'img', 'aria-label': text });
  const title = svgNode('title', {});
  title.textContent = text;
  svg.append(title);
  for (const y of [10, 35, 60, 85]) {
    svg.append(svgNode('line', { x1: 0, x2: width, y1: y, y2: y, class: 'pinyin-line' }));
  }
  const start = (width - text.length * 32) / 2;
  [...text].forEach((letter, index) => {
    svg.append(svgNode('path', {
      d: glyphs[letter], transform: `translate(${start + index * 32} 0)`,
      class: 'pinyin-letter',
    }));
  });
  return svg;
}
