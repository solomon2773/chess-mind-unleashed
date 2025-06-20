
import { useState, useCallback } from "react";
import { Chess, Square } from "chess.js";
import { motion } from "framer-motion";

interface ChessBoardProps {
  game: Chess;
  onMove: (move: string) => void;
  disabled?: boolean;
}

const pieceUnicode: Record<string, string> = {
  'wK': '♔', 'wQ': '♕', 'wR': '♖', 'wB': '♗', 'wN': '♘', 'wP': '♙',
  'bK': '♚', 'bQ': '♛', 'bR': '♜', 'bB': '♝', 'bN': '♞', 'bP': '♟'
};

export const ChessBoard = ({ game, onMove, disabled = false }: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);

  const board = game.board();

  const handleSquareClick = useCallback((square: Square) => {
    if (disabled) return;

    if (selectedSquare) {
      // Try to make a move
      const move = selectedSquare + square;
      try {
        // Check if this is a valid move
        const moves = game.moves({ square: selectedSquare, verbose: true });
        const validMove = moves.find(m => m.to === square);
        
        if (validMove) {
          // Handle promotion
          if (validMove.promotion) {
            onMove(selectedSquare + square + 'q'); // Auto-promote to queen
          } else {
            onMove(move);
          }
        }
      } catch (error) {
        console.log("Invalid move attempted");
      }
      
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else {
      // Select a square
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
        const moves = game.moves({ square, verbose: true });
        setPossibleMoves(moves.map(move => move.to as Square));
      }
    }
  }, [game, selectedSquare, onMove, disabled]);

  const isLightSquare = (row: number, col: number) => (row + col) % 2 === 0;
  
  const getSquareName = (row: number, col: number): Square => {
    const file = String.fromCharCode(97 + col); // 'a' to 'h'
    const rank = (8 - row).toString();
    return (file + rank) as Square;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="aspect-square max-w-2xl mx-auto">
        <div className="grid grid-cols-8 h-full border-2 border-amber-800 rounded-lg overflow-hidden">
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const square = getSquareName(rowIndex, colIndex);
              const isLight = isLightSquare(rowIndex, colIndex);
              const isSelected = selectedSquare === square;
              const isPossibleMove = possibleMoves.includes(square);
              const isInCheck = game.inCheck() && piece?.type === 'k' && piece.color === game.turn();

              return (
                <motion.div
                  key={square}
                  className={`
                    relative flex items-center justify-center cursor-pointer
                    transition-all duration-200 hover:brightness-90
                    ${isLight ? 'bg-amber-100' : 'bg-amber-600'}
                    ${isSelected ? 'ring-4 ring-blue-400 ring-inset' : ''}
                    ${isInCheck ? 'bg-red-400' : ''}
                    ${disabled ? 'cursor-not-allowed opacity-75' : ''}
                  `}
                  onClick={() => handleSquareClick(square)}
                  whileHover={!disabled ? { scale: 0.95 } : {}}
                  whileTap={!disabled ? { scale: 0.9 } : {}}
                >
                  {/* Possible move indicator */}
                  {isPossibleMove && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className={`
                        w-6 h-6 rounded-full
                        ${piece ? 'ring-4 ring-green-400 ring-inset' : 'bg-green-400 opacity-60'}
                      `} />
                    </div>
                  )}

                  {/* Chess piece */}
                  {piece && (
                    <motion.div
                      className="text-4xl md:text-5xl select-none z-10"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      {pieceUnicode[piece.color + piece.type.toUpperCase()]}
                    </motion.div>
                  )}

                  {/* Square coordinates */}
                  {rowIndex === 7 && (
                    <div className="absolute bottom-1 right-1 text-xs font-semibold opacity-60">
                      {String.fromCharCode(97 + colIndex)}
                    </div>
                  )}
                  {colIndex === 0 && (
                    <div className="absolute top-1 left-1 text-xs font-semibold opacity-60">
                      {8 - rowIndex}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
