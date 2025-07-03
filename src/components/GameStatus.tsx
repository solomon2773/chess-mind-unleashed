
import { Chess } from "chess.js";
import { motion } from "framer-motion";
import { Crown, AlertTriangle, Users } from "lucide-react";

interface GameStatusProps {
  game: Chess;
  isAiThinking: boolean;
}

export const GameStatus = ({ game, isAiThinking }: GameStatusProps) => {
  const getGameStatus = () => {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      return {
        status: "🏆 Checkmate!",
        description: `${winner} wins the game!`,
        icon: Crown,
        color: "text-yellow-600 bg-yellow-50 border-yellow-200"
      };
    }
    
    if (game.isDraw()) {
      let drawReason = "The game ended in a draw";
      if (game.isStalemate()) {
        drawReason = "Stalemate - no legal moves available";
      } else if (game.isThreefoldRepetition()) {
        drawReason = "Draw by threefold repetition";
      } else if (game.isInsufficientMaterial()) {
        drawReason = "Draw by insufficient material";
      }
      
      return {
        status: "🤝 Draw!",
        description: drawReason,
        icon: Users,
        color: "text-gray-600 bg-gray-50 border-gray-200"
      };
    }
    
    if (game.inCheck()) {
      return {
        status: "Check!",
        description: `${game.turn() === 'w' ? 'White' : 'Black'} king is in check`,
        icon: AlertTriangle,
        color: "text-red-600 bg-red-50 border-red-200"
      };
    }
    
    if (isAiThinking) {
      return {
        status: "AI Thinking...",
        description: "The AI is analyzing the position",
        icon: Users,
        color: "text-blue-600 bg-blue-50 border-blue-200"
      };
    }
    
    return {
      status: "Your Turn",
      description: `${game.turn() === 'w' ? 'White' : 'Black'} to move`,
      icon: Users,
      color: "text-green-600 bg-green-50 border-green-200"
    };
  };

  const { status, description, icon: Icon, color } = getGameStatus();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mb-6 p-4 rounded-lg border ${color}`}
    >
      <div className="flex items-center gap-3">
        <Icon className="w-6 h-6" />
        <div>
          <h2 className="text-xl font-bold">{status}</h2>
          <p className="text-sm opacity-80">{description}</p>
        </div>
      </div>
    </motion.div>
  );
};
