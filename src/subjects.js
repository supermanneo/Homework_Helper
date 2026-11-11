import wordbookUrl from '../单词本.txt?url';
import { createQuestion, parseWordbook } from './quiz.js';

/**
 * 新科目遵循相同接口，页面无需依赖其词库格式。
 * @typedef {Object} Subject
 * @property {string} id
 * @property {string} name
 * @property {() => Promise<ReturnType<typeof parseWordbook>>} load
 * @property {typeof createQuestion} createQuestion
 */

/** @type {Subject[]} */
export const subjects = [{
  id: 'english',
  name: '英语',
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
}];
