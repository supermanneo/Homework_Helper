import './style.css';
import { answerCurrent, createRound, englishDifficulties } from './quiz.js';
import { subjects } from './subjects.js';
import { isValidMathAnswer, mathModes } from './math.js';
import { appendScore, formatCompletionTime, historyGroups, percentageScore, readScores } from './history.js';
import { scoreChart } from './score-chart.js';
import { createKeypad, createLetterEntry, editLetterEntry, letterAnswer, editNumber } from './input.js';
import { pinyinCard, pinyinGroups } from './pinyin.js';

const app = document.querySelector('#app');
let subject = null;
let words = [];
let warnings = [];
let round;
let questionIndex = 0;
let screen = 'loading';
let reviewMode = 'easy';
let mathMode = 'arithmetic';
let englishScoreState = { saved: false };
let loadRequest = 0;

function modeLabel() {
  return `全部单词复习 · ${englishDifficulties.find(item => item.id === reviewMode).name}`;
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
  const navigation = element('nav', 'header-nav');
  navigation.setAttribute('aria-label', '学习导航');
  navigation.append(button('成绩记录', 'secondary', () => renderHistory(currentHistoryGroup())));
  if (subject?.kind === 'worksheet' && screen === 'math') {
    navigation.append(button('← 数学练习', 'secondary', renderMathWelcome));
  }
  if (subject || screen === 'history') navigation.append(button('← 乐园首页', 'secondary home-link', renderHome));
  header.append(navigation);
  const main = element('main', `main screen-${screen}`);
  const footer = element('footer', 'footer', '每天进步一点点，快乐学习每一天。');
  app.append(header, main, footer);
  return main;
}

function currentHistoryGroup() {
  return subject?.kind === 'worksheet' ? `math-${mathMode}` : `english-${reviewMode}`;
}

function saveCompletedScore(group, score, state, host) {
  state.completedAt ??= new Date().toISOString();
  const attempt = () => {
    host.replaceChildren();
    try {
      if (!state.saved) {
        appendScore(group, score, globalThis.localStorage, state.completedAt);
        state.saved = true;
      }
      host.append(element('span', '', '本轮得分已保存'));
    } catch (error) {
      host.append(element('span', 'error-message',
        `得分未保存：${error instanceof Error ? error.message : String(error)}。请检查浏览器存储权限。`),
      button('重试保存', 'secondary', attempt));
    }
  };
  host.setAttribute('role', 'status');
  attempt();
}

function renderHistory(group = currentHistoryGroup()) {
  screen = 'history';
  const main = shell();
  const heading = element('div', 'history-heading');
  heading.append(element('h1', '', '我的得分曲线'),
    element('p', 'intro', '每组最近20次 · 满分100分 · 从旧到新'));
  main.append(heading);
  const tabs = element('div', 'history-tabs');
  tabs.setAttribute('role', 'group');
  tabs.setAttribute('aria-label', '成绩分组');
  historyGroups.forEach(item => {
    const tab = button(item.name, item.id === group ? 'primary' : 'secondary', () => renderHistory(item.id));
    tab.setAttribute('aria-pressed', String(item.id === group));
    tabs.append(tab);
  });
  main.append(tabs);
  const card = element('section', 'card history-card');
  const name = historyGroups.find(item => item.id === group).name;
  card.append(element('h2', '', name));
  try {
    const scores = readScores(group);
    if (!scores.length) card.append(element('p', 'history-empty', '还没有成绩。完成一轮练习，就能看到你的进步！'));
    else {
      card.append(scoreChart(scores, name));
      const details = element('details', 'score-details');
      details.append(element('summary', '', `查看${scores.length}次具体得分（从旧到新）`));
      const list = element('ol', 'score-list');
      scores.forEach(record => list.append(element('li', '', `${record.score} 分 · ${formatCompletionTime(record.completedAt)}`)));
      details.append(list);
      card.append(details);
    }
  } catch (error) {
    const message = element('p', 'error-message', `无法读取成绩：${error instanceof Error ? error.message : String(error)}`);
    message.setAttribute('role', 'alert');
    card.append(message, button('重新读取', 'primary', () => renderHistory(group)));
  }
  main.append(card, element('p', 'history-note muted', '时间按当前设备时区显示；旧记录时间未知。仅存当前浏览器，不同设备不互通，清除站点数据可能丢失。'));
  window.scrollTo(0, 0);
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
  else if (item.kind === 'worksheet') renderMathWelcome();
  else if (item.kind === 'pinyin-reading') renderPinyin();
}

function renderPinyin() {
  screen = 'pinyin';
  const main = shell();
  const heading = element('div', 'pinyin-heading');
  heading.append(element('h1', '', '拼音认读表'),
    element('p', 'muted', '看一看，读一读 · 四线三格'));
  const board = element('div', 'pinyin-board');
  pinyinGroups.forEach(group => {
    const panel = element('section', `pinyin-panel pinyin-${group.id}`);
    const count = group.sections.reduce((total, section) => total + section.items.length, 0);
    panel.append(element('h2', '', `${group.name} · ${count}个`));
    group.sections.forEach(section => {
      const row = element('div', 'pinyin-section');
      if (group.sections.length > 1) row.append(element('h3', '', section.name));
      const list = element('ul', 'pinyin-items');
      list.setAttribute('aria-label', section.name);
      section.items.forEach(text => {
        const item = element('li');
        item.append(pinyinCard(text));
        list.append(item);
      });
      row.append(list);
      panel.append(row);
    });
    board.append(panel);
  });
  main.append(heading, board);
  window.scrollTo(0, 0);
}

function renderMathWelcome() {
  screen = 'math-welcome';
  const main = shell();
  main.append(element('p', 'eyebrow', '数学 · 算一算'),
    element('h1', '', '今天练什么？'),
    element('p', 'intro', '每轮10题 · 每题10分 · 用数字大按键作答'));
  const grid = element('div', 'math-mode-grid');
  mathModes.forEach(mode => {
    const card = element('section', 'card difficulty-card');
    card.append(element('h2', '', `${mode.name}练习`), element('p', 'intro', mode.description),
      button(`开始${mode.name}练习`, 'primary', () => {
        mathMode = mode.id;
        renderMath();
      }));
    grid.append(card);
  });
  main.append(grid);
  window.scrollTo(0, 0);
}

function renderMath() {
  screen = 'math';
  const mathSubject = subject;
  const mode = mathModes.find(item => item.id === mathMode);
  const questions = mathSubject.createWorksheet(Math.random, mode.id);
  const main = shell();
  const heading = element('div', 'math-heading');
  heading.append(element('h1', '', mode.title),
    element('p', 'intro', '10题 · 每题10分 · 全部填好再提交'));
  main.append(element('p', 'eyebrow', '数学 · 算一算'),
    heading,
    element('p', 'math-rules muted', `${mode.description}离开后不保留答案。`));
  const form = element('form', 'math-form');
  form.noValidate = true;
  const summary = element('section', 'math-summary');
  const grid = element('div', 'math-grid');
  const inputs = [];
  const rows = [];
  const feedbacks = [];
  let activeInput = 0;
  function enterNumber(key) {
    if (submitted) return;
    const input = inputs[activeInput];
    if (/^\d$/.test(key) && input.value.length >= 3) {
      error.textContent = '最多输入3位数字，可先删除或清空。';
      return;
    }
    input.value = editNumber(input.value, key);
    input.removeAttribute('aria-invalid');
    feedbacks[activeInput].textContent = '';
    error.textContent = '';
    progress.textContent = `已填写 ${inputs.filter(field => field.value !== '').length} / 10 题`;
    selectMathInput(activeInput, true);
  }
  const keypad = createKeypad('math', enterNumber,
    [{ label: '下一题', run: () => selectMathInput((activeInput + 1) % inputs.length, true) }]);
  function selectMathInput(index, focus = false) {
    if (submitted) return;
    activeInput = index;
    inputs.forEach((input, i) => {
      rows[i].classList.toggle('input-active', i === index);
      input.setAttribute('aria-label', `第${i + 1}题答案${i === index ? '，当前输入' : ''}`);
    });
    const question = questions[index];
    keypad.target.textContent = `第 ${index + 1} 题：${question.left} ${question.operator} ${question.right} = ${inputs[index].value || '？'}`;
    if (focus) inputs[index].focus({ preventScroll: true });
  }
  function mathKeydown(event) {
    if (submitted || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
    const key = /^\d$/.test(event.key) ? event.key : event.key === 'Backspace' ? 'delete' : event.key === 'Delete' ? 'clear' : null;
    if (!key) return;
    event.preventDefault();
    enterNumber(key);
  }
  keypad.panel.addEventListener('keydown', mathKeydown);
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
    input.inputMode = 'none';
    input.readOnly = true;
    input.pattern = '[0-9]{1,3}';
    input.maxLength = 3;
    input.required = true;
    input.autocomplete = 'off';
    input.setAttribute('enterkeyhint', index === questions.length - 1 ? 'done' : 'next');
    input.setAttribute('aria-describedby', `math-feedback-${index}`);
    const feedback = element('p', 'math-feedback');
    feedback.id = `math-feedback-${index}`;
    input.addEventListener('focus', () => selectMathInput(index));
    input.addEventListener('click', () => selectMathInput(index));
    input.addEventListener('keydown', event => {
      selectMathInput(index);
      mathKeydown(event);
      if (event.key === 'Enter' && !submitted && !event.isComposing && !event.repeat) {
        event.preventDefault();
        if (index < inputs.length - 1) selectMathInput(index + 1, true);
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
  const scoreState = { saved: false };
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
      selectMathInput(invalid, true);
      return;
    }
    const result = mathSubject.gradeWorksheet(questions, inputs.map(input => input.value));
    submitted = true;
    keypad.panel.remove();
    workspace.classList.remove('input-workspace');
    rows.forEach(row => row.classList.remove('input-active'));
    main.classList.add('math-graded');
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
    const heading = element('h2', '', `${mode.name}成绩`);
    heading.tabIndex = -1;
    const saveNotice = element('p', 'save-notice');
    const scoreTitle = element('div', 'math-score-title');
    scoreTitle.append(heading, saveNotice);
    summary.append(scoreTitle, element('p', 'score', `${result.score} 分`),
      element('p', 'math-result-count', `答对 ${result.correctCount} / 10 题`),
      element('p', 'math-encouragement', result.correctCount === 10 ? '全部答对，真棒！' : '看看错题，下次一定更熟练！'),
      button('再来一轮  ↻', 'primary', renderMath),
      button('返回数学练习', 'secondary', renderMathWelcome));
    heading.focus();
    saveCompletedScore(`math-${mode.id}`, result.score, scoreState, saveNotice);
  });
  form.append(summary, progress, grid, error, submit);
  const workspace = element('div', 'input-workspace math-workspace');
  workspace.append(form, keypad.panel);
  main.append(workspace);
  selectMathInput(0);
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
  englishScoreState = { saved: false };
  questionIndex = 0;
  screen = 'quiz';
  renderQuestion();
  window.scrollTo(0, 0);
}

function renderWelcome() {
  screen = 'welcome';
  const main = shell();
  main.append(element('p', 'eyebrow', '英语 · 单词复习'),
    element('h1', '', '全部单词复习'),
    element('p', 'intro', `本轮${words.length}个单词，随机排序，每词练一次。`));
  const card = element('section', 'card welcome-card');
  card.append(element('h2', '', '选一个难度，开始吧！'));
  const modes = element('div', 'difficulty-grid');
  englishDifficulties.forEach(item => {
    const panel = element('div', 'difficulty-card');
    panel.append(element('p', '', item.description),
      button(`开始${item.name}复习`, 'primary', () => start(item.id)));
    modes.append(panel);
  });
  card.append(modes);
  main.append(card);
  warningPanel(main);
  window.scrollTo(0, 0);
}

function renderQuestion() {
  const question = round.questions[questionIndex];
  const result = round.answers[questionIndex];
  const challenge = question.kind === 'challenge';
  const main = shell();
  const top = element('div', 'quiz-top');
  top.append(element('span', 'eyebrow', challenge ? '看中文，写单词' : '把缺失的字母找回来'),
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
    if (challenge) spelling.append(element('span', 'filled-letter', result.selected));
    else [...question.masked].forEach((letter, index) => {
      const blankIndex = question.blanks.indexOf(index);
      spelling.append(blankIndex === -1
        ? document.createTextNode(letter)
        : element('span', 'filled-letter', result.selected[blankIndex]));
    });
  }
  spelling.setAttribute('aria-label', `${result ? '所选拼写' : '缺字单词'}：${spelling.textContent.split('').join(' ')}`);
  prompt.append(spelling, element('span', 'meaning', question.word.chinese));
  card.append(element('p', 'question-label', challenge ? '根据中文释义，输入完整单词' : '选择正确的字母组合'), prompt,
    element('p', 'hint', result
      ? '蓝色字母为你选择的补全，请查看下方答案'
      : challenge ? `${question.blanks.length}个字母，点下划线可修改位置` : `缺少 ${question.blanks.length} 个字母，请按从左到右的顺序补入`));
  let keypadPanel;
  if (challenge) {
    if (!result) {
      const entry = createLetterEntry(question.word.english);
      const error = element('p', 'form-error');
      error.id = 'challenge-error';
      error.setAttribute('role', 'alert');
      const slots = [];
      function selectSlot(index, focus = false) {
        entry.active = index;
        slots.forEach((slot, i) => {
          slot.classList.toggle('input-active', i === index);
          slot.setAttribute('aria-pressed', String(i === index));
        });
        keypad.target.textContent = `第 ${index + 1} / ${slots.length} 个字母`;
        if (focus) slots[index].focus({ preventScroll: true });
      }
      function enterLetter(key) {
        editLetterEntry(entry, key);
        slots.forEach((slot, i) => {
          slot.textContent = entry.letters[i] || '_';
          slot.classList.toggle('filled-letter', Boolean(entry.letters[i]));
          slot.setAttribute('aria-label', `第${i + 1}个字母，${entry.letters[i] || '未填写'}`);
          slot.removeAttribute('aria-invalid');
        });
        error.textContent = '';
        selectSlot(entry.active, true);
      }
      function submitLetters() {
        const answer = letterAnswer(entry);
        if (answer === null) {
          error.textContent = '请先填好每一个字母，再提交答案。';
          const empty = entry.letters.findIndex(letter => !letter);
          slots[empty].setAttribute('aria-invalid', 'true');
          selectSlot(empty, true);
          return;
        }
        selectAnswer(answer);
      }
      const keypad = createKeypad('english', enterLetter, [{ label: '提交答案', run: submitLetters }]);
      keypadPanel = keypad.panel;
      spelling.classList.add('letter-slots');
      spelling.replaceChildren();
      spelling.setAttribute('aria-label', '点击下划线选择字母位置');
      [...question.masked].forEach((letter, position) => {
        const index = entry.positions.indexOf(position);
        if (index < 0) spelling.append(element('span', 'letter-separator', letter));
        else {
          const slot = button('_', 'letter-slot', () => selectSlot(index));
          slot.setAttribute('aria-label', `第${index + 1}个字母，未填写`);
          slot.setAttribute('aria-describedby', error.id);
          slot.addEventListener('focus', () => selectSlot(index));
          slots.push(slot);
          spelling.append(slot);
        }
      });
      function letterKeydown(event) {
        if (event.isComposing || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
        const key = /^[a-z]$/i.test(event.key) ? event.key : event.key === 'Backspace' ? 'delete' : event.key === 'Delete' ? 'clear' : null;
        if (key) {
          event.preventDefault();
          event.stopPropagation();
          enterLetter(key);
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          selectSlot(Math.max(0, Math.min(slots.length - 1, entry.active + (event.key === 'ArrowLeft' ? -1 : 1))), true);
        } else if (event.key === 'Enter' && event.target.classList.contains('letter-slot')) {
          event.preventDefault();
          event.stopPropagation();
          submitLetters();
        }
      }
      spelling.addEventListener('keydown', letterKeydown);
      keypad.panel.addEventListener('keydown', letterKeydown);
      selectSlot(0);
      card.append(error);
    }
  } else {
    const options = element('div', 'options');
    question.options.forEach((option, index) => {
      const choice = button('', 'option', () => selectAnswer(option));
      choice.append(element('span', 'option-number', String(index + 1)),
        element('span', 'option-letters', [...option].join(option.length > 3 ? ' ' : ' · ')));
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
  }
  const feedback = element('div', 'feedback');
  feedback.setAttribute('role', 'status');
  feedback.setAttribute('aria-live', 'polite');
  card.append(feedback);
  if (keypadPanel) {
    const workspace = element('div', 'input-workspace challenge-workspace');
    workspace.append(card, keypadPanel);
    main.append(workspace);
  } else main.append(card);
  main.append(element('p', 'keyboard-tip', challenge ? '也可用电脑键盘输入字母，Enter 提交或继续' : '也可以按 1–4 选择，按 Enter 继续'));
  if (result) {
    feedback.classList.add(result.correct ? 'success' : 'retry');
    feedback.append(element('strong', '', result.correct ? '答对了，继续保持！' : '没关系，再记住一次。'),
      element('p', '', challenge ? `正确单词：${question.word.english}` : `正确补全：${[...question.answer].join(' · ')}　完整单词：${question.word.english}`));
    const next = button(questionIndex === round.questions.length - 1 ? '查看成绩  →' : '下一题  →', 'primary next', advance);
    card.append(next);
    next.focus({ preventScroll: true });
  } else {
    const focusTarget = spelling.querySelector('.letter-slot') || spelling;
    if (focusTarget === spelling) spelling.tabIndex = -1;
    focusTarget.focus({ preventScroll: true });
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
    button('返回英语', 'secondary', renderWelcome),
    button('查看得分曲线', 'secondary', () => renderHistory(`english-${reviewMode}`)));
  const saveNotice = element('p', 'save-notice');
  main.append(card, saveNotice);
  saveCompletedScore(`english-${reviewMode}`, percentageScore(score, round.questions.length), englishScoreState, saveNotice);
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
  if (screen !== 'quiz' || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return;
  const question = round.questions[questionIndex];
  if (question.kind === 'challenge' && !round.answers[questionIndex]) return;
  if (/^[1-4]$/.test(event.key) && !round.answers[questionIndex]) {
    event.preventDefault();
    selectAnswer(question.options[Number(event.key) - 1]);
  } else if (event.key === 'Enter' && round.answers[questionIndex]) {
    event.preventDefault();
    advance();
  }
});

renderHome();
