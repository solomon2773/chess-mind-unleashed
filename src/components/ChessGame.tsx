
import { useState, useCallback } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "./ChessBoard";
import { DualThinkingWindow } from "./DualThinkingWindow";
import { GameControls } from "./GameControls";
import { GameStatus } from "./GameStatus";
import { PlayerConfig, PlayerConfig as PlayerConfigComponent } from "./PlayerConfig";
import { ApiKeysConfig } from "./ApiKeysConfig";
import { LangChainChessAgent, LLMConfig } from "@/lib/langchainChessAgent";

export const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<'white' | 'black'>('white');
  const [isGameRunning, setIsGameRunning] = useState(false);
  
  // AI Thinking states for both players
  const [whiteThoughts, setWhiteThoughts] = useState<string>("");
  const [blackThoughts, setBlackThoughts] = useState<string>("");
  const [whiteCurrentThought, setWhiteCurrentThought] = useState<string>("");
  const [blackCurrentThought, setBlackCurrentThought] = useState<string>("");

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

  // Chess agents
  const createAgent = (config: PlayerConfig): LangChainChessAgent | null => {
    if (config.type !== 'ai' || !config.llmProvider) return null;
    
    let requiredKey: string;
    let hasRequiredConfig = false;

    if (config.llmProvider.startsWith('openai')) {
      requiredKey = 'openai';
      hasRequiredConfig = !!apiKeys[requiredKey];
    } else if (config.llmProvider.startsWith('claude')) {
      requiredKey = 'anthropic';
      hasRequiredConfig = !!apiKeys[requiredKey];
    } else if (config.llmProvider.startsWith('gemini')) {
      requiredKey = 'google';
      hasRequiredConfig = !!apiKeys[requiredKey];
    } else if (config.llmProvider.startsWith('azure')) {
      requiredKey = 'azure';
      hasRequiredConfig = !!(apiKeys.azure && apiKeys.azureEndpoint && apiKeys.azureDeploymentName);
    }

    if (!hasRequiredConfig) return null;

    const llmConfig: LLMConfig = {
      provider: config.llmProvider,
      apiKey: apiKeys[requiredKey],
      temperature: 0.7,
      ...(config.llmProvider.startsWith('azure') && {
        azureEndpoint: apiKeys.azureEndpoint,
        azureDeploymentName: apiKeys.azureDeploymentName
      })
    };

    return new LangChainChessAgent(llmConfig);
  };

  const toggleGame = useCallback(() => {
    setIsGameRunning(prev => {
      const newValue = !prev;
      
      // If starting the game and current player is AI, make AI move
      if (newValue && !game.isGameOver()) {
        const currentPlayerConfig = game.turn() === 'w' ? whitePlayer : blackPlayer;
        if (currentPlayerConfig.type === 'ai') {
          setTimeout(() => makeAiMove(game, currentPlayerConfig), 500);
        }
      }
      
      return newValue;
    });
  }, [game, whitePlayer, blackPlayer]);

  const makeMove = useCallback(async (move: string) => {
    if (!isGameRunning) return;
    
    try {
      const gameCopy = new Chess(game.fen());
      const moveResult = gameCopy.move(move);
      
      if (moveResult) {
        setGame(gameCopy);
        setGameHistory(prev => [...prev, moveResult.san]);
        setCurrentPlayer(gameCopy.turn() === 'w' ? 'white' : 'black');
        
        // Check if next player is AI and game is not over
        if (!gameCopy.isGameOver() && isGameRunning) {
          const nextPlayer = gameCopy.turn() === 'w' ? whitePlayer : blackPlayer;
          
          if (nextPlayer.type === 'ai') {
            setTimeout(() => makeAiMove(gameCopy, nextPlayer), 1000);
          }
        }
      }
    } catch (error) {
      console.error("Invalid move:", error);
    }
  }, [game, whitePlayer, blackPlayer, isGameRunning]);

  const makeAiMove = async (currentGame: Chess, playerConfig: PlayerConfig) => {
    if (!isGameRunning) return;
    
    const agent = createAgent(playerConfig);
    if (!agent) {
      console.error("Could not create AI agent");
      return;
    }

    setIsAiThinking(true);
    const isWhite = currentGame.turn() === 'w';
    
    // Clear previous thoughts
    if (isWhite) {
      setWhiteCurrentThought("");
      setWhiteThoughts("");
    } else {
      setBlackCurrentThought("");
      setBlackThoughts("");
    }

    try {
      const aiMove = await agent.getMove(currentGame.fen(), (thought) => {
        if (isWhite) {
          setWhiteCurrentThought(thought);
          setWhiteThoughts(prev => prev + thought);
        } else {
          setBlackCurrentThought(thought);
          setBlackThoughts(prev => prev + thought);
        }
      });

      if (aiMove) {
        console.log(`AI suggested move: ${aiMove}`);
        
        // Create a fresh copy of the game to avoid state issues
        const freshGame = new Chess(currentGame.fen());
        let validMove = null;
        let moveResult = null;

        // Try the move as-is first
        try {
          moveResult = freshGame.move(aiMove);
          if (moveResult) {
            validMove = aiMove;
          }
        } catch (error) {
          console.log(`Direct move failed: ${aiMove}`);
        }

        // If direct move failed, try to find a matching move
        if (!validMove) {
          const possibleMoves = freshGame.moves({ verbose: true });
          const matchingMove = possibleMoves.find(m => 
            m.san === aiMove || 
            m.lan === aiMove || 
            (m.from + m.to) === aiMove ||
            m.san.replace(/[+#]/, '') === aiMove.replace(/[+#]/, '') ||
            m.san.toLowerCase() === aiMove.toLowerCase()
          );
          
          if (matchingMove) {
            // Reset the game and try the matching move
            freshGame.load(currentGame.fen());
            try {
              moveResult = freshGame.move(matchingMove.san);
              if (moveResult) {
                validMove = matchingMove.san;
              }
            } catch (error) {
              console.log(`Matching move failed: ${matchingMove.san}`);
            }
          }
        }

        if (validMove && moveResult) {
          console.log(`Successfully executed move: ${validMove}`);
          
          // Update the game state
          setGame(new Chess(freshGame.fen()));
          setGameHistory(prev => [...prev, moveResult.san]);
          setCurrentPlayer(freshGame.turn() === 'w' ? 'white' : 'black');
          
          // Continue AI vs AI game if both players are AI and game is not over
          if (!freshGame.isGameOver() && isGameRunning) {
            const nextPlayer = freshGame.turn() === 'w' ? whitePlayer : blackPlayer;
            if (nextPlayer.type === 'ai') {
              setTimeout(() => makeAiMove(freshGame, nextPlayer), 1500);
            }
          }
        } else {
          console.error(`Could not execute AI move: ${aiMove}`);
          const thoughts = isWhite ? whiteCurrentThought : blackCurrentThought;
          const setter = isWhite ? setWhiteCurrentThought : setBlackCurrentThought;
          setter(thoughts + `\n\n[Error: Could not execute move "${aiMove}". Available moves: ${currentGame.moves().join(', ')}]`);
        }
      } else {
        console.error("AI did not provide a move");
        const thoughts = isWhite ? whiteCurrentThought : blackCurrentThought;
        const setter = isWhite ? setWhiteCurrentThought : setBlackCurrentThought;
        setter(thoughts + "\n\n[Error: AI did not provide a valid move]");
      }
    } catch (error) {
      console.error("Error in AI move generation:", error);
      const thoughts = isWhite ? whiteCurrentThought : blackCurrentThought;
      const setter = isWhite ? setWhiteCurrentThought : setBlackCurrentThought;
      setter(thoughts + `\n\n[Error: ${error.message || 'Unknown error occurred'}]`);
    }

    setIsAiThinking(false);
  };

  const resetGame = useCallback(() => {
    setGame(new Chess());
    setGameHistory([]);
    setCurrentPlayer('white');
    setWhiteThoughts("");
    setBlackThoughts("");
    setWhiteCurrentThought("");
    setBlackCurrentThought("");
    setIsAiThinking(false);
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

  const canMakeMove = () => {
    const currentPlayerConfig = currentPlayer === 'white' ? whitePlayer : blackPlayer;
    return currentPlayerConfig.type === 'human' && !isAiThinking && isGameRunning;
  };

  return (
    <div className="min-h-screen p-4">
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
              onNewGame={resetGame}
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
