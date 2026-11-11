import wordbookUrl from '../单词本.txt?url';
import { createQuestion, parseWordbook } from './quiz.js';
import { createMathWorksheet, gradeMathWorksheet } from './math.js';

/**
 * 共有信息用于科目入口，按科目类型提供各自的练习能力。
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} icon
 * @typedef {Subject & {kind: 'word-review', load: () => Promise<ReturnType<typeof parseWordbook>>, createQuestion: typeof createQuestion}} EnglishSubject
 * @typedef {Subject & {kind: 'worksheet', createWorksheet: typeof createMathWorksheet, gradeWorksheet: typeof gradeMathWorksheet}} MathSubject
 * @typedef {Subject & {kind: 'coming-soon'}} PlannedSubject
 */

/** @type {(EnglishSubject | MathSubject | PlannedSubject)[]} */
export const subjects = [{
  id: 'english',
  name: '英语',
  description: '认一认，补一补，记住新单词。',
  icon: 'Aa',
  kind: 'word-review',
  async load() {
    const response = await fetch(wordbookUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`单词本加载失败（HTTP ${response.status}）`);
    const result = parseWordbook(await response.text());
    if (!result.words.length) {
      throw new Error(['单词本中没有有效词条，请按照 dog#狗 的格式录入。', ...result.warnings].join('\n'));
    }
    return result;
  },
  createQuestion,
}, {
  id: 'math',
  name: '数学',
  description: '100以内加减法，一起动动小脑筋。',
  icon: '1+2',
  kind: 'worksheet',
  createWorksheet: createMathWorksheet,
  gradeWorksheet: gradeMathWorksheet,
}, {
  id: 'chinese',
  name: '语文',
  description: '汉字和故事的世界，等你来探索。',
  icon: '字',
  kind: 'coming-soon',
}];
