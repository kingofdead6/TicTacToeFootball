import { useState } from 'react'
import Cell from './Cell.jsx'
import CategoryBadge from './CategoryBadge.jsx'
import WinLine from './WinLine.jsx'

/** 4×4 layout: corner + column headers, row headers + 3×3 board */
export default function GridBoard({ grid, board, turn, disabled, onCellClick, shakeIdx, winLine, winMark, solutions, focus, corner }) {
  const [hovered, setHovered] = useState(null)
  const hRow = hovered != null ? Math.floor(hovered / 3) : focus?.cell != null ? Math.floor(focus.cell / 3) : -1
  const hCol = hovered != null ? hovered % 3 : focus?.cell != null ? focus.cell % 3 : -1

  return (
    <div
      className="grid gap-2 sm:gap-3"
      style={{ '--cell': 'min(20vw, 124px)', gridTemplateColumns: 'repeat(4, var(--cell))', gridTemplateRows: 'repeat(4, var(--cell))' }}
    >
      <div className="grid place-items-center">{corner}</div>

      {grid.cols.map((c, i) => (
        <CategoryBadge key={`${grid.id}-c-${c.id}`} category={c} index={i} highlight={hCol === i} />
      ))}

      {grid.rows.map((r, i) => (
        <div key={`${grid.id}-r-${r.id}`} style={{ gridColumn: 1, gridRow: i + 2 }}>
          <CategoryBadge category={r} index={i + 3} highlight={hRow === i} />
        </div>
      ))}

      <div className="relative grid grid-cols-3 gap-2 sm:gap-3" style={{ gridColumn: '2 / span 3', gridRow: '2 / span 3' }}>
        {board.map((value, i) => (
          <div key={`${grid.id}-${i}`} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <Cell
              index={i}
              value={value}
              turn={turn}
              disabled={disabled}
              shake={shakeIdx === i}
              isWinning={winLine?.includes(i)}
              cpuTarget={focus?.cell === i}
              focusMark={focus?.mark}
              answerCount={grid.answerCounts[Math.floor(i / 3)][i % 3]}
              solutions={solutions?.[Math.floor(i / 3)][i % 3]}
              onClick={() => onCellClick(i)}
            />
          </div>
        ))}
        {winLine && <WinLine line={winLine} mark={winMark} />}
      </div>
    </div>
  )
}
