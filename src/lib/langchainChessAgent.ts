import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export type LLMProvider = 'openai-gpt4' | 'openai-gpt35' | 'claude-sonnet' | 'claude-haiku' | 'gemini-pro' | 'gemini-flash' | 'azure-gpt4' | 'azure-gpt35';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  temperature?: number;
  azureEndpoint?: string;
  azureDeploymentName?: string;
}

export class LangChainChessAgent {
  private model: BaseLanguageModelInterface;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.model = this.createModel(config);
  }

  private createModel(config: LLMConfig): BaseLanguageModelInterface {
    const { provider, apiKey, temperature = 0.7, azureEndpoint, azureDeploymentName } = config;

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

      case 'gemini-pro':
        return new ChatGoogleGenerativeAI({
          model: 'gemini-pro',
          temperature,
          apiKey,
          streaming: true,
        });

      case 'gemini-flash':
        return new ChatGoogleGenerativeAI({
          model: 'gemini-1.5-flash',
          temperature,
          apiKey,
          streaming: true,
        });

      case 'azure-gpt4':
        if (!azureEndpoint || !azureDeploymentName) {
          throw new Error('Azure endpoint and deployment name are required for Azure OpenAI');
        }
        return new ChatOpenAI({
          modelName: azureDeploymentName,
          temperature,
          openAIApiKey: apiKey,
          streaming: true,
          configuration: {
            baseURL: `${azureEndpoint}/openai/deployments/${azureDeploymentName}`,
            defaultQuery: { 'api-version': '2024-02-01' },
            defaultHeaders: {
              'api-key': apiKey,
            },
          },
        });

      case 'azure-gpt35':
        if (!azureEndpoint || !azureDeploymentName) {
          throw new Error('Azure endpoint and deployment name are required for Azure OpenAI');
        }
        return new ChatOpenAI({
          modelName: azureDeploymentName,
          temperature,
          openAIApiKey: apiKey,
          streaming: true,
          configuration: {
            baseURL: `${azureEndpoint}/openai/deployments/${azureDeploymentName}`,
            defaultQuery: { 'api-version': '2024-02-01' },
            defaultHeaders: {
              'api-key': apiKey,
            },
          },
        });
      
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }

  async getMove(fen: string, onThought?: (thought: string) => void): Promise<string | null> {
    try {
      // Create a temporary chess instance to get legal moves
      const tempChess = new (await import('chess.js')).Chess(fen);
      const legalMoves = tempChess.moves();
      
      // Check if game is over
      if (legalMoves.length === 0) {
        console.log('No legal moves available - game is over');
        onThought?.('Game is over - no legal moves available.\n');
        return null;
      }
      
      const prompt = this.buildPrompt(fen, legalMoves);
      
      const messages = [
        new SystemMessage('You are a chess grandmaster. Analyze positions deeply and explain your thinking process clearly. Always end with FINAL DECISION: followed by your move in standard algebraic notation. CRITICAL: You will be provided with a list of legal moves. You MUST choose your move from that list only. Do not suggest any move that is not in the provided legal moves list.'),
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
      const finalDecisionMatch = fullResponse.match(/FINAL DECISION:\s*([a-zA-Z0-9\-+=#\s\[\]]+)/i);
      if (finalDecisionMatch) {
        const moveText = finalDecisionMatch[1].trim();
        
        // Check if AI is reporting stalemate or no legal moves
        if (moveText.toLowerCase().includes('stalemate') || 
            moveText.toLowerCase().includes('no legal move') ||
            moveText.toLowerCase().includes('draw')) {
          console.log('AI reports stalemate or no legal moves');
          return null;
        }
        
        // Extract actual move from the text
        const moveMatch = moveText.match(/([a-zA-Z0-9\-+=#]+)/);
        if (moveMatch) {
          const move = moveMatch[1].trim();
          // Validate the move format
          if (this.isValidMoveFormat(move)) {
            return move;
          }
        }
      }

      // Fallback: look for common move patterns in the last few lines
      const lines = fullResponse.split('\n').slice(-10); // Check last 10 lines
      const movePatterns = [
        /\b([a-h][1-8][a-h][1-8][qrnb]?)\b/i,
        /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8][+#]?)\b/i,
        /\b(O-O-O|O-O)\b/i
      ];

      for (const line of lines) {
        for (const pattern of movePatterns) {
          const match = line.match(pattern);
          if (match) {
            const move = match[1].trim();
            if (this.isValidMoveFormat(move)) {
              return move;
            }
          }
        }
      }

      return null;

    } catch (error) {
      console.error('Error getting AI move:', error);
      onThought?.('Error occurred while thinking. Using fallback move...\n');
      return null;
    }
  }

  private buildPrompt(fen: string, legalMoves: string[]): string {
    return `
IMPORTANT: You are analyzing the EXACT current position given by this FEN: ${fen}

This is NOT the starting position. This is the current state of the game after many moves have been played.

LEGAL MOVES AVAILABLE: ${legalMoves.join(', ')}

You MUST choose your move from this list of legal moves only!

IMPORTANT: If there are no legal moves available (empty list), the game is over. In this case, respond with "FINAL DECISION: [Game Over]" and explain why the game ended (checkmate, stalemate, draw, etc.).

Please structure your analysis as follows:

1. POSITION ASSESSMENT:
   - Material balance
   - King safety
   - Pawn structure
   - Piece activity

2. CANDIDATE MOVES:
   - List 3-5 candidate moves that are ACTUALLY LEGAL in this position
   - Brief reasoning for each
   - DO NOT suggest moves that were legal in the opening but are not legal now

3. CALCULATION:
   - Analyze the most promising variations
   - Look 3-4 moves ahead

4. STRATEGIC CONSIDERATIONS:
   - Long-term plans
   - Weaknesses to exploit

5. FINAL DECISION: [your move in standard algebraic notation]

CRITICAL: You MUST only suggest moves that are actually legal in the current position!
- Check the FEN position carefully
- Do not suggest moves like "e4" or "Nf3" if they are not legal
- Look at the actual piece positions and available moves
- If unsure, choose a simple, safe move that you can verify is legal

Examples of legal moves (but verify they exist in this position):
- Pawn moves: e4, d5, e5, etc.
- Piece moves: Nf3, Bc4, Qd2, etc.
- Captures: Nxe4, Qxf7+, etc.
- Castling: O-O (kingside), O-O-O (queenside) - ONLY if legal

Think like a grandmaster and show your complete thought process!
    `;
  }

  private isValidMoveFormat(move: string): boolean {
    // Basic validation for chess move format
    const validPatterns = [
      /^[a-h][1-8][a-h][1-8][qrnb]?$/, // Long algebraic notation (e2e4, e7e8q)
      /^[KQRBN]?[a-h]?[1-8]?x?[a-h][1-8][+#]?$/, // Standard algebraic notation (e4, Nf3, Qxf7+)
      /^(O-O|O-O-O)$/, // Castling
      /^[a-h][1-8]$/, // Pawn moves (e4, d5)
    ];
    
    return validPatterns.some(pattern => pattern.test(move));
  }

  getModelInfo(): string {
    const modelNames = {
      'openai-gpt4': 'GPT-4 Turbo',
      'openai-gpt35': 'GPT-3.5 Turbo',
      'claude-sonnet': 'Claude 3.5 Sonnet',
      'claude-haiku': 'Claude 3 Haiku',
      'gemini-pro': 'Gemini Pro',
      'gemini-flash': 'Gemini 1.5 Flash',
      'azure-gpt4': 'Azure GPT-4',
      'azure-gpt35': 'Azure GPT-3.5'
    };
    return modelNames[this.config.provider] || this.config.provider;
  }
}
