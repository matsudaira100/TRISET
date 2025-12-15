// main.js

import { drawGrid, createBlock, updateBlockPosition } from './grid.js';

import { showMessage, clearMessage, setupScoreDisplay, updateScore, renderNextBlocksWithWord, pushBonusMessage, updateScoreDelta, updateTimerDisplay } from './ui.js';

import { canMove, lockBlock, clearFullRows } from './utils.js';

import { buildWordMap, getRandomWordSet, getWordSetNames } from './word-utils.js';



const svgNS = "http://www.w3.org/2000/svg";

const board = document.getElementById("game-board");

const cols = 10;

const rows = 20;

const cellSize = 25;

const BLOCK_TYPES = [

  { name: "1", shape: [[1, 1]], color: "beige", center: [1, 1] },

  { name: "2", shape: [[1, 1], [2, 1]], color: "greenyellow", center: [2, 1] },

  { name: "3", shape: [[1, 1], [2, 1], [3, 1]], color: "hotpink", center: [2, 1] },

  { name: "4", shape: [[1, 1], [2, 1], [3, 1], [4, 1]], color: "darkmagenta", center: [2, 1] },

  { name: "L", shape: [[1, 1], [1, 2], [1, 3], [2, 3]], color: "red", center: [1, 2] },

  { name: "J", shape: [[2, 1], [2, 2], [2, 3], [1, 3]], color: "forestgreen", center: [2, 2] },

  { name: "Z", shape: [[1, 1], [2, 1], [2, 2], [3, 2]], color: "yellow", center: [2, 2] },

  { name: "S", shape: [[2, 1], [3, 1], [1, 2], [2, 2]], color: "cyan", center: [2, 2] },

  { name: "T", shape: [[2, 1], [1, 2], [2, 2], [3, 2]], color: "dodgerblue", center: [2, 2] },

  { name: "U", shape: [[1, 1], [3, 1], [1, 2], [2, 2], [3, 2]], color: "orange", center: [2, 2] },

  { name: "O", shape: [[1, 1], [2, 1], [1, 2], [2, 2]], color: "slategray", center: [1.5, 1.5] },

  { name: "V", shape: [[1, 1], [1, 2], [2, 2]], color: "chocolate", center: [1, 2] }

];



const BLOCK_TYPE_NAMES = BLOCK_TYPES.map(type => type.name);



const START_MESSAGE = "ゲームスタート\n<span class=\"key key-overlay\">Space</span>";
const RESTART_MESSAGE = "リスタート\n<span class=\"key key-overlay\">Esc</span>";

const DEFAULT_WORD_SET = "numbers";
const INITIAL_TIME = 100;

const AVAILABLE_WORD_SETS = [
  "1",
  "2",
  "3",
  "alphabet",
  "numbers",
  "colors",
  "fruit",
  "verbs",
  "conjunctions",
  "short",
  "medium",
  "NGSL1",
  "NGSL2",
  "NGSL3",
  "NGSL4",
  "NGSL5",
  "NGSL6",
  "NGSL7",
  "long",
  "extraLong"
];

const WORD_SET_LABELS = {
  "1": "1 (中列キー)",
  "2": "2 (上列キー)",
  "3": "3 (下列キー)",
  alphabet: "alphabet (全キー)",
  numbers: "numbers (数字)",
  colors: "colors (色)",
  verbs: "verbs (動詞)",
  fruit: "fruit (果物)",
  short: "short (1-3文字)",
  medium: "medium (4-6文字)",
  NGSL1: "NGSL1 (使用レベル1)",
  NGSL2: "NGSL2 (使用レベル2)",
  NGSL3: "NGSL3 (使用レベル3)",
  NGSL4: "NGSL4 (使用レベル4)",
  NGSL5: "NGSL5 (使用レベル5)",
  NGSL6: "NGSL6 (使用レベル6)",
  NGSL7: "NGSL7 (使用レベル7)",
  long: "long (7-9文字)",
  extraLong: "extra-long (10-14文字)",
  conjunctions: "conjunctions (接続詞)"
};

let activeWordSet = DEFAULT_WORD_SET;
let selectedWordSetIndex = Math.max(
  0,
  AVAILABLE_WORD_SETS.indexOf(DEFAULT_WORD_SET)
);
let blockWordMap = {};


let grid = Array.from({ length: rows }, () => Array(cols).fill(false));

let score = 0;

let currentDropBonus = 0;

let typedCharsForCurrentWord = 0;

let hadMistakeForCurrentWord = false;

let currentTypingMatchIndex = -1;

let block = null;

let fallTimer = null;

let isGameOver = false;



let inputBuffer = "";

let isWaitingForTyping = true;

const PREVIEW_COUNT = 2;

let nextBlockQueue = [];

let canStartWithSpace = true;



let timeRemaining = INITIAL_TIME;

let timerInterval = null;



setupScoreDisplay();

drawGrid(board, rows, cols, cellSize);











function getWordKey(entry) {

  if (!entry) return '';

  if (typeof entry === 'string') return entry;

  return entry.en ?? '';

}



function cloneWordEntry(entry) {

  if (!entry) return { en: '', ja: '' };

  if (typeof entry === 'string') {

    return { en: entry, ja: '' };

  }

  return { en: entry.en ?? '', ja: entry.ja ?? '' };

}



function refreshPreviewHighlight() {
  const highlight = currentTypingMatchIndex !== -1 && inputBuffer.length > 0
    ? { matchIndex: currentTypingMatchIndex, typedLength: inputBuffer.length }
    : null;
  renderNextBlocksWithWord(nextBlockQueue, cellSize, highlight);
}

function getWordSetLabel(key) {
  return WORD_SET_LABELS[key] ?? key;
}

function getWordSetDifficulty(key) {
  if (["1", "2", "3", "alphabet"].includes(key)) return "★";
  if (["numbers", "colors", "verbs", "fruit", "conjunctions", "short"].includes(key)) return "★★";
  if (["medium", "NGSL1", "NGSL2", "NGSL3"].includes(key)) return "★★★";
  if (["NGSL4", "NGSL5", "NGSL6", "NGSL7", "long"].includes(key)) return "★★★★";
  if (["extraLong"].includes(key)) return "★★★★★";
  return "";
}




function updateWordSetDisplay() {
  const label = document.getElementById("word-set-name");
  const diff = document.getElementById("word-set-difficulty");
  if (!label) return;
  const current = AVAILABLE_WORD_SETS[selectedWordSetIndex] ?? activeWordSet;
  label.textContent = getWordSetLabel(current);
  if (diff) {
    diff.textContent = getWordSetDifficulty(current);
  }
}

function cycleWordSet(delta) {
  if (!canStartWithSpace) return;
  if (!AVAILABLE_WORD_SETS.length) return;
  selectedWordSetIndex =
    (selectedWordSetIndex + delta + AVAILABLE_WORD_SETS.length) %
    AVAILABLE_WORD_SETS.length;
  activeWordSet = AVAILABLE_WORD_SETS[selectedWordSetIndex];
  updateWordSetDisplay();
  resetGame({ keepMessage: true });
}


function getRankLabel(value) {
  if (value >= 2000) return 'SSS';
  if (value >= 1500) return 'SS';
  if (value >= 1000) return 'S';
  if (value >= 800) return 'A';
  if (value >= 600) return 'B';
  if (value >= 400) return 'C';
  return 'D';
}


function showResultScreen(reason) {

  const rank = getRankLabel(score);

  const lines = [

    reason,

    `RANK: ${rank}`,

    `SCORE: ${score}`,

    RESTART_MESSAGE

  ];

  showMessage(lines.join('\n'));

}



function stopTimer() {

  if (timerInterval) {

    clearInterval(timerInterval);

    timerInterval = null;

  }

}



function startTimer() {

  stopTimer();

  updateTimerDisplay(timeRemaining);

  timerInterval = setInterval(() => {

    if (isGameOver) {

      stopTimer();

      return;

    }

    timeRemaining = Math.max(0, timeRemaining - 1);

    updateTimerDisplay(timeRemaining);

    if (timeRemaining <= 0) {

      handleTimeUp();

    }

  }, 1000);

}



function handleTimeUp() {

  if (isGameOver) return;

  timeRemaining = 0;

  updateTimerDisplay(timeRemaining);

  stopTimer();

  isGameOver = true;

  showResultScreen('タイムアップ！！');



  clearInterval(fallTimer);

  fallTimer = null;

  block = null;

  isWaitingForTyping = false;

  inputBuffer = '';

  currentTypingMatchIndex = -1;

  refreshPreviewHighlight();

}





function announceLineClear(lines) {

  if (!lines) return;

  const base = lines * 100;

  const bonus = lines === 2 ? 50 : lines === 3 ? 100 : lines >= 4 ? 150 : 0;

  let message;

  if (lines === 1) {

    message = 'ライン削除!!100点';

  } else {

    const bonusPart = bonus ? `${base}+${bonus}点` : `${base}点`;

    message = `${lines}ライン削除!!${bonusPart}`;

  }

  pushBonusMessage(message, 'line');

}



function calculateLineClearScore(lines) {

  if (lines <= 0) return 0;

  const base = lines * 100;

  const bonus = lines === 2 ? 50 : lines === 3 ? 100 : lines >= 4 ? 150 : 0;

  return base + bonus;

}



function applyDropBonus(amount) {

  if (amount <= 0 || !block) return 0;



  let targetBonus = currentDropBonus;

  if (amount >= 20) {

    targetBonus = 20;

  } else if (amount >= 10) {

    targetBonus = Math.max(targetBonus, 10);

  } else {

    targetBonus = Math.min(20, targetBonus + amount);

  }



  if (targetBonus <= currentDropBonus) return 0;



  const applied = targetBonus - currentDropBonus;

  currentDropBonus = targetBonus;

  score += applied;

  updateScore(score);

  updateScoreDelta(applied, 'drop');

  return applied;

}



function resetGame({ keepMessage = false } = {}) {

  grid = Array.from({ length: rows }, () => Array(cols).fill(false));

  board.querySelectorAll("rect").forEach(rect => {

    const fill = rect.getAttribute("fill");

    if (fill !== "white") board.removeChild(rect);

  });

  blockWordMap = buildWordMap(getRandomWordSet(BLOCK_TYPE_NAMES.length, activeWordSet), BLOCK_TYPE_NAMES);

  score = 0;

  currentDropBonus = 0;

  updateScore(score);

  stopTimer();

  timeRemaining = INITIAL_TIME;

  updateTimerDisplay(timeRemaining);

  if (!keepMessage) {

    clearMessage();

  }

  isGameOver = false;

  clearInterval(fallTimer);

  fallTimer = null;



  nextBlockQueue = [];

  while (nextBlockQueue.length < PREVIEW_COUNT) {

    nextBlockQueue.push(getRandomBlockData());

  }



  block = null;

  isWaitingForTyping = true;

  typedCharsForCurrentWord = 0;
  hadMistakeForCurrentWord = false;
  inputBuffer = "";
  currentTypingMatchIndex = -1;
  refreshPreviewHighlight();
  updateWordSetDisplay();
}


function prepareStartScreen() {

  resetGame({ keepMessage: true });

  showMessage(START_MESSAGE);

  canStartWithSpace = true;

}



function startGameplay() {

  resetGame();

  canStartWithSpace = false;

  startTimer();

}



function getRandomBlockData() {

  const template = BLOCK_TYPES[Math.floor(Math.random() * BLOCK_TYPES.length)];

  const shape = template.shape.map(([x, y]) => [x, y]);

  const center = Array.isArray(template.center) ? [...template.center] : template.center;

  const word = cloneWordEntry(blockWordMap[template.name] ?? { en: "xxxxx", ja: "" });

  return { ...template, shape, center, word };

}



function spawnFallingBlock(blockData) {

  currentDropBonus = 0;

  const nextBlockData = blockData ?? (nextBlockQueue.shift() ?? getRandomBlockData());



  block = createBlock(

    3, -1,

    nextBlockData.shape,

    nextBlockData.color,

    nextBlockData.name,

    nextBlockData.center,

    board,

    cellSize,

    nextBlockData.word

  );



  while (nextBlockQueue.length < PREVIEW_COUNT) {

    nextBlockQueue.push(getRandomBlockData());

  }



  refreshPreviewHighlight();

  startFalling();

}



function startFalling() {

  if (!canMove(block.x, block.y, block.shape, grid, cols, rows)) {
    showResultScreen('ゲームオーバー');
    canStartWithSpace = false;
    isGameOver = true;
    block = null;
    clearInterval(fallTimer);
    fallTimer = null;
    stopTimer();

    return;

  }



  updateBlockPosition(block, board, cellSize);



  clearInterval(fallTimer);

  fallTimer = setInterval(() => {

    if (!canMove(block.x, block.y + 1, block.shape, grid, cols, rows)) {

      lockBlock(block, grid);

      let clearedLinesCount = 0;

      clearFullRows(grid, board, cols, cellSize, rows, () => {

        clearedLinesCount++;

      });

      if (clearedLinesCount > 0) {

        const lineGain = calculateLineClearScore(clearedLinesCount);

        score += lineGain;

        updateScore(score);

        updateScoreDelta(lineGain, 'line');

      }

      currentDropBonus = 0;

      isWaitingForTyping = true;

      typedCharsForCurrentWord = 0;

      hadMistakeForCurrentWord = false;

      inputBuffer = "";

      currentTypingMatchIndex = -1;

      refreshPreviewHighlight();

      block = null;

    } else {

      block.y++;

      updateBlockPosition(block, board, cellSize);

    }

  }, 500);

}



document.addEventListener("keydown", (e) => {

  if (e.key === "Escape") {

    e.preventDefault();

    prepareStartScreen();

    return;

  }



  if (canStartWithSpace) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      cycleWordSet(-1);
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      cycleWordSet(1);
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      startGameplay();
    }
    return;
  }


  if (isWaitingForTyping) {

    if (e.key.length === 1 && e.key !== " ") {

      const letter = e.key.toLowerCase();

      const previewCandidates = nextBlockQueue.slice(0, PREVIEW_COUNT);



      const continuedBuffer = (inputBuffer + letter).toLowerCase();

      const canContinueCurrent = previewCandidates.some((data) => {

        if (!data || !data.word) return false;

        const wordKey = getWordKey(data.word).toLowerCase();

        return wordKey.startsWith(continuedBuffer);

      });



      let normalizedBuffer;



      if (canContinueCurrent) {

        inputBuffer += letter;

        normalizedBuffer = continuedBuffer;

        typedCharsForCurrentWord += 1;

      } else {

        const restartBuffer = letter;

        const canRestart = previewCandidates.some((data) => {

          if (!data || !data.word) return false;

          const wordKey = getWordKey(data.word).toLowerCase();

          return wordKey.startsWith(restartBuffer);

        });

        if (!canRestart) {

          hadMistakeForCurrentWord = true;

          currentTypingMatchIndex = -1;

          refreshPreviewHighlight();

          return;

        }

        inputBuffer = letter;

        normalizedBuffer = restartBuffer;

        typedCharsForCurrentWord = 1;

        hadMistakeForCurrentWord = false;

      }



      const prefixIndex = previewCandidates.findIndex((data) => {

        if (!data || !data.word) return false;

        const wordKey = getWordKey(data.word).toLowerCase();

        return wordKey.startsWith(normalizedBuffer);

      });

      currentTypingMatchIndex = prefixIndex;



      refreshPreviewHighlight();



      const matchIndex = previewCandidates.findIndex((data) => {

        if (!data || !data.word) return false;

        const wordKey = getWordKey(data.word).toLowerCase();

        return wordKey === normalizedBuffer;

      });

      if (matchIndex !== -1) {

        const matchedData = nextBlockQueue.splice(matchIndex, 1)[0];

        let completionBonus = typedCharsForCurrentWord;

        if (matchIndex === 1 && typedCharsForCurrentWord > 0) {

          completionBonus += typedCharsForCurrentWord;

          pushBonusMessage('暗記ボーナス!! スコア×2', 'memory');

        }

        if (!hadMistakeForCurrentWord && typedCharsForCurrentWord > 0) {

          const perfectMultiplier = matchIndex === 1 ? 2 : 1;

          completionBonus += typedCharsForCurrentWord * perfectMultiplier;

          pushBonusMessage('ノーミス入力!! スコア×2', 'type');

        }

        if (completionBonus > 0) {

          score += completionBonus;

          updateScore(score);

          const deltaVariant = matchIndex === 1 ? 'memory' : 'type';

          updateScoreDelta(completionBonus, deltaVariant);

        }

        typedCharsForCurrentWord = 0;

        hadMistakeForCurrentWord = false;

        inputBuffer = "";

        currentTypingMatchIndex = -1;

        refreshPreviewHighlight();

        isWaitingForTyping = false;

        spawnFallingBlock(matchedData);

      }

    }

    return;

  }





  if (!block) return;



  switch (e.key) {

    case "j":

    case "J":

    case "ArrowUp":

      rotateBlock(-1);

      break;

    case "f":

    case "F":

    case "ArrowRight":

      if (canMove(block.x + 1, block.y, block.shape, grid, cols, rows)) {

        block.x++;

        updateBlockPosition(block, board, cellSize);

      }

      break;

    case "k":

    case "K":

      rotateBlock(1);

      break;

    case "d":

    case "D":

    case "ArrowLeft":

      if (canMove(block.x - 1, block.y, block.shape, grid, cols, rows)) {

        block.x--;

        updateBlockPosition(block, board, cellSize);

      }

      break;

    case " ":

      e.preventDefault();

      if (canMove(block.x, block.y + 1, block.shape, grid, cols, rows)) {

        block.y++;

        updateBlockPosition(block, board, cellSize);

        const gained = applyDropBonus(10);

        if (gained >= 10) {

          pushBonusMessage(`ソフトドロップ!! +${gained}点`, 'drop');

        }

      }

      break;

    case "Enter":

      e.preventDefault();

      hardDrop();

      break;

  }

});

function rotateBlock(direction = 1) {

  if (!block) return;

  const [cx, cy] = block.center;

  const isReverse = ["2", "4", "T", "U", "V", "J", "L"].includes(block.name);

  const rotatedShape = block.shape.map(([x, y]) => {

    const relX = x - cx;

    const relY = y - cy;

    if (direction === -1) {

      return isReverse ? [cx + relY, cy - relX] : [cx - relY, cy + relX];

    }

    return isReverse ? [cx - relY, cy + relX] : [cx + relY, cy - relX];

  });

  if (canMove(block.x, block.y, rotatedShape, grid, cols, rows)) {

    block.shape = rotatedShape;

    updateBlockPosition(block, board, cellSize);

    return;

  }

  const kicks = [-1, 1, -2, 2];

  for (const dx of kicks) {

    if (canMove(block.x + dx, block.y, rotatedShape, grid, cols, rows)) {

      block.x += dx;

      block.shape = rotatedShape;

      updateBlockPosition(block, board, cellSize);

      return;

    }

  }

}



function hardDrop() {

  while (canMove(block.x, block.y + 1, block.shape, grid, cols, rows)) {

    block.y++;

  }

  updateBlockPosition(block, board, cellSize);

  const hardDropBonus = applyDropBonus(20);

  const hardDropTotal = currentDropBonus;

  if (hardDropBonus > 0) {

    pushBonusMessage(`ハードドロップ!! +${hardDropBonus}点 (${hardDropTotal}点)`, 'drop');

  }

  lockBlock(block, grid);

  let clearedLinesCount = 0;

  clearFullRows(grid, board, cols, cellSize, rows, () => {

    clearedLinesCount++;

  });

  if (clearedLinesCount > 0) {

    const lineGain = calculateLineClearScore(clearedLinesCount);

    score += lineGain;

    updateScore(score);

    updateScoreDelta(lineGain, 'line');

    announceLineClear(clearedLinesCount);

  }

  currentDropBonus = 0;

  isWaitingForTyping = true;

  typedCharsForCurrentWord = 0;

  hadMistakeForCurrentWord = false;

  inputBuffer = "";

  currentTypingMatchIndex = -1;

  refreshPreviewHighlight();

  block = null;

}



export function getAvailableWordSets() {

  return getWordSetNames();

}



export function setWordSet(name) {
  if (!getWordSetNames().includes(name)) {
    console.warn(`Unknown word set: ${name}`);
    return false;
  }
  activeWordSet = name;
  const idx = AVAILABLE_WORD_SETS.indexOf(name);
  if (idx !== -1) {
    selectedWordSetIndex = idx;
  }
  updateWordSetDisplay();
  prepareStartScreen();
  return true;
}

prepareStartScreen();
updateWordSetDisplay();














