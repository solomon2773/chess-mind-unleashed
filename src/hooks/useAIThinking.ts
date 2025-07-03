
import { useState } from "react";

export const useAIThinking = () => {
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [whiteThoughts, setWhiteThoughts] = useState<string>("");
  const [blackThoughts, setBlackThoughts] = useState<string>("");
  const [whiteCurrentThought, setWhiteCurrentThought] = useState<string>("");
  const [blackCurrentThought, setBlackCurrentThought] = useState<string>("");

  const clearThoughts = () => {
    setWhiteThoughts("");
    setBlackThoughts("");
    setWhiteCurrentThought("");
    setBlackCurrentThought("");
  };

  const updateThoughts = (isWhite: boolean, thought: string) => {
    if (isWhite) {
      setWhiteCurrentThought(thought);
      setWhiteThoughts(prev => prev + thought);
    } else {
      setBlackCurrentThought(thought);
      setBlackThoughts(prev => prev + thought);
    }
  };

  const clearCurrentThoughts = (isWhite: boolean) => {
    if (isWhite) {
      setWhiteCurrentThought("");
      setWhiteThoughts("");
    } else {
      setBlackCurrentThought("");
      setBlackThoughts("");
    }
  };

  const addErrorToThoughts = (isWhite: boolean, error: string) => {
    const thoughts = isWhite ? whiteCurrentThought : blackCurrentThought;
    const setter = isWhite ? setWhiteCurrentThought : setBlackCurrentThought;
    setter(thoughts + `\n\n[Error: ${error}]`);
  };

  return {
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
  };
};
