// ゲーム盤面とブロックの描画を担当するモジュール
export function drawGrid(board, rows, cols, cellSize) {
  const svgNS = "http://www.w3.org/2000/svg";
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const rect = document.createElementNS(svgNS, "rect");
      rect.setAttribute("x", x * cellSize);
      rect.setAttribute("y", y * cellSize);
      rect.setAttribute("width", cellSize);
      rect.setAttribute("height", cellSize);
      rect.setAttribute("fill", "white"); // 背景色
      rect.setAttribute("stroke", "#ccc"); // グリッド線
      board.appendChild(rect);
    }
  }
}

export function createBlock(x, y, shape, color, name, center, board, cellSize, word) {
  const svgNS = "http://www.w3.org/2000/svg";
  const elements = [];

  // null や undefined の shape を検知して破棄する安全策
  if (!shape || !Array.isArray(shape)) {
    console.error("❌ 無効な shape:", shape);
    throw new Error("Invalid shape passed to createBlock");
  }

  shape.forEach(pos => {
    if (!Array.isArray(pos) || pos.length !== 2 || typeof pos[0] !== "number" || typeof pos[1] !== "number") {
      console.error("❌ 無効な shape 要素検出:", pos);
      throw new Error("Invalid shape element: " + JSON.stringify(pos));
    }
  });

  const block = { x, y, shape, color, name, center, word };

  shape.forEach(([dx, dy]) => {
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", (x + dx) * cellSize);
    rect.setAttribute("y", (y + dy) * cellSize);
    rect.setAttribute("width", cellSize);
    rect.setAttribute("height", cellSize);
    rect.setAttribute("fill", color);
    rect.setAttribute("stroke", "#333");
    board.appendChild(rect);
    elements.push(rect);
  });

  return { ...block, elements };
}

export function updateBlockPosition(block, board, cellSize) {
  block.shape.forEach(([dx, dy], i) => {
    const rect = block.elements[i]; // 各構成パーツのrectを更新
    rect.setAttribute("x", (block.x + dx) * cellSize);
    rect.setAttribute("y", (block.y + dy) * cellSize);
  });
}
