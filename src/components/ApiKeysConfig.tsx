
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface ApiKeysConfigProps {
  apiKeys: Record<string, string>;
  onApiKeysChange: (keys: Record<string, string>) => void;
}

export const ApiKeysConfig = ({ apiKeys, onApiKeysChange }: ApiKeysConfigProps) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleKeyChange = (provider: string, value: string) => {
    onApiKeysChange({ ...apiKeys, [provider]: value });
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const keyConfigs = [
    { key: 'openai', label: 'OpenAI API Key', placeholder: 'sk-...' },
    { key: 'anthropic', label: 'Anthropic API Key', placeholder: 'sk-ant-...' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">API Keys Configuration</h3>
      <p className="text-sm text-gray-600">
        Enter your API keys to enable different AI models. Keys are stored locally.
      </p>

      {keyConfigs.map(({ key, label, placeholder }) => (
        <div key={key}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
          <div className="relative">
            <input
              type={showKeys[key] ? "text" : "password"}
              placeholder={placeholder}
              value={apiKeys[key] || ''}
              onChange={(e) => handleKeyChange(key, e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => toggleShowKey(key)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showKeys[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
