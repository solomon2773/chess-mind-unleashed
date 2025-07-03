
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
    if (!isGameRunning) {
      console.log("Game is not running, skipping AI move");
      return;
    }
    
    if (currentGame.isGameOver()) {
      console.log("Game is over, no more moves possible");
      onMoveProcessed();
      return;
    }
    
    const agent = createAgent(playerConfig);
    if (!agent) {
      console.error("Could not create AI agent - missing API configuration");
      onError(currentPlayer === 'white', "AI configuration missing. Please check your API keys.");
      onMoveProcessed();
      return;
    }

    onThinkingStart();
    const isWhite = currentPlayer === 'white';
    
    // Add a separator for new thinking session
    const separator = `\n\n--- ${currentPlayer.toUpperCase()} PLAYER THINKING ---\n\n`;
    onThoughtUpdate(isWhite, separator);

    try {
      console.log(`AI (${currentPlayer}) is thinking...`);
      console.log(`Current FEN: ${currentGame.fen()}`);
      console.log(`Current turn: ${currentGame.turn() === 'w' ? 'white' : 'black'}`);
      
      // Display the board in console for debugging
      const board = currentGame.board();
      console.log('Current board position:');
      board.forEach((row, i) => {
        const rowStr = row.map(piece => {
          if (!piece) return '.';
          return piece.color === 'w' ? piece.type.toUpperCase() : piece.type.toLowerCase();
        }).join(' ');
        console.log(`${8-i} ${rowStr}`);
      });
      console.log('  a b c d e f g h');
      
      const availableMoves = currentGame.moves();
      console.log(`Available moves for ${currentPlayer}: ${availableMoves.join(', ')}`);
      
      // Check castling availability
      const castlingMoves = availableMoves.filter(move => move === 'O-O' || move === 'O-O-O');
      if (castlingMoves.length > 0) {
        console.log(`Castling moves available: ${castlingMoves.join(', ')}`);
      } else {
        console.log('No castling moves available');
      }

      const aiMove = await agent.getMove(currentGame.fen(), (thought) => {
        onThoughtUpdate(isWhite, thought);
      });

      if (!aiMove) {
        console.error("AI did not provide a move");
        
        // Check if the game is actually over
        if (currentGame.isGameOver()) {
          console.log("Game is over - AI correctly identified no legal moves");
          onError(isWhite, "Game is over - no legal moves available");
          onMoveProcessed();
          return;
        }
        
        onError(isWhite, "AI did not provide a valid move");
        onMoveProcessed();
        return;
      }

      // Create a fresh copy of the game to avoid state issues
      const freshGame = new Chess(currentGame.fen());
      let moveResult = null;
      
      console.log(`AI suggested move: "${aiMove}"`);
      console.log(`Available moves: ${availableMoves.join(', ')}`);
      
      // Check if the suggested move is actually in the available moves
      const isMoveAvailable = availableMoves.includes(aiMove);
      console.log(`Is "${aiMove}" in available moves? ${isMoveAvailable}`);
      
      if (!isMoveAvailable) {
        console.log(`❌ ERROR: Move "${aiMove}" is NOT in the list of legal moves!`);
        console.log(`This suggests the AI is not properly analyzing the current position.`);
        console.log(`The AI should only suggest moves from the available moves list.`);
      } else {
        console.log(`✅ Move "${aiMove}" is confirmed to be legal.`);
      }
      
      if (!isMoveAvailable) {
        console.log(`Move "${aiMove}" is not available. Looking for similar moves...`);
        
        // Try to find similar moves by piece type
        const pieceType = aiMove.charAt(0).toUpperCase();
        const similarMoves = availableMoves.filter(move => 
          move.startsWith(pieceType) || 
          (pieceType === 'P' && /^[a-h][1-8]$/.test(move)) // Pawn moves
        );
        
        if (similarMoves.length > 0) {
          console.log(`Found ${similarMoves.length} similar ${pieceType} moves: ${similarMoves.join(', ')}`);
          
          // Try to use a similar move of the same piece type
          const bestSimilarMove = similarMoves.find(move => {
            // Prefer moves that don't involve captures if the original wasn't a capture
            if (!aiMove.includes('x') && !move.includes('x')) return true;
            // Prefer moves that do involve captures if the original was a capture
            if (aiMove.includes('x') && move.includes('x')) return true;
            return false;
          }) || similarMoves[0];
          
          console.log(`Will try similar move: ${bestSimilarMove}`);
          
          // Try the similar move directly
          freshGame.load(currentGame.fen());
          try {
            moveResult = freshGame.move(bestSimilarMove);
            if (moveResult) {
              console.log(`Successfully executed similar move: ${bestSimilarMove} (instead of ${aiMove})`);
              onMoveComplete(freshGame, moveResult);
              onMoveProcessed();
              return;
            }
          } catch (error) {
            console.log(`Similar move failed: ${bestSimilarMove}`);
          }
        }
      }

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
      console.log(`Possible moves (verbose):`, possibleMoves.map(m => `${m.san} (${m.from}${m.to})`));
      
      // Try multiple matching strategies
      const matchingMove = possibleMoves.find(m => {
        const cleanAiMove = aiMove.replace(/[+#!?]/, '').trim().toLowerCase();
        const cleanSan = m.san.replace(/[+#!?]/, '').trim().toLowerCase();
        
        // Exact match first
        if (m.san === aiMove) {
          console.log(`Exact match found: ${m.san} for AI suggestion: ${aiMove}`);
          return true;
        }
        
        // Long algebraic notation match
        if (m.lan === aiMove) {
          console.log(`LAN match found: ${m.lan} for AI suggestion: ${aiMove}`);
          return true;
        }
        
        // From-to notation match
        if ((m.from + m.to) === aiMove) {
          console.log(`From-to match found: ${m.from}${m.to} for AI suggestion: ${aiMove}`);
          return true;
        }
        
        // Clean match (without check/checkmate symbols)
        if (cleanSan === cleanAiMove) {
          console.log(`Clean match found: ${cleanSan} for AI suggestion: ${cleanAiMove}`);
          return true;
        }
        
        // Pawn move match
        if (cleanAiMove.length === 2 && m.to === cleanAiMove) {
          console.log(`Pawn move match found: ${m.to} for AI suggestion: ${cleanAiMove}`);
          return true;
        }
        
        // Start/end match
        if (m.san.startsWith(cleanAiMove) || cleanAiMove.startsWith(cleanSan)) {
          console.log(`Start/end match found: ${m.san} for AI suggestion: ${cleanAiMove}`);
          return true;
        }
        
        // Contains match (fallback)
        if (m.san.includes(cleanAiMove) || cleanAiMove.includes(cleanSan)) {
          console.log(`Contains match found: ${m.san} for AI suggestion: ${cleanAiMove}`);
          return true;
        }
        
        // Special handling for bishop moves (Bxf7+)
        if (cleanAiMove.startsWith('bx') && m.san.toLowerCase().startsWith('bx') && m.san.toLowerCase().includes(cleanAiMove.substring(2))) {
          console.log(`Bishop capture match found: ${m.san} for AI suggestion: ${cleanAiMove}`);
          return true;
        }
        
        // Special handling for castling moves
        if (aiMove === 'O-O' && m.san === 'O-O') {
          console.log(`Kingside castling match found: ${m.san} for AI suggestion: ${aiMove}`);
          return true;
        }
        if (aiMove === 'O-O-O' && m.san === 'O-O-O') {
          console.log(`Queenside castling match found: ${m.san} for AI suggestion: ${aiMove}`);
          return true;
        }
        
        return false;
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
              } else {
          // If no match found, try specific fallbacks
          
          // Castling fallback
          if (aiMove === 'O-O' || aiMove === 'O-O-O') {
            const castlingMoves = possibleMoves.filter(m => m.san === 'O-O' || m.san === 'O-O-O');
            if (castlingMoves.length > 0) {
              const fallbackMove = castlingMoves[0];
              console.log(`Using fallback castling move: ${fallbackMove.san} for AI suggestion: ${aiMove}`);
              freshGame.load(currentGame.fen());
              try {
                moveResult = freshGame.move(fallbackMove.san);
                if (moveResult) {
                  onMoveComplete(freshGame, moveResult);
                  onMoveProcessed();
                  return;
                }
              } catch (error) {
                console.log(`Fallback castling move failed: ${fallbackMove.san}`);
              }
            } else {
              console.log(`Castling ${aiMove} not available. Available castling moves: ${possibleMoves.filter(m => m.san.includes('O-O')).map(m => m.san).join(', ')}`);
            }
          }
          
          // Bishop move fallback
          if (aiMove.toLowerCase().startsWith('bxf7')) {
            const bishopMoves = possibleMoves.filter(m => m.san.toLowerCase().includes('xf7') && m.san.toLowerCase().startsWith('b'));
            if (bishopMoves.length > 0) {
              const fallbackMove = bishopMoves[0];
              console.log(`Using fallback bishop move: ${fallbackMove.san} for AI suggestion: ${aiMove}`);
              freshGame.load(currentGame.fen());
              try {
                moveResult = freshGame.move(fallbackMove.san);
                if (moveResult) {
                  onMoveComplete(freshGame, moveResult);
                  onMoveProcessed();
                  return;
                }
              } catch (error) {
                console.log(`Fallback bishop move failed: ${fallbackMove.san}`);
              }
            }
          }
        }

      // If all else fails, try to find a sensible move instead of random
      if (availableMoves.length > 0) {
        console.log(`AI suggested illegal move "${aiMove}". Choosing from available moves: ${availableMoves.join(', ')}`);
        
        // Prefer certain types of moves in order of preference
        const movePreferences = [
          // 1. Pawn moves (usually safe)
          (move: string) => /^[a-h][1-8]$/.test(move),
          // 2. Piece development moves
          (move: string) => /^[NBRQ][a-h][1-8]$/.test(move),
          // 3. Castling
          (move: string) => /^O-O/.test(move),
          // 4. Captures
          (move: string) => move.includes('x'),
          // 5. Any other move
          (move: string) => true
        ];
        
        let selectedMove = null;
        for (const preference of movePreferences) {
          selectedMove = availableMoves.find(preference);
          if (selectedMove) {
            console.log(`Selected move based on preference: ${selectedMove}`);
            break;
          }
        }
        
        // Fallback to random if no preference matches
        if (!selectedMove) {
          selectedMove = availableMoves[Math.floor(Math.random() * availableMoves.length)];
          console.log(`No preference match, using random move: ${selectedMove}`);
        }
        
        freshGame.load(currentGame.fen());
        try {
          moveResult = freshGame.move(selectedMove);
          if (moveResult) {
            console.log(`AI move failed, using sensible move: ${selectedMove}`);
            onError(isWhite, `Could not execute "${aiMove}", played ${selectedMove} instead`);
            onMoveComplete(freshGame, moveResult);
            onMoveProcessed();
            return;
          }
        } catch (error) {
          console.error("Even sensible move failed:", error);
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
