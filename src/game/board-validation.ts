import type { Board, BoardMove, CellContent } from "../state/types";

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
};

export function validateBoard(board: Board): ValidationResult {
  const errors: ValidationError[] = [];

  const pieceCount = countCellType(board.grid, "piece");
  const pieceMoves = board.sequence.filter((m) => m.type === "piece").length;

  if (pieceCount > pieceMoves) {
    errors.push({
      field: "piece",
      message: `Grid has ${pieceCount} pieces but sequence only has ${pieceMoves} piece moves`,
    });
  }

  const trapCount = countCellType(board.grid, "trap");
  const maxTraps = board.boardSize - 1;
  if (trapCount > maxTraps) {
    errors.push({
      field: "trap",
      message: `Board can have maximum ${maxTraps} traps (found ${trapCount})`,
    });
  }

  const sequenceCount = board.sequence.length;
  if (sequenceCount < 2) {
    errors.push({
      field: "sequence",
      message: `Board must have at least 2 sequence items (found ${sequenceCount})`,
    });
  }

  const maxSequence = 2 * board.boardSize * board.boardSize;
  if (sequenceCount > maxSequence) {
    errors.push({
      field: "sequence",
      message: `Board can have maximum ${maxSequence} sequence items (found ${sequenceCount})`,
    });
  }

  const trapMoves = board.sequence.filter((m) => m.type === "trap").length;
  if (trapCount !== trapMoves) {
    errors.push({
      field: "trap",
      message: `Grid has ${trapCount} traps but sequence has ${trapMoves} trap moves`,
    });
  }

  const sequenceValidation = validateSequenceOrder(board.sequence);
  if (!sequenceValidation.valid) {
    errors.push(...sequenceValidation.errors);
  }

  const gridValidation = validateSequenceMatchesGrid(board);
  if (!gridValidation.valid) {
    errors.push(...gridValidation.errors);
  }

  return { valid: errors.length === 0, errors };
}

function countCellType(grid: CellContent[][], type: CellContent): number {
  let count = 0;
  for (const row of grid) {
    for (const cell of row) {
      if (cell === type) count++;
    }
  }
  return count;
}

function validateSequenceOrder(sequence: BoardMove[]): ValidationResult {
  const errors: ValidationError[] = [];
  if (sequence.length === 0) return { valid: true, errors: [] };

  const orders = sequence.map((move) => move.order);
  const uniqueOrders = new Set(orders);

  if (uniqueOrders.size !== orders.length) {
    errors.push({
      field: "sequence",
      message: "Sequence order numbers must be unique (no duplicates)",
    });
  }

  const sortedOrders = [...orders].sort((a, b) => a - b);
  for (let i = 0; i < sortedOrders.length; i++) {
    if (sortedOrders[i] !== i + 1) {
      errors.push({
        field: "sequence",
        message: `Sequence order must be consecutive 1..${sequence.length} (found ${sortedOrders[i]} at position ${i + 1})`,
      });
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateSequenceMatchesGrid(board: Board): ValidationResult {
  const errors: ValidationError[] = [];

  for (const move of board.sequence) {
    const { row, col } = move.position;

    if (move.type === "final") {
      if (row !== -1) {
        errors.push({
          field: "sequence",
          message: `Final move (item ${move.order}) must be at row -1, found at row ${row}`,
        });
      }
      continue;
    }

    if (row < 0 || row >= board.grid.length) {
      errors.push({
        field: "sequence",
        message: `Sequence item ${move.order} has invalid row ${row}`,
      });
      continue;
    }

    const gridRow = board.grid[row];
    if (!gridRow || col < 0 || col >= gridRow.length) {
      errors.push({
        field: "sequence",
        message: `Sequence item ${move.order} has invalid col ${col}`,
      });
      continue;
    }

    const cellContent = gridRow[col];
    if (move.type === "trap" && cellContent !== "trap") {
      errors.push({
        field: "sequence",
        message: `Sequence item ${move.order} at (${row}, ${col}) expects trap but found ${cellContent}`,
      });
    } else if (move.type === "piece" && cellContent !== "piece" && cellContent !== "trap") {
      errors.push({
        field: "sequence",
        message: `Sequence item ${move.order} at (${row}, ${col}) expects piece or trap but found ${cellContent}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

export function isValidBoard(board: Board): boolean {
  return validateBoard(board).valid;
}
