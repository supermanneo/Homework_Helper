export const inputLayouts = {
  english: [...'abcdefghijklmnopqrstuvwxyz'],
  math: [...'1234567890'],
};

export function createLetterEntry(word) {
  const positions = [...word].flatMap((letter, index) => /[a-z]/i.test(letter) ? [index] : []);
  if (!positions.length) throw new Error('输入题目必须包含英文字母');
  return { template: word, positions, letters: positions.map(() => ''), active: 0 };
}

export function editLetterEntry(state, key) {
  if (/^[a-z]$/i.test(key)) {
    state.letters[state.active] = key.toLowerCase();
    state.active = Math.min(state.active + 1, state.letters.length - 1);
  } else if (key === 'delete') {
    if (!state.letters[state.active]) state.active = Math.max(0, state.active - 1);
    state.letters[state.active] = '';
  } else if (key === 'clear') {
    state.letters.fill('');
    state.active = 0;
  } else throw new Error('无效的字母输入');
}

export function letterAnswer(state) {
  if (state.letters.some(letter => !letter)) return null;
  const result = [...state.template];
  state.positions.forEach((position, index) => { result[position] = state.letters[index]; });
  return result.join('');
}

export function editNumber(value, key) {
  if (key === 'delete') return value.slice(0, -1);
  if (key === 'clear') return '';
  if (!/^[0-9]$/.test(key)) throw new Error('无效的数字输入');
  return value.length < 3 ? value + key : value;
}

export function createKeypad(kind, onKey, actions = []) {
  const keys = inputLayouts[kind];
  if (!keys) throw new Error('未知的输入区类型');
  const panel = document.createElement('section');
  panel.className = `keypad keypad-${kind}`;
  panel.setAttribute('aria-label', kind === 'english' ? '英文字母输入区' : '数学数字输入区');
  const title = document.createElement('h2');
  title.className = 'keypad-title';
  title.textContent = kind === 'english' ? '点字母，填单词' : '点数字，填答案';
  const target = document.createElement('p');
  target.className = 'keypad-target';
  target.setAttribute('role', 'status');
  const grid = document.createElement('div');
  grid.className = 'keypad-keys';
  function keyButton(label, action, className = '') {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = `keypad-key ${className}`;
    key.textContent = label;
    key.addEventListener('click', action);
    return key;
  }
  keys.forEach(key => grid.append(keyButton(key, () => onKey(key))));
  const controls = document.createElement('div');
  controls.className = 'keypad-controls';
  controls.append(keyButton('删除', () => onKey('delete')), keyButton('清空', () => onKey('clear')));
  actions.forEach(({ label, run }) => controls.append(keyButton(label, run, 'keypad-action')));
  panel.append(title, target, grid, controls);
  return { panel, target };
}
