
import { useCallback } from "react";
import { Chess } from "chess.js";
import { PlayerConfig } from "@/components/PlayerConfig";

interface UseMoveHandlerProps {
  game: Chess;
  whitePlayer: PlayerConfig;
  blackPlayer: PlayerConfig;
  isGameRunning: boolean;
  updateGameState: (newGame: Chess, moveResult: any) => void;
  onAiMove: (currentGame: Chess, playerConfig: PlayerConfig) => void;
}

export const useMoveHandler = ({
  game,
  whitePlayer,
  blackPlayer,
  isGameRunning,
  updateGameState,
  onAiMove
}: UseMoveHandlerProps) => {
  const makeMove = useCallback(async (move: string) => {
    if (!isGameRunning) return;
    
    try {
      const gameCopy = new Chess(game.fen());
      const moveResult = gameCopy.move(move);
      
      if (moveResult) {
        updateGameState(gameCopy, moveResult);
        
        // Check if next player is AI and game is not over
        if (!gameCopy.isGameOver() && isGameRunning) {
          const nextPlayer = gameCopy.turn() === 'w' ? whitePlayer : blackPlayer;
          
          if (nextPlayer.type === 'ai') {
            setTimeout(() => onAiMove(gameCopy, nextPlayer), 1000);
          }
        }
      }
    } catch (error) {
      console.error("Invalid move:", error);
    }
  }, [game, whitePlayer, blackPlayer, isGameRunning, updateGameState, onAiMove]);

  return { makeMove };
};
