
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Copy, Play, Pause, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlayerConfig } from "./PlayerConfig";

interface DualThinkingWindowProps {
  whiteThoughts: string;
  whiteCurrentThought: string;
  blackThoughts: string;
  blackCurrentThought: string;
  isThinking: boolean;
  currentPlayer: 'white' | 'black';
  whitePlayerConfig?: PlayerConfig;
  blackPlayerConfig?: PlayerConfig;
  isGameRunning: boolean;
  onToggleGame: () => void;
  onClearThoughts?: () => void;
}

export const DualThinkingWindow = ({ 
  whiteThoughts, 
  whiteCurrentThought, 
  blackThoughts, 
  blackCurrentThought, 
  isThinking, 
  currentPlayer,
  whitePlayerConfig,
  blackPlayerConfig,
  isGameRunning,
  onToggleGame,
  onClearThoughts
}: DualThinkingWindowProps) => {
  const whiteScrollRef = useRef<HTMLDivElement>(null);
  const blackScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (whiteScrollRef.current) {
      whiteScrollRef.current.scrollTop = whiteScrollRef.current.scrollHeight;
    }
  }, [whiteThoughts, whiteCurrentThought]);

  useEffect(() => {
    if (blackScrollRef.current) {
      blackScrollRef.current.scrollTop = blackScrollRef.current.scrollHeight;
    }
  }, [blackThoughts, blackCurrentThought]);

  const copyToClipboard = (thoughts: string, currentThought: string) => {
    navigator.clipboard.writeText(thoughts + currentThought);
  };

  const renderThinkingPanel = (
    color: 'white' | 'black',
    thoughts: string,
    currentThought: string,
    playerConfig?: PlayerConfig,
    scrollRef?: React.RefObject<HTMLDivElement>
  ) => {
    const isActive = currentPlayer === color && isThinking;
    const gradientClass = color === 'white' 
      ? 'from-gray-600 to-gray-800' 
      : 'from-gray-800 to-black';

    // Get model name for AI players
    const getModelName = (provider?: string) => {
      const modelNames: Record<string, string> = {
        'openai-gpt4': 'GPT-4 Turbo',
        'openai-gpt35': 'GPT-3.5 Turbo',
        'claude-sonnet': 'Claude 3.5 Sonnet',
        'claude-haiku': 'Claude 3 Haiku',
        'gemini-pro': 'Gemini Pro',
        'gemini-flash': 'Gemini 1.5 Flash',
        'azure-gpt4': 'Azure GPT-4',
        'azure-gpt35': 'Azure GPT-3.5'
      };
      return provider ? modelNames[provider] || provider : '';
    };

    const getPlayerTitle = () => {
      if (!playerConfig) {
        return `${color.charAt(0).toUpperCase() + color.slice(1)} Player`;
      }
      
      if (playerConfig.type === 'human') {
        return `${playerConfig.name} (${color.charAt(0).toUpperCase() + color.slice(1)})`;
      }
      
      if (playerConfig.type === 'ai' && playerConfig.llmProvider) {
        const modelName = getModelName(playerConfig.llmProvider);
        return `${playerConfig.name} - ${modelName} (${color.charAt(0).toUpperCase() + color.slice(1)})`;
      }
      
      return `${playerConfig.name} (${color.charAt(0).toUpperCase() + color.slice(1)})`;
    };

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1">
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradientClass} text-white p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <div className="text-sm">
                <h4 className="font-semibold leading-tight">
                  {getPlayerTitle()}
                </h4>
                {isActive && (
                  <motion.div 
                    className="text-xs opacity-90 mt-1 flex items-center gap-1"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Thinking...
                  </motion.div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(thoughts, currentThought)}
                className="p-1 hover:bg-white/20 rounded transition-colors"
                title="Copy thoughts"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="h-64 overflow-hidden">
          <div 
            ref={scrollRef}
            className="h-full overflow-y-auto p-3 font-mono text-xs leading-relaxed"
          >
            {thoughts || currentThought ? (
              <div className="space-y-2">
                {/* Previous thoughts */}
                {thoughts && (
                  <div className="text-gray-700 whitespace-pre-wrap">
                    {thoughts}
                  </div>
                )}
                
                {/* Current streaming thought */}
                {currentThought && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-blue-600 whitespace-pre-wrap"
                  >
                    {currentThought}
                    {isActive && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                        className="ml-1"
                      >
                        ▋
                      </motion.span>
                    )}
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Waiting for {color} player...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Game Control */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Game Control</h3>
          <Button
            onClick={onToggleGame}
            className="flex items-center gap-2"
            variant={isGameRunning ? "destructive" : "default"}
          >
            {isGameRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Stop Game
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Start Game
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Dual Thinking Panels */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">AI Thinking Process</h3>
          {onClearThoughts && (
            <Button
              onClick={onClearThoughts}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
              disabled={isThinking}
            >
              <Trash2 className="w-4 h-4" />
              Clear Thoughts
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderThinkingPanel('white', whiteThoughts, whiteCurrentThought, whitePlayerConfig, whiteScrollRef)}
          {renderThinkingPanel('black', blackThoughts, blackCurrentThought, blackPlayerConfig, blackScrollRef)}
        </div>
      </div>
    </div>
  );
};
