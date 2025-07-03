
import { useState, useCallback, useEffect } from "react";
import { ChessBoard } from "./ChessBoard";
import { DualThinkingWindow } from "./DualThinkingWindow";
import { GameControls } from "./GameControls";
import { GameStatus } from "./GameStatus";
import { PlayerConfig, PlayerConfig as PlayerConfigComponent } from "./PlayerConfig";
import { ApiKeysConfig } from "./ApiKeysConfig";
import { AIMoveHandler } from "./AIMoveHandler";
import { useChessGame } from "@/hooks/useChessGame";
import { useAIThinking } from "@/hooks/useAIThinking";
import { useMoveHandler } from "@/hooks/useMoveHandler";

export const ChessGame = () => {
  const {
    game,
    gameHistory,
    currentPlayer,
    isGameRunning,
    setIsGameRunning,
    resetGame,
    undoMove,
    updateGameState
  } = useChessGame();

  const {
    isAiThinking,
    setIsAiThinking,
    whiteThoughts,
    blackThoughts,
    whiteCurrentThought,
    blackCurrentThought,
    clearThoughts,
    updateThoughts,
    clearCurrentThoughts,
    addErrorToThoughts
  } = useAIThinking();

  // API Keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  // Player configurations
  const [whitePlayer, setWhitePlayer] = useState<PlayerConfig>({
    type: 'human',
    name: 'Human'
  });
  
  const [blackPlayer, setBlackPlayer] = useState<PlayerConfig>({
    type: 'ai',
    llmProvider: 'openai-gpt4',
    name: 'AI Agent'
  });

  // AI move coordination
  const [pendingAiMove, setPendingAiMove] = useState<{player: 'white' | 'black'} | null>(null);

  const handleAiMove = useCallback((currentGame: any, playerConfig: PlayerConfig) => {
    if (!isGameRunning || currentGame.isGameOver()) return;
    
    const player = currentGame.turn() === 'w' ? 'white' : 'black';
    setPendingAiMove({ player });
  }, [isGameRunning]);

  const { makeMove } = useMoveHandler({
    game,
    whitePlayer,
    blackPlayer,
    isGameRunning,
    updateGameState,
    onAiMove: handleAiMove
  });

  const toggleGame = useCallback(() => {
    setIsGameRunning(prev => {
      const newValue = !prev;
      
      // If starting the game and current player is AI, trigger AI move
      if (newValue && !game.isGameOver()) {
        const currentPlayerConfig = game.turn() === 'w' ? whitePlayer : blackPlayer;
        if (currentPlayerConfig.type === 'ai') {
          setTimeout(() => handleAiMove(game, currentPlayerConfig), 500);
        }
      }
      
      return newValue;
    });
  }, [game, whitePlayer, blackPlayer, handleAiMove]);

  const handleResetGame = useCallback(() => {
    resetGame();
    clearThoughts();
    setIsAiThinking(false);
    setPendingAiMove(null);
  }, [resetGame, clearThoughts]);

  const canMakeMove = () => {
    const currentPlayerConfig = currentPlayer === 'white' ? whitePlayer : blackPlayer;
    return currentPlayerConfig.type === 'human' && !isAiThinking && isGameRunning;
  };

  const handleAiMoveComplete = useCallback((newGame: any, moveResult: any) => {
    updateGameState(newGame, moveResult);
    
    // Check if next player is also AI and continue the game
    if (!newGame.isGameOver() && isGameRunning) {
      const nextPlayer = newGame.turn() === 'w' ? whitePlayer : blackPlayer;
      if (nextPlayer.type === 'ai') {
        setTimeout(() => handleAiMove(newGame, nextPlayer), 1500);
      }
    }
  }, [updateGameState, isGameRunning, whitePlayer, blackPlayer, handleAiMove]);

  const handleMoveProcessed = useCallback(() => {
    setPendingAiMove(null);
  }, []);

  // Determine which AI should move
  const shouldWhiteAiMove = pendingAiMove?.player === 'white' && whitePlayer.type === 'ai';
  const shouldBlackAiMove = pendingAiMove?.player === 'black' && blackPlayer.type === 'ai';

  return (
    <div className="min-h-screen p-4">
      {/* White AI Move Handler */}
      <AIMoveHandler
        currentGame={game}
        playerConfig={whitePlayer}
        apiKeys={apiKeys}
        isGameRunning={isGameRunning}
        currentPlayer="white"
        shouldMakeMove={shouldWhiteAiMove}
        onMoveComplete={handleAiMoveComplete}
        onThinkingStart={() => setIsAiThinking(true)}
        onThinkingEnd={() => setIsAiThinking(false)}
        onThoughtUpdate={updateThoughts}
        onClearThoughts={clearCurrentThoughts}
        onError={addErrorToThoughts}
        onMoveProcessed={handleMoveProcessed}
      />

      {/* Black AI Move Handler */}
      <AIMoveHandler
        currentGame={game}
        playerConfig={blackPlayer}
        apiKeys={apiKeys}
        isGameRunning={isGameRunning}
        currentPlayer="black"
        shouldMakeMove={shouldBlackAiMove}
        onMoveComplete={handleAiMoveComplete}
        onThinkingStart={() => setIsAiThinking(true)}
        onThinkingEnd={() => setIsAiThinking(false)}
        onThoughtUpdate={updateThoughts}
        onClearThoughts={clearCurrentThoughts}
        onError={addErrorToThoughts}
        onMoveProcessed={handleMoveProcessed}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">ChessMind</h1>
          <p className="text-gray-600">Experience chess with AI agents powered by different LLMs</p>
        </div>

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <ApiKeysConfig apiKeys={apiKeys} onApiKeysChange={setApiKeys} />
          <PlayerConfigComponent 
            player="white" 
            config={whitePlayer} 
            onConfigChange={setWhitePlayer}
            availableApiKeys={apiKeys}
          />
          <PlayerConfigComponent 
            player="black" 
            config={blackPlayer} 
            onConfigChange={setBlackPlayer}
            availableApiKeys={apiKeys}
          />
        </div>

        {/* Game Status */}
        <GameStatus game={game} isAiThinking={isAiThinking} />

        {/* Main Game Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chess Board */}
          <div className="lg:col-span-2">
            <ChessBoard 
              game={game} 
              onMove={makeMove} 
              disabled={!canMakeMove()}
            />
          </div>

          {/* Right Panel */}
          <div className="space-y-6">
            {/* Game Controls */}
            <GameControls 
              onNewGame={handleResetGame}
              onUndo={undoMove}
              canUndo={gameHistory.length > 0 && isGameRunning}
              disabled={isAiThinking}
            />

            {/* Dual AI Thinking Window */}
            <DualThinkingWindow 
              whiteThoughts={whiteThoughts}
              whiteCurrentThought={whiteCurrentThought}
              blackThoughts={blackThoughts}
              blackCurrentThought={blackCurrentThought}
              isThinking={isAiThinking}
              currentPlayer={currentPlayer}
              whitePlayerName={whitePlayer.name}
              blackPlayerName={blackPlayer.name}
              isGameRunning={isGameRunning}
              onToggleGame={toggleGame}
            />

            {/* Move History */}
            <div className="bg-white rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-3">Move History</h3>
              <div className="max-h-64 overflow-y-auto">
                {gameHistory.length === 0 ? (
                  <p className="text-gray-500 text-sm">No moves yet</p>
                ) : (
                  <div className="space-y-1 text-sm">
                    {Array.from({ length: Math.ceil(gameHistory.length / 2) }, (_, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="w-8 text-gray-500">{i + 1}.</span>
                        <span className="font-mono min-w-16">{gameHistory[i * 2] || ''}</span>
                        <span className="font-mono min-w-16">{gameHistory[i * 2 + 1] || ''}</span>
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
