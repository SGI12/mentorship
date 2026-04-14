(function () {
  "use strict";

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

  const boardEl = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const resetBtn = document.getElementById("reset");
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

  function render() {
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
  }

  function onCellClick(e) {
    const btn = e.target.closest(".cell");
    if (!btn || gameOver) return;
    const i = Number(btn.dataset.index);
    if (board[i] !== null) return;

    board[i] = current;
    const result = checkWinner();

    if (result) {
      render();
      highlightWin(result.line);
      endGame("Победил: " + result.winner);
      return;
    }

    if (isDraw()) {
      render();
      endGame("Ничья");
      return;
    }

    current = current === "X" ? "O" : "X";
    renderTurn();
    render();
  }

  function reset() {
    board = Array(9).fill(null);
    current = "X";
    gameOver = false;
    renderTurn();
    render();
  }

  boardEl.addEventListener("click", onCellClick);
  resetBtn.addEventListener("click", reset);

  renderTurn();
  render();
})();
