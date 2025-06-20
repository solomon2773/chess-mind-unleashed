
import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { ThinkingWindow } from "./ThinkingWindow";
import { GameControls } from "./GameControls";
import { GameStatus } from "./GameStatus";
import { ChessAgent } from "@/lib/chessAgent";

export const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [aiThoughts, setAiThoughts] = useState<string>("");
  const [currentThought, setCurrentThought] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");

  const chessAgent = new ChessAgent(apiKey);

  const makeMove = useCallback(async (move: string) => {
    try {
      const gameCopy = new Chess(game.fen());
      const moveResult = gameCopy.move(move);
      
      if (moveResult) {
        setGame(gameCopy);
        setGameHistory(prev => [...prev, moveResult.san]);
        
        // If game is not over, let AI make its move
        if (!gameCopy.isGameOver()) {
          setIsAiThinking(true);
          setCurrentThought("");
          setAiThoughts("");
          
          const aiMove = await chessAgent.getMove(gameCopy.fen(), (thought) => {
            setCurrentThought(thought);
            setAiThoughts(prev => prev + thought);
          });
          
          if (aiMove) {
            const aiMoveResult = gameCopy.move(aiMove);
            if (aiMoveResult) {
              setGame(new Chess(gameCopy.fen()));
              setGameHistory(prev => [...prev, aiMoveResult.san]);
            }
          }
          
          setIsAiThinking(false);
        }
      }
    } catch (error) {
      console.error("Invalid move:", error);
    }
  }, [game, chessAgent]);

  const resetGame = useCallback(() => {
    setGame(new Chess());
    setGameHistory([]);
    setAiThoughts("");
    setCurrentThought("");
    setIsAiThinking(false);
  }, []);

  const undoMove = useCallback(() => {
    const gameCopy = new Chess(game.fen());
    gameCopy.undo();
    gameCopy.undo(); // Undo both player and AI moves
    setGame(gameCopy);
    setGameHistory(prev => prev.slice(0, -2));
  }, [game]);

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ChessMind</h1>
          <p className="text-gray-600">Experience chess with an AI that shows its thinking process</p>
        </div>

        {/* API Key Input */}
        {!apiKey && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Enter your OpenAI API Key to enable the chess agent:
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="sk-..."
                className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <p className="text-xs text-blue-700 mt-1">
              Your API key is only stored locally and used for AI moves.
            </p>
          </div>
        )}

        {/* Game Status */}
        <GameStatus game={game} isAiThinking={isAiThinking} />

        {/* Main Game Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <ChessBoard 
              game={game} 
              onMove={makeMove} 
              disabled={isAiThinking || !apiKey}
            />
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Game Controls */}
            <GameControls 
              onNewGame={resetGame}
              onUndo={undoMove}
              canUndo={gameHistory.length > 0}
              disabled={isAiThinking}
            />

            {/* AI Thinking Window */}
            <ThinkingWindow 
              thoughts={aiThoughts}
              currentThought={currentThought}
              isThinking={isAiThinking}
            />

            {/* Move History */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-3">Move History</h3>
              <div className="max-h-64 overflow-y-auto">
                {gameHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm">No moves yet</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {Array.from({ length: Math.ceil(gameHistory.length / 2) }, (_, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="w-8 text-gray-500">{i + 1}.</span>
                        <span className="font-mono">{gameHistory[i * 2]}</span>
                        {gameHistory[i * 2 + 1] && (
                          <span className="font-mono">{gameHistory[i * 2 + 1]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
