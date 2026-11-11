import './style.css';
import { answerCurrent, createRound } from './quiz.js';
import { subjects } from './subjects.js';
import { isValidMathAnswer } from './math.js';

const app = document.querySelector('#app');
let subject = null;
let words = [];
let warnings = [];
let round;
let questionIndex = 0;
let screen = 'loading';
let reviewMode = 'sample';
let loadRequest = 0;

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
  const brand = button('', 'brand', renderHome);
  brand.setAttribute('aria-label', '嘟嘟的学习乐园，返回首页');
  brand.append(element('span', 'brand-icon', '嘟'), element('span', '', '嘟嘟的学习乐园'));
  header.append(brand);
  if (subject) header.append(button('← 乐园首页', 'secondary home-link', renderHome));
  const main = element('main', 'main');
  const footer = element('footer', 'footer', '每天进步一点点，快乐学习每一天。');
  app.append(header, main, footer);
  return main;
}

function renderHome() {
  subject = null;
  screen = 'home';
  const main = shell();
  main.append(element('p', 'eyebrow', '欢迎来到你的学习乐园'),
    element('h1', '', '嘟嘟，今天想学什么？'),
    element('p', 'intro', '选一门喜欢的科目，开始今天的小挑战吧！'));
  const grid = element('div', 'subject-grid');
  subjects.forEach(item => {
    const card = element('section', `card subject-card subject-${item.id}`);
    const planned = item.kind === 'coming-soon';
    const action = button(planned ? '即将加入' : `开始学${item.name}  →`, 'primary', () => openSubject(item));
    action.disabled = planned;
    card.append(element('div', 'subject-icon', item.icon), element('h2', '', item.name),
      element('p', 'intro', item.description), action);
    grid.append(card);
  });
  main.append(grid);
  window.scrollTo(0, 0);
}

function openSubject(item) {
  subject = item;
  if (item.kind === 'word-review') load();
  else if (item.kind === 'worksheet') renderMath();
}

function renderMath() {
  screen = 'math';
  const mathSubject = subject;
  const questions = mathSubject.createWorksheet();
  const main = shell();
  main.append(element('p', 'eyebrow', '数学 · 算一算'),
    element('h1', '', '100以内加减法'),
    element('p', 'intro', '一共10题，每题10分。填好所有答案，再一起交卷！'),
    element('p', 'muted', '加法、减法各5题。刷新或离开练习会清空本轮答案。'));
  const form = element('form', 'math-form');
  form.noValidate = true;
  const summary = element('section', 'math-summary');
  const grid = element('div', 'math-grid');
  const inputs = [];
  const rows = [];
  const feedbacks = [];
  const progress = element('p', 'math-progress', '已填写 0 / 10 题');
  progress.setAttribute('role', 'status');
  questions.forEach((question, index) => {
    const row = element('div', 'card math-row');
    const label = element('label', 'math-expression');
    label.htmlFor = `math-answer-${index}`;
    label.append(element('span', 'math-number', `第${index + 1}题`),
      element('span', '', `${question.left} ${question.operator} ${question.right} =`));
    const input = element('input', 'math-input');
    input.id = label.htmlFor;
    input.name = `answer-${index}`;
    input.type = 'text';
    input.inputMode = 'numeric';
    input.pattern = '[0-9]{1,3}';
    input.maxLength = 3;
    input.required = true;
    input.autocomplete = 'off';
    input.setAttribute('enterkeyhint', index === questions.length - 1 ? 'done' : 'next');
    input.setAttribute('aria-describedby', `math-feedback-${index}`);
    const feedback = element('p', 'math-feedback');
    feedback.id = `math-feedback-${index}`;
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      feedback.textContent = '';
      const filled = inputs.filter(field => field.value !== '').length;
      progress.textContent = `已填写 ${filled} / 10 题`;
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && !input.readOnly) {
        event.preventDefault();
        if (index < inputs.length - 1) inputs[index + 1].focus();
        else form.requestSubmit();
      }
    });
    const equation = element('div', 'math-equation');
    equation.append(label, input);
    row.append(equation, feedback);
    grid.append(row);
    inputs.push(input);
    rows.push(row);
    feedbacks.push(feedback);
  });
  const error = element('p', 'form-error');
  error.setAttribute('role', 'alert');
  const submit = element('button', 'primary', '全部完成，提交答案');
  submit.type = 'submit';
  let submitted = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (submitted) return;
    const invalid = inputs.findIndex(input => !isValidMathAnswer(input.value));
    if (invalid !== -1) {
      error.textContent = `还有题目没有填好。第${invalid + 1}题请输入0～100的整数。`;
      inputs.forEach((input, index) => {
        if (!isValidMathAnswer(input.value)) {
          input.setAttribute('aria-invalid', 'true');
          feedbacks[index].textContent = '请填写0～100的整数';
        }
      });
      inputs[invalid].focus();
      return;
    }
    const result = mathSubject.gradeWorksheet(questions, inputs.map(input => input.value));
    submitted = true;
    error.textContent = '';
    progress.textContent = '已交卷，来看看你的成绩吧！';
    inputs.forEach((input, index) => {
      input.readOnly = true;
      input.removeAttribute('aria-invalid');
      const correct = result.results[index].correct;
      rows[index].classList.add(correct ? 'math-correct' : 'math-incorrect');
      feedbacks[index].textContent = correct ? '✓ 答对了！' : `× 再记一次，正确答案是 ${questions[index].answer}`;
    });
    submit.remove();
    summary.classList.add('card', 'result-card');
    const heading = element('h2', '', '本轮成绩');
    heading.tabIndex = -1;
    summary.append(heading, element('p', 'score', `${result.score} 分`),
      element('p', 'math-result-count', `答对 ${result.correctCount} / 10 题`),
      element('p', '', result.correctCount === 10 ? '全部答对，真棒！' : '往下看看错题，下次一定更熟练！'),
      button('再来一轮  ↻', 'primary', renderMath),
      button('返回乐园首页', 'secondary', renderHome));
    heading.focus();
  });
  form.append(summary, progress, grid, error, submit);
  main.append(form);
  window.scrollTo(0, 0);
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
  window.scrollTo(0, 0);
}

function renderWelcome() {
  screen = 'welcome';
  const main = shell();
  main.append(element('p', 'eyebrow', '英语 · 单词复习'),
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
  window.scrollTo(0, 0);
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
  if (result) {
    spelling.replaceChildren();
    [...question.masked].forEach((letter, index) => {
      const blankIndex = question.blanks.indexOf(index);
      spelling.append(blankIndex === -1
        ? document.createTextNode(letter)
        : element('span', 'filled-letter', result.selected[blankIndex]));
    });
  }
  spelling.setAttribute('aria-label', `${result ? '所选拼写' : '缺字单词'}：${spelling.textContent.split('').join(' ')}`);
  prompt.append(spelling, element('span', 'meaning', question.word.chinese));
  card.append(element('p', 'question-label', '选择正确的字母组合'), prompt,
    element('p', 'hint', result
      ? '蓝色字母为你选择的补全，请查看下方答案'
      : `缺少 ${question.blanks.length} 个字母，请按从左到右的顺序补入`));
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
    window.scrollTo(0, 0);
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
    button('返回英语', 'secondary', renderWelcome));
  main.append(card);
  main.querySelector('h1').tabIndex = -1;
  main.querySelector('h1').focus({ preventScroll: true });
}

async function load() {
  const englishSubject = subject;
  const request = ++loadRequest;
  screen = 'loading';
  shell().append(element('p', 'intro', '正在打开你的单词本……'));
  try {
    const data = await englishSubject.load();
    if (request !== loadRequest || subject !== englishSubject || screen !== 'loading') return;
    ({ words, warnings } = data);
    renderWelcome();
  } catch (error) {
    if (request !== loadRequest || subject !== englishSubject || screen !== 'loading') return;
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

renderHome();
