const DEFAULT_SENTENCES = [
  { english: "Practice makes perfect.", chinese: "熟能生巧。" },
  { english: "Actions speak louder than words.", chinese: "行动胜于言语。" },
  { english: "Where there is a will, there is a way.", chinese: "有志者事竟成。" },
  { english: "Every day is a new beginning.", chinese: "每一天都是新的开始。" },
  { english: "Knowledge is power.", chinese: "知识就是力量。" },
  { english: "Time waits for no one.", chinese: "时间不等人。" }
];

const DEFAULT_STUDENTS = ["张三", "李四", "王五", "赵六", "钱七", "孙八"];

const STORAGE_KEYS = {
  sentences: "english-picker-sentences",
  students: "english-picker-students"
};

let sentences = [];
let students = [];
let currentResults = [];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function randomInt(max) {
  if (max <= 0) return 0;
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] % max;
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

async function loadJson(path, fallback) {
  try {
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.json();
  } catch {
    return fallback;
  }
}

function loadLocal(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEYS.sentences, JSON.stringify(sentences));
  localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
  renderAll();
}

async function initializeData() {
  const fileSentences = await loadJson("data/sentences.json", DEFAULT_SENTENCES);
  const fileStudents = await loadJson("data/students.json", DEFAULT_STUDENTS);
  sentences = loadLocal(STORAGE_KEYS.sentences, fileSentences);
  students = loadLocal(STORAGE_KEYS.students, fileStudents);
  renderAll();
}

function renderAll() {
  $("#student-count").textContent = students.length;
  $("#sentence-count").textContent = sentences.length;
  $("#draw-count").max = Math.max(students.length, 1);
  renderSentenceList();
  renderStudentList();
  renderResults();
}

function renderSentenceList() {
  const list = $("#sentence-list");
  if (!sentences.length) {
    list.innerHTML = '<div class="empty">句子库还是空的，先添加几条英语句子和中文释义。</div>';
    return;
  }

  list.innerHTML = sentences.map((item, index) => `
    <article class="list-item">
      <div>
        <p class="sentence-english">${escapeHtml(item.english)}</p>
        <p class="sentence-chinese">${escapeHtml(item.chinese)}</p>
      </div>
      <button class="danger" type="button" data-delete-sentence="${index}">删除</button>
    </article>
  `).join("");
}

function renderStudentList() {
  const list = $("#student-list");
  if (!students.length) {
    list.innerHTML = '<div class="empty">学生名单还是空的，先添加班级学生。</div>';
    return;
  }

  list.innerHTML = students.map((name, index) => `
    <article class="list-item">
      <p class="item-title">${escapeHtml(name)}</p>
      <button class="danger" type="button" data-delete-student="${index}">删除</button>
    </article>
  `).join("");
}

function renderResults() {
  const container = $("#results");
  const showEnglish = $("#show-english").checked;
  if (!currentResults.length) {
    container.innerHTML = '<div class="empty">点击“开始随机抽签”，这里会出现随机匹配结果。</div>';
    return;
  }

  container.innerHTML = currentResults.map((result, index) => `
    <article class="result-card">
      <div class="result-top">
        <div class="student-name">${escapeHtml(result.student)}</div>
      </div>
      <div class="meaning">${escapeHtml(result.sentence.chinese)}</div>
      ${showEnglish ? `<div class="english">${escapeHtml(result.sentence.english)}</div>` : ""}
      <div class="card-actions">
        <button class="ghost" type="button" data-change-student="${index}">换人</button>
        <button class="ghost" type="button" data-change-sentence="${index}">换句子</button>
      </div>
    </article>
  `).join("");
}

function draw() {
  const notice = $("#draw-notice");
  notice.textContent = "";

  if (!students.length || !sentences.length) {
    notice.textContent = "需要至少 1 名学生和 1 个句子才能抽签。";
    currentResults = [];
    renderResults();
    return;
  }

  const requestedCount = Number($("#draw-count").value) || 1;
  const drawCount = Math.min(Math.max(requestedCount, 1), students.length);
  if (requestedCount > students.length) {
    notice.textContent = `学生只有 ${students.length} 名，本轮已按 ${students.length} 名抽取。`;
  }

  const randomStudents = shuffle(students).slice(0, drawCount);
  const randomSentences = shuffle(sentences);
  currentResults = randomStudents.map((student, index) => ({
    student,
    sentence: randomSentences[index % randomSentences.length]
  }));

  renderResults();
}

function changeStudent(index) {
  const used = new Set(currentResults.map((result) => result.student));
  used.delete(currentResults[index].student);
  const candidates = students.filter((student) => !used.has(student));

  if (!candidates.length) {
    $("#draw-notice").textContent = "没有可替换的学生了，可以减少抽取人数或添加更多学生。";
    return;
  }

  currentResults[index].student = shuffle(candidates)[0];
  $("#draw-notice").textContent = "已随机换人。";
  renderResults();
}

function changeSentence(index) {
  const used = new Set(currentResults.map((result) => result.sentence.chinese));
  used.delete(currentResults[index].sentence.chinese);
  let candidates = sentences.filter((sentence) => !used.has(sentence.chinese));

  if (!candidates.length) {
    candidates = sentences;
  }

  currentResults[index].sentence = shuffle(candidates)[0];
  $("#draw-notice").textContent = "已随机换句子。";
  renderResults();
}

function addSentence(event) {
  event.preventDefault();
  const english = $("#english-input").value.trim();
  const chinese = $("#chinese-input").value.trim();
  if (!english || !chinese) return;

  sentences.push({ english, chinese });
  $("#english-input").value = "";
  $("#chinese-input").value = "";
  saveData();
}

function addStudent(event) {
  event.preventDefault();
  const name = $("#student-input").value.trim();
  if (!name) return;

  if (!students.includes(name)) {
    students.push(name);
    $("#student-input").value = "";
    saveData();
  }
}

function importSentences() {
  const lines = $("#sentence-bulk").value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const imported = [];

  for (const line of lines) {
    const parts = line.split("|").map((part) => part.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      imported.push({ english: parts[0], chinese: parts.slice(1).join("|") });
    }
  }

  if (imported.length) {
    sentences.push(...imported);
    $("#sentence-bulk").value = "";
    saveData();
  }
}

function importStudents() {
  const names = $("#student-bulk").value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const uniqueNames = names.filter((name) => !students.includes(name));

  if (uniqueNames.length) {
    students.push(...uniqueNames);
    $("#student-bulk").value = "";
    saveData();
  }
}

function deleteSentence(index) {
  sentences.splice(index, 1);
  currentResults = [];
  saveData();
}

function deleteStudent(index) {
  students.splice(index, 1);
  currentResults = [];
  saveData();
}

function resetSentences() {
  sentences = [...DEFAULT_SENTENCES];
  currentResults = [];
  saveData();
}

function resetStudents() {
  students = [...DEFAULT_STUDENTS];
  currentResults = [];
  saveData();
}

function downloadData() {
  const payload = {
    sentences,
    students,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "english-picker-data.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      $$(".tab").forEach((item) => item.classList.remove("active"));
      $$(".panel").forEach((panel) => panel.classList.remove("active"));
      tab.classList.add("active");
      $(`#${tab.dataset.tab}`).classList.add("active");
    });
  });

  $("#draw-button").addEventListener("click", draw);
  $("#clear-button").addEventListener("click", () => {
    currentResults = [];
    $("#draw-notice").textContent = "";
    renderResults();
  });
  $("#show-english").addEventListener("change", renderResults);
  $("#sentence-form").addEventListener("submit", addSentence);
  $("#student-form").addEventListener("submit", addStudent);
  $("#import-sentences").addEventListener("click", importSentences);
  $("#import-students").addEventListener("click", importStudents);
  $("#reset-sentences").addEventListener("click", resetSentences);
  $("#reset-students").addEventListener("click", resetStudents);
  $("#download-data").addEventListener("click", downloadData);

  document.addEventListener("click", (event) => {
    const sentenceDelete = event.target.closest("[data-delete-sentence]");
    const studentDelete = event.target.closest("[data-delete-student]");
    const studentChange = event.target.closest("[data-change-student]");
    const sentenceChange = event.target.closest("[data-change-sentence]");

    if (sentenceDelete) deleteSentence(Number(sentenceDelete.dataset.deleteSentence));
    if (studentDelete) deleteStudent(Number(studentDelete.dataset.deleteStudent));
    if (studentChange) changeStudent(Number(studentChange.dataset.changeStudent));
    if (sentenceChange) changeSentence(Number(sentenceChange.dataset.changeSentence));
  });
}

bindEvents();
initializeData();
