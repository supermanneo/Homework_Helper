import './style.css';
import { answerCurrent, createRound } from './quiz.js';
import { subjects } from './subjects.js';

const app = document.querySelector('#app');
const subject = subjects[0];
let words = [];
let warnings = [];
let round;
let questionIndex = 0;
let screen = 'loading';
let reviewMode = 'sample';

function modeLabel() {
  return reviewMode === 'all' ? '全量复习' : '随机 10 词';
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, className, onClick) {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

function shell() {
  app.replaceChildren();
  const header = element('header', 'header');
  const brand = element('div', 'brand');
  brand.append(element('span', 'brand-icon', 'Aa'), element('span', '', '词间'));
  header.append(brand, element('span', 'subject-tag', `${subject.name} · 单词复习`));
  const main = element('main', 'main');
  const footer = element('footer', 'footer', '每天一点，让单词慢慢变熟悉。');
  app.append(header, main, footer);
  return main;
}

function warningPanel(main) {
  if (!warnings.length) return;
  const details = element('details', 'warnings');
  details.append(element('summary', '', `单词本有 ${warnings.length} 条录入提示（已跳过对应行）`));
  const list = element('ul');
  warnings.forEach(warning => list.append(element('li', '', warning)));
  details.append(list);
  main.append(details);
}

function start(mode) {
  round = createRound(words, subject.createQuestion, Math.random, mode);
  reviewMode = mode;
  questionIndex = 0;
  screen = 'quiz';
  renderQuestion();
}

function renderWelcome() {
  screen = 'welcome';
  const main = shell();
  main.append(element('p', 'eyebrow', 'A LITTLE PRACTICE, EVERY DAY'),
    element('h1', '', '给单词一点熟悉感'),
    element('p', 'intro', '看一看，补一补。用一小轮练习，唤醒你的单词记忆。'));
  const card = element('section', 'card welcome-card');
  card.append(element('div', 'book-symbol', 'Aa'),
    element('h2', '', '准备好，开始今天的复习'),
    element('p', 'muted', `单词本已收录 ${words.length} 个单词 · 选择适合你的复习方式`));
  const steps = element('div', 'steps');
  ['看缺字单词和右侧释义', '选择按顺序补入的字母', '查看答案，巩固记忆'].forEach((text, index) => {
    const step = element('div', 'step');
    step.append(element('span', 'step-number', String(index + 1)), element('span', '', text));
    steps.append(step);
  });
  const modes = element('div', 'mode-actions');
  modes.append(
    button(`随机复习 · ${Math.min(words.length, 10)} 词  →`, 'primary', () => start('sample')),
    button(`全量复习 · ${words.length} 词  →`, 'secondary mode-all', () => start('all')));
  card.append(steps, modes);
  main.append(card);
  warningPanel(main);
}

function renderQuestion() {
  const question = round.questions[questionIndex];
  const result = round.answers[questionIndex];
  const main = shell();
  const top = element('div', 'quiz-top');
  top.append(element('span', 'eyebrow', '把缺失的字母找回来'),
    element('span', 'counter', `${questionIndex + 1} / ${round.questions.length}`));
  const progress = element('progress', 'progress');
  progress.max = round.questions.length;
  progress.value = round.answers.length;
  progress.setAttribute('aria-label', '本轮已完成题数');
  main.append(element('p', 'mode-label muted', modeLabel()), top, progress);
  const card = element('section', 'card question-card');
  const prompt = element('div', 'prompt');
  const spelling = element('h1', 'word', question.masked);
  spelling.setAttribute('aria-label', `缺字单词：${question.masked.split('').join(' ')}`);
  prompt.append(spelling, element('span', 'meaning', question.word.chinese));
  card.append(element('p', 'question-label', '选择正确的字母组合'), prompt,
    element('p', 'hint', `缺少 ${question.blanks.length} 个字母，请按从左到右的顺序补入`));
  const options = element('div', 'options');
  question.options.forEach((option, index) => {
    const choice = button('', 'option', () => selectAnswer(option));
    choice.append(element('span', 'option-number', String(index + 1)),
      element('span', 'option-letters', [...option].join(' · ')));
    if (result) {
      choice.disabled = true;
      if (option === question.answer) {
        choice.classList.add('correct');
        choice.append(element('span', 'option-status', '✓ 正确'));
      } else if (option === result.selected) {
        choice.classList.add('incorrect');
        choice.append(element('span', 'option-status', '× 已选'));
      }
    }
    options.append(choice);
  });
  card.append(options);
  const feedback = element('div', 'feedback');
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  card.append(feedback);
  main.append(card, element('p', 'keyboard-tip', '也可以按 1–4 选择，按 Enter 继续'));
  if (result) {
    feedback.classList.add(result.correct ? 'success' : 'retry');
    feedback.append(element('strong', '', result.correct ? '答对了，继续保持！' : '没关系，再记住一次。'),
      element('p', '', `正确补全：${[...question.answer].join(' · ')}　完整单词：${question.word.english}`));
    const next = button(questionIndex === round.questions.length - 1 ? '查看成绩  →' : '下一题  →', 'primary next', advance);
    card.append(next);
    next.focus({ preventScroll: true });
  } else {
    spelling.tabIndex = -1;
    spelling.focus({ preventScroll: true });
  }
}

function selectAnswer(option) {
  if (screen !== 'quiz') return;
  if (answerCurrent(round, questionIndex, option)) renderQuestion();
}

function advance() {
  if (screen !== 'quiz' || !round.answers[questionIndex]) return;
  if (questionIndex + 1 === round.questions.length) renderResults();
  else {
    questionIndex++;
    renderQuestion();
  }
}

function renderResults() {
  screen = 'results';
  const main = shell();
  const score = round.answers.filter(answer => answer.correct).length;
  main.append(element('p', 'eyebrow', 'PRACTICE COMPLETE'), element('h1', '', '又熟悉了一点，真好。'));
  const card = element('section', 'card result-card');
  card.append(element('p', 'mode-label muted', modeLabel()),
    element('p', 'muted', '本轮答对'),
    element('div', 'score', `${score} / ${round.questions.length}`),
    element('p', 'intro', `正确率 ${Math.round(score / round.questions.length * 100)}% · 每一次练习都算数`));
  const mistakes = round.questions.filter((_, index) => !round.answers[index].correct);
  if (mistakes.length) {
    card.append(element('h2', 'review-heading', '这些单词，再看一眼'));
    const list = element('ul', 'review-list');
    mistakes.forEach(question => {
      const item = element('li');
      item.append(element('strong', '', question.word.english), element('span', '', question.word.chinese));
      list.append(item);
    });
    card.append(list);
  } else card.append(element('p', 'perfect', '全部答对！今天的单词掌握得很棒。'));
  card.append(button('再来一轮  ↻', 'primary', () => start(reviewMode)),
    button('返回首页', 'secondary', renderWelcome));
  main.append(card);
  main.querySelector('h1').tabIndex = -1;
  main.querySelector('h1').focus({ preventScroll: true });
}

async function load() {
  screen = 'loading';
  shell().append(element('p', 'intro', '正在打开你的单词本……'));
  try {
    ({ words, warnings } = await subject.load());
    renderWelcome();
  } catch (error) {
    screen = 'error';
    const main = shell();
    const panel = element('section', 'card error-panel');
    panel.setAttribute('role', 'alert');
    panel.append(element('h1', '', '暂时无法开始复习'),
      element('p', 'error-message', error instanceof Error ? error.message : String(error)),
      element('p', 'muted', '请检查单词本.txt 的内容和网络连接，再重试。'),
      button('重新加载', 'primary', load));
    main.append(panel);
  }
}

document.addEventListener('keydown', event => {
  if (screen !== 'quiz' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
  const question = round.questions[questionIndex];
  if (/^[1-4]$/.test(event.key) && !round.answers[questionIndex]) {
    event.preventDefault();
    selectAnswer(question.options[Number(event.key) - 1]);
  } else if (event.key === 'Enter' && round.answers[questionIndex]) {
    event.preventDefault();
    advance();
  }
});

load();
