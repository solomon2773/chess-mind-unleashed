
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LLMProvider } from "@/lib/langchainChessAgent";

export type PlayerType = 'human' | 'ai';

export interface PlayerConfig {
  type: PlayerType;
  llmProvider?: LLMProvider;
  apiKey?: string;
  name: string;
}

interface PlayerConfigProps {
  player: 'white' | 'black';
  config: PlayerConfig;
  onConfigChange: (config: PlayerConfig) => void;
  availableApiKeys: Record<string, string>;
}

export const PlayerConfig = ({ player, config, onConfigChange, availableApiKeys }: PlayerConfigProps) => {
  const llmOptions: { value: LLMProvider; label: string; requiresKey: string }[] = [
    { value: 'openai-gpt4', label: 'GPT-4 Turbo', requiresKey: 'openai' },
    { value: 'openai-gpt35', label: 'GPT-3.5 Turbo', requiresKey: 'openai' },
    { value: 'claude-sonnet', label: 'Claude 3.5 Sonnet', requiresKey: 'anthropic' },
    { value: 'claude-haiku', label: 'Claude 3 Haiku', requiresKey: 'anthropic' },
  ];

  const playerColor = player === 'white' ? 'White' : 'Black';

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">{playerColor} Player</h3>
      
      {/* Player Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Player Type
        </label>
        <Select 
          value={config.type} 
          onValueChange={(value: PlayerType) => 
            onConfigChange({ ...config, type: value, name: value === 'human' ? 'Human' : 'AI Agent' })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="human">Human Player</SelectItem>
            <SelectItem value="ai">AI Agent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* AI Configuration */}
      {config.type === 'ai' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <Select 
              value={config.llmProvider} 
              onValueChange={(value: LLMProvider) => 
                onConfigChange({ ...config, llmProvider: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                {llmOptions.map((option) => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    disabled={!availableApiKeys[option.requiresKey]}
                  >
                    {option.label}
                    {!availableApiKeys[option.requiresKey] && ' (API key required)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {config.llmProvider && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              Selected: {llmOptions.find(opt => opt.value === config.llmProvider)?.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
