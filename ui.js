// ui.js
// UI utilities: score display, timers, preview rendering, bonus feed

let scoreDisplay;
let timerDisplay;
let scoreDeltaDisplay;
let scoreDeltaResetTimer = null;
let bonusFeed;

const BONUS_MESSAGE_LIMIT = 4;
const BONUS_MESSAGE_LIFETIME = 2600;

// Set up score/timer displays and bonus feed
export function setupScoreDisplay() {
  scoreDisplay = document.getElementById("score-display");
  timerDisplay = document.getElementById("timer-display");
  scoreDeltaDisplay = document.getElementById("score-delta");
  bonusFeed = document.getElementById("bonus-feed");

  if (scoreDisplay) scoreDisplay.textContent = "スコア: 0";
  if (timerDisplay) timerDisplay.textContent = '';
  if (scoreDeltaDisplay) {
    scoreDeltaDisplay.textContent = '';
    scoreDeltaDisplay.className = 'score-delta';
  }
  if (bonusFeed) bonusFeed.innerHTML = '';
}

export function updateScore(value) {
  scoreDisplay = scoreDisplay || document.getElementById("score-display");
  if (!scoreDisplay) return;
  scoreDisplay.textContent = `スコア: ${value}`;
}

export function showMessage(msg) {
  const msgBox = document.getElementById("message-box") || document.createElement("div");
  msgBox.id = "message-box";
  msgBox.style.position = "absolute";
  msgBox.style.top = "50%";
  msgBox.style.left = "50%";
  msgBox.style.transform = "translate(-50%, -50%)";
  msgBox.style.fontSize = "20px";
  msgBox.style.fontFamily = "sans-serif";
  msgBox.style.background = "rgba(255,255,255,0.9)";
  msgBox.style.border = "2px solid #333";
  msgBox.style.padding = "20px";
  msgBox.style.textAlign = "center";
  msgBox.style.whiteSpace = "normal";
  msgBox.style.maxWidth = "260px";
  msgBox.style.minWidth = "180px";
  const safeHtml = typeof msg === "string" ? msg.replace(/\n/g, "<br>") : "";
  msgBox.innerHTML = safeHtml;

  const overlay = document.getElementById("overlay");
  if (overlay && !overlay.contains(msgBox)) {
    overlay.appendChild(msgBox);
  } else if (!overlay) {
    document.body.appendChild(msgBox);
  }
}

export function clearMessage() {
  const msgBox = document.getElementById("message-box");
  if (msgBox) msgBox.remove();
}

export function renderNextBlocksWithWord(queue, cellSize, highlightState = null) {
  const previews = document.querySelectorAll(".preview-box");
  const scale = 0.65;
  const svgNS = "http://www.w3.org/2000/svg";

  previews.forEach((preview, index) => {
    while (preview.firstChild) preview.removeChild(preview.firstChild);
    const data = queue[index];
    if (!data) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    data.shape.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const blockWidth = (maxX - minX + 1) * cellSize * scale;
    const blockHeight = (maxY - minY + 1) * cellSize * scale;
    const previewWidth = preview.viewBox.baseVal.width || preview.clientWidth;
    const previewHeight = preview.viewBox.baseVal.height || preview.clientHeight;

    const offsetX = (previewWidth - blockWidth) / 2 - minX * cellSize * scale;
    const blockAreaHeight = previewHeight * (2 / 3);
    const offsetY = (blockAreaHeight - blockHeight) / 2 - minY * cellSize * scale;

    data.shape.forEach(([dx, dy]) => {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", dx * cellSize * scale + offsetX);
      rect.setAttribute("y", dy * cellSize * scale + offsetY);
      rect.setAttribute("width", cellSize * scale);
      rect.setAttribute("height", cellSize * scale);
      rect.setAttribute("fill", data.color);
      rect.setAttribute("stroke", "#333");
      preview.appendChild(rect);
    });

    const addText = (content, y, size, fill = "#000", typedChars = 0) => {
      if (!content) return;
      const textNode = document.createElementNS(svgNS, "text");
      textNode.setAttribute("x", previewWidth / 2);
      textNode.setAttribute("y", y);
      textNode.setAttribute("text-anchor", "middle");
      textNode.setAttribute("font-family", "sans-serif");
      textNode.setAttribute("font-size", String(size));
      textNode.setAttribute("fill", fill);

      if (typedChars > 0) {
        const typedSpan = document.createElementNS(svgNS, "tspan");
        typedSpan.textContent = content.slice(0, typedChars);
        typedSpan.setAttribute("fill", "#ff7a18");
        typedSpan.setAttribute("font-weight", "bold");
        textNode.appendChild(typedSpan);

        if (typedChars < content.length) {
          const restSpan = document.createElementNS(svgNS, "tspan");
          restSpan.textContent = content.slice(typedChars);
          restSpan.setAttribute("fill", fill);
          textNode.appendChild(restSpan);
        }
      } else {
        textNode.textContent = content;
      }

      preview.appendChild(textNode);
    };

    const englishRaw = typeof data.word === "string" ? data.word : data.word?.en ?? "";
    const translation = typeof data.word === "string" ? "" : data.word?.ja ?? "";

    const isHighlighted = Boolean(highlightState) &&
      highlightState.matchIndex === index && highlightState.typedLength > 0;

    let englishDisplay = "";
    let typedChars = 0;

    if (!englishRaw) {
      englishDisplay = "";
    } else if (index === 1) {
      const lower = englishRaw.toLowerCase();
      const typedLen = isHighlighted ? Math.min(highlightState.typedLength, lower.length) : 0;
      const visibleCount = Math.min(lower.length, Math.max(1, typedLen));
      englishDisplay = lower.slice(0, visibleCount);
      typedChars = typedLen;
    } else {
      englishDisplay = englishRaw;
      typedChars = isHighlighted ? Math.min(highlightState.typedLength, englishDisplay.length) : 0;
    }

    addText(englishDisplay, previewHeight * 0.8, 16, "#000", typedChars);
    addText(translation, previewHeight * 0.92, 13, "#333");
  });
}

export function pushBonusMessage(message, variant = 'default') {
  bonusFeed = bonusFeed || document.getElementById("bonus-feed");
  if (!bonusFeed) return;

  const entry = document.createElement('div');
  entry.className = `bonus-entry bonus-${variant}`;
  entry.textContent = message;

  bonusFeed.appendChild(entry);
  while (bonusFeed.childElementCount > BONUS_MESSAGE_LIMIT) {
    bonusFeed.removeChild(bonusFeed.firstElementChild);
  }

  setTimeout(() => {
    entry.style.opacity = '0';
  }, BONUS_MESSAGE_LIFETIME - 400);

  setTimeout(() => {
    entry.remove();
  }, BONUS_MESSAGE_LIFETIME);
}

export function updateScoreDelta(amount, variant = 'default') {
  scoreDeltaDisplay = scoreDeltaDisplay || document.getElementById("score-delta");
  if (!scoreDeltaDisplay || !amount) return;

  const formatted = amount > 0 ? `+${amount}` : `${amount}`;
  scoreDeltaDisplay.textContent = formatted;
  scoreDeltaDisplay.className = `score-delta score-delta-${variant} score-delta-visible`;

  if (scoreDeltaResetTimer) clearTimeout(scoreDeltaResetTimer);
  scoreDeltaResetTimer = setTimeout(() => {
    scoreDeltaDisplay.textContent = '';
    scoreDeltaDisplay.className = 'score-delta';
  }, 1200);
}

export function updateTimerDisplay(seconds) {
  timerDisplay = timerDisplay || document.getElementById("timer-display");
  if (!timerDisplay) return;
  const clamped = Math.max(0, Math.floor(seconds));
  timerDisplay.textContent = `TIME: ${clamped}s`;
}
