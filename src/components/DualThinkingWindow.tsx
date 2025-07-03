
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Copy, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DualThinkingWindowProps {
  whiteThoughts: string;
  whiteCurrentThought: string;
  blackThoughts: string;
  blackCurrentThought: string;
  isThinking: boolean;
  currentPlayer: 'white' | 'black';
  whitePlayerName?: string;
  blackPlayerName?: string;
  isGameRunning: boolean;
  onToggleGame: () => void;
}

export const DualThinkingWindow = ({ 
  whiteThoughts, 
  whiteCurrentThought, 
  blackThoughts, 
  blackCurrentThought, 
  isThinking, 
  currentPlayer,
  whitePlayerName,
  blackPlayerName,
  isGameRunning,
  onToggleGame
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
    playerName?: string,
    scrollRef?: React.RefObject<HTMLDivElement>
  ) => {
    const isActive = currentPlayer === color && isThinking;
    const gradientClass = color === 'white' 
      ? 'from-gray-600 to-gray-800' 
      : 'from-gray-800 to-black';

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden flex-1">
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradientClass} text-white p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              <h4 className="font-semibold text-sm">
                {playerName ? `${playerName} (${color.charAt(0).toUpperCase() + color.slice(1)})` : `${color.charAt(0).toUpperCase() + color.slice(1)} Player`}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full"
                  >
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Thinking...
                  </motion.div>
                )}
              </AnimatePresence>
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
        <h3 className="text-lg font-semibold text-gray-800">AI Thinking Process</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderThinkingPanel('white', whiteThoughts, whiteCurrentThought, whitePlayerName, whiteScrollRef)}
          {renderThinkingPanel('black', blackThoughts, blackCurrentThought, blackPlayerName, blackScrollRef)}
        </div>
      </div>
    </div>
  );
};
