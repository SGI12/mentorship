(function () {
  "use strict";

  const STORAGE_KEY = "mentorship-tic-tac-toe-history";

  const WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];

  /* ---------- История партий: данные — источник истины ---------- */

  let historyRecords = [];
  let selectedLetter = null;

  let formMode = "add";
  let editingId = null;
  let lastFinishedGame = null;

  function loadHistoryFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        historyRecords = [];
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        historyRecords = [];
        return;
      }
      historyRecords = parsed.filter(
        (r) =>
          r &&
          typeof r.id === "string" &&
          typeof r.title === "string" &&
          ["X", "O", "draw"].includes(r.outcome) &&
          typeof r.moves === "number"
      );
    } catch {
      historyRecords = [];
    }
  }

  function persistHistory() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(historyRecords));
  }

  function newId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function firstLetterKey(title) {
    const t = (title || "").trim();
    if (!t) return "#";
    const ch = t[0];
    try {
      if (/^\p{L}$/u.test(ch)) {
        return ch.toLocaleUpperCase("ru-RU");
      }
    } catch {
      if (/[a-zA-Zа-яА-ЯёЁ]/.test(ch)) {
        return ch.toUpperCase();
      }
    }
    return "#";
  }

  function letterCountsMap() {
    const m = new Map();
    for (const r of historyRecords) {
      const k = firstLetterKey(r.title);
      m.set(k, (m.get(k) || 0) + 1);
    }
    return m;
  }

  function sortedLetterKeys(map) {
    return Array.from(map.keys()).sort((a, b) =>
      a.localeCompare(b, "ru", { sensitivity: "base" })
    );
  }

  function validateRecordFields(titleRaw, outcome, movesRaw) {
    const errors = { title: "", outcome: "", moves: "" };
    const title = (titleRaw || "").trim();
    if (!title) {
      errors.title = "Введите название записи.";
    } else if (title.length > 80) {
      errors.title = "Не длиннее 80 символов.";
    }

    if (!["X", "O", "draw"].includes(outcome)) {
      errors.outcome = "Выберите итог партии.";
    }

    const movesStr = String(movesRaw || "").trim();
    if (!movesStr) {
      errors.moves = "Укажите число ходов.";
    } else if (!/^\d+$/.test(movesStr)) {
      errors.moves = "Только цифры.";
    } else {
      const n = parseInt(movesStr, 10);
      if (n < 1 || n > 9) {
        errors.moves = "От 1 до 9.";
      }
    }

    const ok = !errors.title && !errors.outcome && !errors.moves;
    return {
      ok,
      errors,
      title,
      moves: ok ? parseInt(String(movesRaw || "").trim(), 10) : 0,
    };
  }

  function showFieldErrors(errors) {
    const map = [
      ["errTitle", errors.title],
      ["errOutcome", errors.outcome],
      ["errMoves", errors.moves],
    ];
    for (const [id, msg] of map) {
      const el = document.getElementById(id);
      if (!el) continue;
      if (msg) {
        el.textContent = msg;
        el.hidden = false;
      } else {
        el.textContent = "";
        el.hidden = true;
      }
    }
  }

  function clearFieldErrors() {
    showFieldErrors({ title: "", outcome: "", moves: "" });
  }

  function outcomeLabel(o) {
    if (o === "X") return "Победил X";
    if (o === "O") return "Победил O";
    return "Ничья";
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const alphabetEl = document.getElementById("alphabet");
  const historyListEl = document.getElementById("historyList");
  const historyEmptyEl = document.getElementById("historyEmpty");

  function renderAlphabet() {
    alphabetEl.textContent = "";
    const counts = letterCountsMap();
    const keys = sortedLetterKeys(counts);

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "alphabet-btn" + (selectedLetter === null ? " is-active" : "");
    allBtn.innerHTML = "Все <span class=\"count\">(" + historyRecords.length + ")</span>";
    allBtn.addEventListener("click", () => {
      selectedLetter = null;
      renderHistoryUI();
    });
    alphabetEl.appendChild(allBtn);

    for (const letter of keys) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "alphabet-btn" + (selectedLetter === letter ? " is-active" : "");
      btn.innerHTML =
        letter +
        ' <span class="count">(' +
        counts.get(letter) +
        ")</span>";
      btn.addEventListener("click", () => {
        selectedLetter = letter;
        renderHistoryUI();
      });
      alphabetEl.appendChild(btn);
    }
  }

  function getDisplayedRecords() {
    if (selectedLetter === null) return historyRecords.slice();
    return historyRecords.filter((r) => firstLetterKey(r.title) === selectedLetter);
  }

  function createHistoryRow(record, listEl) {
    const li = document.createElement("li");
    li.className = "history-item";
    li.dataset.id = record.id;

    const main = document.createElement("div");
    main.className = "history-item-main";

    const titleEl = document.createElement("div");
    titleEl.className = "history-item-title";
    titleEl.textContent = record.title;

    const meta = document.createElement("div");
    meta.className = "history-item-meta";
    meta.textContent =
      outcomeLabel(record.outcome) +
      " · ходов: " +
      record.moves +
      (record.createdAt ? " · " + formatDate(record.createdAt) : "");

    main.appendChild(titleEl);
    main.appendChild(meta);

    const actions = document.createElement("div");
    actions.className = "history-item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-small btn-ghost btn-icon";
    editBtn.setAttribute("aria-label", "Изменить запись");
    editBtn.dataset.action = "edit";
    editBtn.textContent = "✎";

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn btn-small btn-danger btn-icon";
    delBtn.setAttribute("aria-label", "Удалить запись");
    delBtn.dataset.action = "delete";
    delBtn.textContent = "✕";

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    li.appendChild(main);
    li.appendChild(actions);
    listEl.appendChild(li);
  }

  function renderHistoryList() {
    historyListEl.textContent = "";
    const rows = getDisplayedRecords();
    for (const r of rows) {
      createHistoryRow(r, historyListEl);
    }
  }

  function updateEmptyState() {
    const count = getDisplayedRecords().length;
    historyEmptyEl.hidden = count > 0;
    historyListEl.hidden = count === 0;
    if (count === 0 && historyRecords.length > 0) {
      historyEmptyEl.textContent = "Нет записей на выбранную букву.";
    } else if (historyRecords.length === 0) {
      historyEmptyEl.textContent = "Список пуст. Добавь запись или сохрани партию.";
    }
  }

  function renderHistoryUI() {
    renderAlphabet();
    renderHistoryList();
    updateEmptyState();
  }

  function deleteRecordById(id) {
    historyRecords = historyRecords.filter((r) => r.id !== id);
    persistHistory();
    renderHistoryUI();
    refreshSearchIfOpen();
  }

  function openFormModal(mode, preset) {
    formMode = mode;
    editingId = mode === "edit" && preset && preset.id ? preset.id : null;
    const modal = document.getElementById("formModal");
    const titleEl = document.getElementById("formModalTitle");
    const fTitle = document.getElementById("fieldTitle");
    const fOutcome = document.getElementById("fieldOutcome");
    const fMoves = document.getElementById("fieldMoves");

    clearFieldErrors();
    titleEl.textContent = mode === "edit" ? "Изменить запись" : "Новая запись";

    if (mode === "edit" && preset) {
      fTitle.value = preset.title || "";
      fOutcome.value = preset.outcome || "X";
      fMoves.value = preset.moves != null ? String(preset.moves) : "";
    } else {
      fTitle.value = "";
      fOutcome.value = (preset && preset.outcome) || "X";
      fMoves.value =
        preset && preset.moves != null ? String(preset.moves) : "";
    }

    modal.hidden = false;
    fTitle.focus();
  }

  function closeFormModal() {
    document.getElementById("formModal").hidden = true;
    editingId = null;
  }

  function submitRecordForm(e) {
    e.preventDefault();
    const fTitle = document.getElementById("fieldTitle");
    const fOutcome = document.getElementById("fieldOutcome");
    const fMoves = document.getElementById("fieldMoves");

    const { ok, errors, title, moves } = validateRecordFields(
      fTitle.value,
      fOutcome.value,
      fMoves.value
    );
    showFieldErrors(errors);
    if (!ok) return;

    if (formMode === "add") {
      historyRecords.push({
        id: newId(),
        title,
        outcome: fOutcome.value,
        moves,
        createdAt: new Date().toISOString(),
      });
    } else if (formMode === "edit" && editingId) {
      const rec = historyRecords.find((r) => r.id === editingId);
      if (rec) {
        rec.title = title;
        rec.outcome = fOutcome.value;
        rec.moves = moves;
      }
    }

    persistHistory();
    renderHistoryUI();
    closeFormModal();
    refreshSearchIfOpen();
  }

  document.getElementById("btnAddRecord").addEventListener("click", () => {
    openFormModal("add", {});
  });

  document.getElementById("formModalCancel").addEventListener("click", closeFormModal);
  document.getElementById("recordForm").addEventListener("submit", submitRecordForm);

  document.getElementById("btnClearAllRecords").addEventListener("click", () => {
    if (!historyRecords.length) return;
    if (!confirm("Удалить все записи истории?")) return;
    historyRecords = [];
    selectedLetter = null;
    persistHistory();
    renderHistoryUI();
    refreshSearchIfOpen();
  });

  historyListEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest(".history-item");
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    if (btn.dataset.action === "delete") {
      deleteRecordById(id);
      return;
    }
    if (btn.dataset.action === "edit") {
      const rec = historyRecords.find((r) => r.id === id);
      if (rec) openFormModal("edit", rec);
    }
  });

  /* ---------- Модалка поиска ---------- */

  const searchModal = document.getElementById("searchModal");
  const searchInput = document.getElementById("searchInput");
  const searchResultsEl = document.getElementById("searchResults");
  const searchEmptyEl = document.getElementById("searchEmpty");

  function searchMatches(query) {
    const q = query.trim().toLowerCase();
    if (!q) return historyRecords.slice();
    return historyRecords.filter((r) => r.title.toLowerCase().includes(q));
  }

  function renderSearchResults() {
    const list = searchMatches(searchInput.value);
    searchResultsEl.textContent = "";
    for (const r of list) {
      createHistoryRow(r, searchResultsEl);
    }
    searchEmptyEl.hidden = list.length !== 0;
  }

  function refreshSearchIfOpen() {
    if (!searchModal.hidden) {
      renderSearchResults();
    }
  }

  document.getElementById("btnSearchRecords").addEventListener("click", () => {
    searchModal.hidden = false;
    searchInput.value = "";
    renderSearchResults();
    searchInput.focus();
  });

  document.getElementById("searchModalClose").addEventListener("click", () => {
    searchModal.hidden = true;
  });

  searchInput.addEventListener("input", renderSearchResults);

  searchResultsEl.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest(".history-item");
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    if (btn.dataset.action === "delete") {
      deleteRecordById(id);
      return;
    }
    if (btn.dataset.action === "edit") {
      const rec = historyRecords.find((r) => r.id === id);
      if (rec) openFormModal("edit", rec);
    }
  });

  document.getElementById("formModal").addEventListener("click", (e) => {
    if (e.target.id === "formModal") {
      closeFormModal();
    }
  });

  searchModal.addEventListener("click", (e) => {
    if (e.target.id === "searchModal") {
      searchModal.hidden = true;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!document.getElementById("formModal").hidden) {
      closeFormModal();
    } else if (!searchModal.hidden) {
      searchModal.hidden = true;
    }
  });

  /* ---------- Игра ---------- */

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("reset");
  const saveResultBtn = document.getElementById("saveResult");
  const cells = Array.from(boardEl.querySelectorAll(".cell"));

  let board = Array(9).fill(null);
  let current = "X";
  let gameOver = false;

  function renderTurn() {
    statusEl.innerHTML = 'Ход: <span id="current"></span>';
    const el = document.getElementById("current");
    el.textContent = current;
    el.classList.add(current === "X" ? "player-x" : "player-o");
  }

  function renderBoard() {
    cells.forEach((cell, i) => {
      cell.classList.remove("x", "o", "win");
      const v = board[i];
      if (v === "X") cell.classList.add("x");
      if (v === "O") cell.classList.add("o");
      cell.disabled = gameOver || v !== null;
    });
  }

  function highlightWin(line) {
    line.forEach((i) => cells[i].classList.add("win"));
  }

  function checkWinner() {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      const v = board[a];
      if (v && v === board[b] && v === board[c]) {
        return { winner: v, line };
      }
    }
    return null;
  }

  function isDraw() {
    return board.every((cell) => cell !== null);
  }

  function endGame(message) {
    gameOver = true;
    statusEl.textContent = message;
    cells.forEach((cell) => {
      cell.disabled = true;
    });

    const moves = board.filter(Boolean).length;
    const result = checkWinner();
    if (result) {
      lastFinishedGame = { outcome: result.winner, moves };
    } else if (isDraw()) {
      lastFinishedGame = { outcome: "draw", moves };
    } else {
      lastFinishedGame = null;
    }
    saveResultBtn.hidden = !lastFinishedGame;
  }

  function onCellClick(e) {
    const btn = e.target.closest(".cell");
    if (!btn || gameOver) return;
    const i = Number(btn.dataset.index);
    if (board[i] !== null) return;

    board[i] = current;
    const result = checkWinner();

    if (result) {
      renderBoard();
      highlightWin(result.line);
      endGame("Победил: " + result.winner);
      return;
    }

    if (isDraw()) {
      renderBoard();
      endGame("Ничья");
      return;
    }

    current = current === "X" ? "O" : "X";
    renderTurn();
    renderBoard();
  }

  function resetGame() {
    board = Array(9).fill(null);
    current = "X";
    gameOver = false;
    lastFinishedGame = null;
    saveResultBtn.hidden = true;
    renderTurn();
    renderBoard();
  }

  saveResultBtn.addEventListener("click", () => {
    if (!lastFinishedGame) return;
    openFormModal("add", {
      outcome: lastFinishedGame.outcome,
      moves: lastFinishedGame.moves,
    });
  });

  boardEl.addEventListener("click", onCellClick);
  resetBtn.addEventListener("click", resetGame);

  /* ---------- Старт ---------- */

  loadHistoryFromStorage();
  renderHistoryUI();
  renderTurn();
  renderBoard();
})();
