const STORAGE_KEY = 'interview_tracker_questions';

let questions = [];
let pendingDeleteId = null;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Interview Tracker: could not read localStorage.', err);
    return [];
  }
}

function saveToStorage() {
  const dot  = document.getElementById('save-dot');
  const text = document.getElementById('save-text');

  dot.classList.add('save-dot--saving');
  text.textContent = 'Saving…';

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions));
  } catch (err) {
    console.error('Interview Tracker: could not write localStorage.', err);
    text.textContent = 'Save failed';
    return;
  }

  setTimeout(() => {
    dot.classList.remove('save-dot--saving');
    text.textContent = 'Saved locally';
  }, 600);
}

function generateId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function addQuestion(title, category, difficulty, status) {
  const newQuestion = {
    id:        generateId(),
    title:     title.trim(),
    category,
    difficulty,
    status,
    createdAt: Date.now(),
  };
  questions.push(newQuestion);
  saveToStorage();
}

function updateQuestionStatus(id, newStatus) {
  const question = questions.find(q => q.id === id);
  if (question) {
    question.status = newStatus;
    saveToStorage();
  }
}

function deleteQuestion(id) {
  questions = questions.filter(q => q.id !== id);
  saveToStorage();
}

function updateDashboard() {
  const total = questions.length;

  const dsaAll       = questions.filter(q => q.category === 'DSA');
  const dsaDone      = dsaAll.filter(q => q.status === 'Completed');

  const interviewCategories = ['Git & GitHub', 'Full-Stack Technical'];
  const interviewAll  = questions.filter(q => interviewCategories.includes(q.category));
  const interviewDone = interviewAll.filter(q => q.status === 'Completed');

  const machineAll   = questions.filter(q => q.category === 'Machine Coding');
  const machineDone  = machineAll.filter(q => q.status === 'Completed');

  const completedTotal = questions.filter(q => q.status === 'Completed').length;
  const overallPercent = total > 0 ? Math.round((completedTotal / total) * 100) : 0;

  document.getElementById('stat-total').textContent     = total;
  document.getElementById('stat-dsa').textContent       = dsaDone.length;
  document.getElementById('stat-dsa-sub').textContent   = `of ${dsaAll.length} DSA question${dsaAll.length !== 1 ? 's' : ''}`;
  document.getElementById('stat-interview').textContent    = interviewDone.length;
  document.getElementById('stat-interview-sub').textContent = `of ${interviewAll.length} interview question${interviewAll.length !== 1 ? 's' : ''}`;

  if (machineAll.length === 0) {
    document.getElementById('stat-machine').textContent     = '—';
    document.getElementById('stat-machine-sub').textContent = 'no machine coding questions';
  } else {
    document.getElementById('stat-machine').textContent     = `${machineDone.length} / ${machineAll.length}`;
    document.getElementById('stat-machine-sub').textContent =
      machineDone.length === machineAll.length
        ? 'all completed ✓'
        : `${machineAll.length - machineDone.length} remaining`;
  }

  const progressFill  = document.getElementById('progress-fill');
  const progressPct   = document.getElementById('progress-percent');
  const progressTrack = document.getElementById('progress-track');

  progressFill.style.width          = `${overallPercent}%`;
  progressPct.textContent           = `${overallPercent}%`;
  progressTrack.setAttribute('aria-valuenow', overallPercent);
}

function difficultyClass(difficulty) {
  const map = { Easy: 'chip--easy', Medium: 'chip--medium', Hard: 'chip--hard' };
  return map[difficulty] || 'chip--medium';
}

function buildQuestionElement(question) {
  const item = document.createElement('div');
  item.className = 'question-item' + (question.status === 'Completed' ? ' is-completed' : '');
  item.setAttribute('role', 'listitem');
  item.dataset.id = question.id;

  const titleEl = document.createElement('div');
  titleEl.className = 'question-title';
  titleEl.textContent = question.title;
  item.appendChild(titleEl);

  const meta = document.createElement('div');
  meta.className = 'question-meta';

  const catChip = document.createElement('span');
  catChip.className = 'chip chip--category';
  catChip.textContent = question.category;
  meta.appendChild(catChip);

  const diffChip = document.createElement('span');
  diffChip.className = `chip ${difficultyClass(question.difficulty)}`;
  diffChip.textContent = question.difficulty;
  meta.appendChild(diffChip);

  item.appendChild(meta);

  const controls = document.createElement('div');
  controls.className = 'question-controls';

  const statusSelect = document.createElement('select');
  statusSelect.className = 'status-select';
  statusSelect.setAttribute('aria-label', `Status for: ${question.title}`);
  statusSelect.dataset.status = question.status;

  ['Pending', 'In Progress', 'Completed'].forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt;
    if (opt === question.status) option.selected = true;
    statusSelect.appendChild(option);
  });

  statusSelect.addEventListener('change', () => {
    updateQuestionStatus(question.id, statusSelect.value);
    statusSelect.dataset.status = statusSelect.value;
    updateDashboard();
    renderQuestions();
  });

  controls.appendChild(statusSelect);

  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.type = 'button';
  deleteBtn.setAttribute('aria-label', `Delete question: ${question.title}`);
  deleteBtn.innerHTML =
    `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
       <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
     </svg>`;

  deleteBtn.addEventListener('click', () => openDeleteDialog(question.id, question.title));
  controls.appendChild(deleteBtn);

  item.appendChild(controls);
  return item;
}

function getCurrentFilters() {
  return {
    search:     document.getElementById('filter-search').value.trim().toLowerCase(),
    category:   document.getElementById('filter-category').value,
    status:     document.getElementById('filter-status').value,
    difficulty: document.getElementById('filter-difficulty').value,
  };
}

function getFilteredQuestions() {
  const { search, category, status, difficulty } = getCurrentFilters();

  return questions.filter(q => {
    const matchesSearch     = !search     || q.title.toLowerCase().includes(search);
    const matchesCategory   = !category  || q.category  === category;
    const matchesStatus     = !status    || q.status    === status;
    const matchesDifficulty = !difficulty || q.difficulty === difficulty;
    return matchesSearch && matchesCategory && matchesStatus && matchesDifficulty;
  });
}

function renderQuestions() {
  const listEl         = document.getElementById('question-list');
  const emptyNoQ       = document.getElementById('empty-state-no-questions');
  const emptyNoResults = document.getElementById('empty-state-no-results');

  listEl.innerHTML = '';
  emptyNoQ.hidden = true;
  emptyNoResults.hidden = true;

  if (questions.length === 0) {
    emptyNoQ.hidden = false;
    return;
  }

  const filtered = getFilteredQuestions();

  if (filtered.length === 0) {
    emptyNoResults.hidden = false;
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'question-list-inner';

  filtered.forEach(question => {
    wrapper.appendChild(buildQuestionElement(question));
  });

  listEl.appendChild(wrapper);
}

function clearFilters() {
  document.getElementById('filter-search').value      = '';
  document.getElementById('filter-category').value   = '';
  document.getElementById('filter-status').value     = '';
  document.getElementById('filter-difficulty').value = '';
  renderQuestions();
}

function validateForm(title) {
  const titleInput = document.getElementById('q-title');
  const titleError = document.getElementById('title-error');

  if (!title) {
    titleInput.classList.add('error');
    titleError.textContent = 'Please enter a question title.';
    titleInput.focus();
    return false;
  }

  titleInput.classList.remove('error');
  titleError.textContent = '';
  return true;
}

function handleFormSubmit(event) {
  event.preventDefault();

  const titleInput = document.getElementById('q-title');
  const title      = titleInput.value.trim();
  const category   = document.getElementById('q-category').value;
  const difficulty = document.getElementById('q-difficulty').value;
  const status     = document.getElementById('q-status').value;

  if (!validateForm(title)) return;

  addQuestion(title, category, difficulty, status);
  updateDashboard();
  renderQuestions();

  titleInput.value = '';
  titleInput.focus();
}

function openDeleteDialog(id, title) {
  pendingDeleteId = id;
  document.getElementById('dialog-body').textContent =
    `"${title}" will be permanently removed. This cannot be undone.`;
  document.getElementById('confirm-dialog').hidden = false;
  document.getElementById('dialog-confirm').focus();
}

function closeDeleteDialog() {
  pendingDeleteId = null;
  document.getElementById('confirm-dialog').hidden = true;
}

function confirmDelete() {
  if (!pendingDeleteId) return;
  deleteQuestion(pendingDeleteId);
  closeDeleteDialog();
  updateDashboard();
  renderQuestions();
}

function wireEvents() {
  document.getElementById('question-form').addEventListener('submit', handleFormSubmit);

  document.getElementById('q-title').addEventListener('input', () => {
    const titleInput = document.getElementById('q-title');
    if (titleInput.classList.contains('error') && titleInput.value.trim()) {
      titleInput.classList.remove('error');
      document.getElementById('title-error').textContent = '';
    }
  });

  document.getElementById('filter-search').addEventListener('input', renderQuestions);
  document.getElementById('filter-category').addEventListener('change', renderQuestions);
  document.getElementById('filter-status').addEventListener('change', renderQuestions);
  document.getElementById('filter-difficulty').addEventListener('change', renderQuestions);

  document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

  document.getElementById('dialog-cancel').addEventListener('click', closeDeleteDialog);
  document.getElementById('dialog-confirm').addEventListener('click', confirmDelete);

  document.getElementById('confirm-dialog').addEventListener('click', function (e) {
    if (e.target === this) closeDeleteDialog();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('confirm-dialog').hidden) {
      closeDeleteDialog();
    }
  });
}

function init() {
  questions = loadFromStorage();
  updateDashboard();
  renderQuestions();
  wireEvents();
}

document.addEventListener('DOMContentLoaded', init);