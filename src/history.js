import { englishDifficulties } from './quiz.js';
import { mathModes } from './math.js';

export const historyGroups = [
  ...englishDifficulties.map(item => ({ id: `english-${item.id}`, name: `英语 · ${item.name}` })),
  ...mathModes.map(item => ({ id: `math-${item.id}`, name: `数学 · ${item.name}` })),
];

function historyKey(group) {
  if (!historyGroups.some(item => item.id === group)) throw new Error('无效的成绩分组');
  return `dudu.scores.v1.${group}`;
}

export function percentageScore(correct, total) {
  if (!Number.isInteger(correct) || !Number.isInteger(total) || total < 1 || correct < 0 || correct > total) {
    throw new Error('无法计算未完成或无效练习的成绩');
  }
  return Math.round(correct / total * 100);
}

function isScore(value) {
  return Number.isInteger(value) && value >= 0 && value <= 100;
}

function isTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && isScore(value.score) && (value.completedAt === null || isTimestamp(value.completedAt));
}

export function formatCompletionTime(completedAt, hourOnly = false) {
  if (completedAt === null) return '时间未知';
  if (!isTimestamp(completedAt)) throw new Error('无效的完成时间');
  const date = new Date(completedAt);
  const pad = number => String(number).padStart(2, '0');
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return hourOnly ? `${day} ${pad(date.getHours())}时`
    : `${day} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function readScores(group, storage = globalThis.localStorage) {
  const raw = storage.getItem(historyKey(group));
  if (raw === null) return [];
  let scores;
  try {
    scores = JSON.parse(raw);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    throw new Error('历史成绩数据损坏，请先备份或清理该站点数据后重试');
  }
  if (!Array.isArray(scores) || scores.length > 20 || !scores.every(value => isScore(value) || isRecord(value))) {
    throw new Error('历史成绩格式异常，请先备份或清理该站点数据后重试');
  }
  return scores.map(value => isScore(value)
    ? { score: value, completedAt: null }
    : { score: value.score, completedAt: value.completedAt });
}

export function appendScore(group, score, storage = globalThis.localStorage, completedAt = new Date().toISOString()) {
  if (!isScore(score)) throw new Error('得分必须为0～100的整数');
  if (!isTimestamp(completedAt)) throw new Error('无效的完成时间');
  const scores = [...readScores(group, storage), { score, completedAt }].slice(-20);
  storage.setItem(historyKey(group), JSON.stringify(scores));
  return scores;
}
