
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Copy } from "lucide-react";

interface ThinkingWindowProps {
  thoughts: string;
  currentThought: string;
  isThinking: boolean;
}

export const ThinkingWindow = ({ thoughts, currentThought, isThinking }: ThinkingWindowProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts, currentThought]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(thoughts + currentThought);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            <h3 className="font-semibold">AI Thinking Process</h3>
          </div>
          <div className="flex items-center gap-2">
            <AnimatePresence>
              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-full"
                >
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Thinking...
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={copyToClipboard}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              title="Copy thoughts"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="h-96 overflow-hidden">
        <div 
          ref={scrollRef}
          className="h-full overflow-y-auto p-4 font-mono text-sm leading-relaxed"
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
                  {isThinking && (
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
                <Brain className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Make a move to see the AI's thinking process</p>
                <p className="text-xs mt-1">The AI will analyze the position and show its reasoning</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
