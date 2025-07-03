
import { useState, useCallback } from "react";
import { Chess } from "chess.js";

export const useChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [isGameRunning, setIsGameRunning] = useState(false);

  const resetGame = useCallback(() => {
    setGame(new Chess());
    setGameHistory([]);
    setCurrentPlayer('white');
    setIsGameRunning(false);
  }, []);

  const undoMove = useCallback(() => {
    if (!isGameRunning) return;
    
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    if (gameHistory.length > 1) {
      gameCopy.undo(); // Undo both player moves if both are AI
    }
    setGame(gameCopy);
    setGameHistory(prev => prev.slice(0, -2));
    setCurrentPlayer(gameCopy.turn() === 'w' ? 'white' : 'black');
  }, [game, gameHistory, isGameRunning]);

  const updateGameState = useCallback((newGame: Chess, moveResult: any) => {
    setGame(newGame);
    setGameHistory(prev => [...prev, moveResult.san]);
    setCurrentPlayer(newGame.turn() === 'w' ? 'white' : 'black');
  }, []);

  return {
    game,
    gameHistory,
    currentPlayer,
    isGameRunning,
    setIsGameRunning,
    resetGame,
    undoMove,
    updateGameState,
    setGame
  };
};
