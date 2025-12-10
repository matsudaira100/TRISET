// utils.js
// ゲームのロジック処理（判定・固定・行削除）を担当するモジュール

// ブロックが指定位置に移動可能かを判定
export function canMove(x, y, shape, grid, cols, rows) {
  return shape.every(([dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    return (
      nx >= 0 && nx < cols && // 横範囲内
      ny >= 0 && ny < rows && // 縦範囲内
      !grid[ny][nx]           // 他ブロックと重なっていない
    );
  });
}

// ブロックをグリッドに固定する（落下完了後）
export function lockBlock(block, grid) {
  block.shape.forEach(([dx, dy], i) => {
    const gx = block.x + dx;
    const gy = block.y + dy;
    grid[gy][gx] = true; // グリッドにマーク

    const rect = block.elements[i]; // 対応するSVG rect要素に属性追加
    rect.setAttribute("data-row", gy);
    rect.setAttribute("data-col", gx);
  });
}

// 行が全て埋まっていたら削除し、上の行を1段下げる
export function clearFullRows(grid, board, cols, cellSize, rows, onRowCleared) {
  for (let y = rows - 1; y >= 0; y--) {
    if (grid[y].every(cell => cell)) { // 行がすべて埋まっていたら
      onRowCleared(); // スコア加算等の処理を呼び出す
      grid.splice(y, 1); // 行を削除
      grid.unshift(Array(cols).fill(false)); // 上に空行を追加（押し出し）

      const rects = board.querySelectorAll("rect[data-row]"); // 固定済みブロックを取得
      rects.forEach(rect => {
        const row = parseInt(rect.getAttribute("data-row"));
        if (row === y) {
          board.removeChild(rect); // 削除対象の行は消す
        } else if (row < y) {
          const newY = row + 1;
          rect.setAttribute("data-row", newY); // 1段下げる
          rect.setAttribute("y", newY * cellSize);
        }
      });

      y++; // 同じ行を再チェック（上の行が落ちてくるため）
    }
  }
}
