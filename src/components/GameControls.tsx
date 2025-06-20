
import { RotateCcw, Square, Undo } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GameControlsProps {
  onNewGame: () => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled: boolean;
}

export const GameControls = ({ onNewGame, onUndo, canUndo, disabled }: GameControlsProps) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-3">Game Controls</h3>
      <div className="flex flex-col gap-2">
        <Button
          onClick={onNewGame}
          disabled={disabled}
          className="w-full flex items-center gap-2"
          variant="default"
        >
          <Square className="w-4 h-4" />
          New Game
        </Button>
        
        <Button
          onClick={onUndo}
          disabled={disabled || !canUndo}
          className="w-full flex items-center gap-2"
          variant="outline"
        >
          <Undo className="w-4 h-4" />
          Undo Move
        </Button>
      </div>
    </div>
  );
};
