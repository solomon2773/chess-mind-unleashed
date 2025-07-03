
import { useEffect } from "react";
import { Chess } from "chess.js";
import { PlayerConfig } from "./PlayerConfig";
import { LangChainChessAgent, LLMConfig } from "@/lib/langchainChessAgent";

interface AIMoveHandlerProps {
  currentGame: Chess;
  playerConfig: PlayerConfig;
  apiKeys: Record<string, string>;
  isGameRunning: boolean;
  currentPlayer: 'white' | 'black';
  shouldMakeMove: boolean;
  onMoveComplete: (newGame: Chess, moveResult: any) => void;
  onThinkingStart: () => void;
  onThinkingEnd: () => void;
  onThoughtUpdate: (isWhite: boolean, thought: string) => void;
  onClearThoughts: (isWhite: boolean) => void;
  onError: (isWhite: boolean, error: string) => void;
  onMoveProcessed: () => void;
}

export const AIMoveHandler = ({
  currentGame,
  playerConfig,
  apiKeys,
  isGameRunning,
  currentPlayer,
  shouldMakeMove,
  onMoveComplete,
  onThinkingStart,
  onThinkingEnd,
  onThoughtUpdate,
  onClearThoughts,
  onError,
  onMoveProcessed
}: AIMoveHandlerProps) => {
  
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

  const makeAiMove = async () => {
    if (!isGameRunning || currentGame.isGameOver()) return;
    
    const agent = createAgent(playerConfig);
    if (!agent) {
      console.error("Could not create AI agent - missing API configuration");
      onError(currentPlayer === 'white', "AI configuration missing. Please check your API keys.");
      onMoveProcessed();
      return;
    }

    onThinkingStart();
    const isWhite = currentPlayer === 'white';
    
    // Clear previous thoughts
    onClearThoughts(isWhite);

    try {
      console.log(`AI (${currentPlayer}) is thinking...`);
      const availableMoves = currentGame.moves();
      console.log(`Available moves for ${currentPlayer}: ${availableMoves.join(', ')}`);

      const aiMove = await agent.getMove(currentGame.fen(), (thought) => {
        onThoughtUpdate(isWhite, thought);
      });

      if (!aiMove) {
        console.error("AI did not provide a move");
        onError(isWhite, "AI did not provide a valid move");
        onMoveProcessed();
        return;
      }

      console.log(`AI suggested move: ${aiMove}`);
      
      // Create a fresh copy of the game to avoid state issues
      const freshGame = new Chess(currentGame.fen());
      let moveResult = null;

      // Try the move as-is first
      try {
        moveResult = freshGame.move(aiMove);
        if (moveResult) {
          console.log(`Successfully executed move: ${aiMove}`);
          onMoveComplete(freshGame, moveResult);
          onMoveProcessed();
          return;
        }
      } catch (error) {
        console.log(`Direct move failed: ${aiMove}`);
      }

      // If direct move failed, try to find a matching move
      const possibleMoves = freshGame.moves({ verbose: true });
      
      // Try multiple matching strategies
      const matchingMove = possibleMoves.find(m => {
        const cleanAiMove = aiMove.replace(/[+#!?]/, '').trim();
        const cleanSan = m.san.replace(/[+#!?]/, '').trim();
        
        return (
          m.san === aiMove ||
          m.lan === aiMove ||
          (m.from + m.to) === aiMove ||
          cleanSan === cleanAiMove ||
          cleanSan.toLowerCase() === cleanAiMove.toLowerCase() ||
          // Try without piece notation for pawn moves
          (cleanAiMove.length === 2 && m.to === cleanAiMove) ||
          // Try algebraic notation variations
          m.san.startsWith(cleanAiMove) ||
          cleanAiMove.startsWith(cleanSan)
        );
      });
      
      if (matchingMove) {
        // Reset the game and try the matching move
        freshGame.load(currentGame.fen());
        try {
          moveResult = freshGame.move(matchingMove.san);
          if (moveResult) {
            console.log(`Successfully executed matching move: ${matchingMove.san} (from AI suggestion: ${aiMove})`);
            onMoveComplete(freshGame, moveResult);
            onMoveProcessed();
            return;
          }
        } catch (error) {
          console.log(`Matching move failed: ${matchingMove.san}`);
        }
      }

      // If all else fails, make a random valid move
      if (availableMoves.length > 0) {
        const randomMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
        freshGame.load(currentGame.fen());
        try {
          moveResult = freshGame.move(randomMove);
          if (moveResult) {
            console.log(`AI move failed, using random move: ${randomMove}`);
            onError(isWhite, `Could not execute "${aiMove}", played ${randomMove} instead`);
            onMoveComplete(freshGame, moveResult);
            onMoveProcessed();
            return;
          }
        } catch (error) {
          console.error("Even random move failed:", error);
        }
      }

      // Complete failure
      console.error(`Could not execute any move. AI suggested: ${aiMove}, Available: ${availableMoves.join(', ')}`);
      onError(isWhite, `Could not execute move "${aiMove}". Available moves: ${availableMoves.slice(0, 5).join(', ')}${availableMoves.length > 5 ? '...' : ''}`);

    } catch (error: any) {
      console.error("Error in AI move generation:", error);
      onError(isWhite, error.message || 'Unknown error occurred');
    } finally {
      onThinkingEnd();
      onMoveProcessed();
    }
  };

  // Effect to trigger AI move when conditions are met
  useEffect(() => {
    if (shouldMakeMove && playerConfig.type === 'ai' && isGameRunning && !currentGame.isGameOver()) {
      const timeoutId = setTimeout(() => {
        makeAiMove();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldMakeMove, playerConfig.type, isGameRunning, currentGame.fen(), currentPlayer]);

  // This component doesn't render anything, it's just for logic
  return null;
};
