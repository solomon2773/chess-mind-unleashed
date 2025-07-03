
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export type LLMProvider = 'openai-gpt4' | 'openai-gpt35' | 'claude-sonnet' | 'claude-haiku';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  temperature?: number;
}

export class LangChainChessAgent {
  private model: BaseLanguageModelInterface;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.model = this.createModel(config);
  }

  private createModel(config: LLMConfig): BaseLanguageModelInterface {
    const { provider, apiKey, temperature = 0.7 } = config;

    switch (provider) {
      case 'openai-gpt4':
        return new ChatOpenAI({
          modelName: 'gpt-4-turbo-preview',
          temperature,
          openAIApiKey: apiKey,
          streaming: true,
        });
      
      case 'openai-gpt35':
        return new ChatOpenAI({
          modelName: 'gpt-3.5-turbo',
          temperature,
          openAIApiKey: apiKey,
          streaming: true,
        });
      
      case 'claude-sonnet':
        return new ChatAnthropic({
          modelName: 'claude-3-5-sonnet-20241022',
          temperature,
          anthropicApiKey: apiKey,
          streaming: true,
        });
      
      case 'claude-haiku':
        return new ChatAnthropic({
          modelName: 'claude-3-haiku-20240307',
          temperature,
          anthropicApiKey: apiKey,
          streaming: true,
        });
      
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  async getMove(fen: string, onThought?: (thought: string) => void): Promise<string | null> {
    try {
      const prompt = this.buildPrompt(fen);
      
      const messages = [
        new SystemMessage('You are a chess grandmaster. Analyze positions deeply and explain your thinking process clearly. Always end with FINAL DECISION: followed by your move in standard algebraic notation (like e4, Nf3, O-O, etc.).'),
        new HumanMessage(prompt)
      ];

      let fullResponse = '';
      
      const stream = await this.model.stream(messages);
      
      for await (const chunk of stream) {
        const content = chunk.content as string;
        if (content) {
          fullResponse += content;
          onThought?.(content);
        }
      }

      // Extract move from the response
      const finalDecisionMatch = fullResponse.match(/FINAL DECISION:\s*([a-zA-Z0-9\-+=#]+)/i);
      if (finalDecisionMatch) {
        return finalDecisionMatch[1].trim();
      }

      // Fallback: look for common move patterns
      const movePatterns = [
        /\b([a-h][1-8][a-h][1-8][qrnb]?)\b/i,
        /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8][+#]?)\b/i,
        /\b(O-O-O|O-O)\b/i
      ];

      for (const pattern of movePatterns) {
        const match = fullResponse.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }

      return null;

    } catch (error) {
      console.error('Error getting AI move:', error);
      onThought?.('Error occurred while thinking. Using fallback move...\n');
      return null;
    }
  }

  private buildPrompt(fen: string): string {
    return `
Analyze this chess position (FEN: ${fen}) and provide your thinking process.

Please structure your analysis as follows:

1. POSITION ASSESSMENT:
   - Material balance
   - King safety
   - Pawn structure
   - Piece activity

2. CANDIDATE MOVES:
   - List 3-5 candidate moves
   - Brief reasoning for each

3. CALCULATION:
   - Analyze the most promising variations
   - Look 3-4 moves ahead

4. STRATEGIC CONSIDERATIONS:
   - Long-term plans
   - Weaknesses to exploit

5. FINAL DECISION: [your move in standard algebraic notation]

Examples: 
- FINAL DECISION: e4
- FINAL DECISION: Nf3
- FINAL DECISION: O-O
- FINAL DECISION: Qxf7+

Think like a grandmaster and show your complete thought process!
    `;
  }

  getModelInfo(): string {
    const modelNames = {
      'openai-gpt4': 'GPT-4 Turbo',
      'openai-gpt35': 'GPT-3.5 Turbo',
      'claude-sonnet': 'Claude 3.5 Sonnet',
      'claude-haiku': 'Claude 3 Haiku'
    };
    return modelNames[this.config.provider] || this.config.provider;
  }
}
