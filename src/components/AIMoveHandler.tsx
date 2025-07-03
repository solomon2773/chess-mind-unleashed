
import { Chess } from "chess.js";
import { PlayerConfig } from "./PlayerConfig";
import { LangChainChessAgent, LLMConfig } from "@/lib/langchainChessAgent";

interface AIMoveHandlerProps {
  currentGame: Chess;
  playerConfig: PlayerConfig;
  apiKeys: Record<string, string>;
  isGameRunning: boolean;
  onMoveComplete: (newGame: Chess, moveResult: any) => void;
  onThinkingStart: () => void;
  onThinkingEnd: () => void;
  onThoughtUpdate: (isWhite: boolean, thought: string) => void;
  onClearThoughts: (isWhite: boolean) => void;
  onError: (isWhite: boolean, error: string) => void;
}

export const AIMoveHandler = ({
  currentGame,
  playerConfig,
  apiKeys,
  isGameRunning,
  onMoveComplete,
  onThinkingStart,
  onThinkingEnd,
  onThoughtUpdate,
  onClearThoughts,
  onError
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
    if (!isGameRunning) return;
    
    const agent = createAgent(playerConfig);
    if (!agent) {
      console.error("Could not create AI agent");
      return;
    }

    onThinkingStart();
    const isWhite = currentGame.turn() === 'w';
    
    // Clear previous thoughts
    onClearThoughts(isWhite);

    try {
      const aiMove = await agent.getMove(currentGame.fen(), (thought) => {
        onThoughtUpdate(isWhite, thought);
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
          onMoveComplete(freshGame, moveResult);
        } else {
          console.error(`Could not execute AI move: ${aiMove}`);
          onError(isWhite, `Could not execute move "${aiMove}". Available moves: ${currentGame.moves().join(', ')}`);
        }
      } else {
        console.error("AI did not provide a move");
        onError(isWhite, "AI did not provide a valid move");
      }
    } catch (error: any) {
      console.error("Error in AI move generation:", error);
      onError(isWhite, error.message || 'Unknown error occurred');
    }

    onThinkingEnd();
  };

  // This component doesn't render anything, it's just for logic
  return null;
};
