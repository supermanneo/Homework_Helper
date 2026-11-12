import { formatCompletionTime } from './history.js';

function svgElement(tag, attributes = {}, text) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  if (text !== undefined) node.textContent = text;
  return node;
}

export function scoreChart(scores, name) {
  const container = document.createElement('div');
  const selection = document.createElement('p');
  selection.className = 'chart-selection';
  selection.setAttribute('role', 'status');
  const describe = index => `第${index + 1}次：${scores[index].score}分 · ${formatCompletionTime(scores[index].completedAt)}`;
  selection.textContent = describe(scores.length - 1);
  const svg = svgElement('svg', {
    viewBox: '0 0 1000 285', class: 'score-chart', role: 'group',
    'aria-label': `${name}，按完成顺序等距排列，日期精确到小时，点击得分点查看完整时间`,
  });
  svg.append(svgElement('title', {}, `${name}最近${scores.length}次得分`));
  for (const score of [0, 25, 50, 75, 100]) {
    const y = 210 - score * 1.8;
    svg.append(svgElement('line', { x1: 55, x2: 960, y1: y, y2: y, class: 'chart-grid' }),
      svgElement('text', { x: 42, y: y + 6, 'text-anchor': 'end' }, score));
  }
  const points = scores.map((record, index) => ({
    x: scores.length === 1 ? 507 : 70 + index * 875 / (scores.length - 1),
    y: 210 - record.score * 1.8,
    score: record.score,
  }));
  if (points.length > 1) {
    svg.append(svgElement('polyline', {
      points: points.map(point => `${point.x},${point.y}`).join(' '), class: 'chart-line',
    }));
  }
  const labelIndices = new Set(Array.from({ length: Math.min(4, scores.length) }, (_, i) =>
    Math.round(i * (scores.length - 1) / Math.max(1, Math.min(4, scores.length) - 1))));
  points.forEach((point, index) => {
    const dot = svgElement('circle', {
      cx: point.x, cy: point.y, r: 10, class: 'chart-dot', tabindex: 0,
      role: 'button', 'aria-label': describe(index),
    });
    const select = () => { selection.textContent = describe(index); };
    dot.addEventListener('click', select);
    dot.addEventListener('focus', select);
    dot.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        select();
      }
    });
    dot.append(svgElement('title', {}, describe(index)));
    svg.append(dot, svgElement('text', {
      x: point.x, y: point.y - 10, 'text-anchor': 'middle', class: 'chart-value',
    }, point.score));
    if (labelIndices.has(index)) {
      const time = formatCompletionTime(scores[index].completedAt, true);
      const [day, hour] = time.split(' ');
      svg.append(svgElement('text', { x: point.x, y: 246, 'text-anchor': 'middle', class: 'chart-time' }, day));
      if (hour) svg.append(svgElement('text', { x: point.x, y: 272, 'text-anchor': 'middle', class: 'chart-time' }, hour));
    }
  });
  container.append(svg, selection);
  return container;
}
