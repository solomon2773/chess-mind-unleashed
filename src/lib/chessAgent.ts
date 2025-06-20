
export class ChessAgent {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getMove(fen: string, onThought?: (thought: string) => void): Promise<string | null> {
    if (!this.apiKey) {
      console.error("No API key provided");
      return null;
    }

    try {
      const prompt = this.buildPrompt(fen);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are a chess grandmaster. Analyze positions deeply and explain your thinking process clearly. Always end with FINAL DECISION: followed by your move in standard algebraic notation (like e4, Nf3, O-O, etc.).'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      let fullResponse = '';
      const reader = response.body?.getReader();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  fullResponse += content;
                  onThought?.(content);
                }
              } catch (e) {
                // Skip malformed JSON
              }
            }
          }
        }
      }

      // Extract move from the response - look for FINAL DECISION pattern
      const finalDecisionMatch = fullResponse.match(/FINAL DECISION:\s*([a-zA-Z0-9\-+=#]+)/i);
      if (finalDecisionMatch) {
        return finalDecisionMatch[1].trim();
      }

      // Fallback: look for common move patterns
      const movePatterns = [
        /\b([a-h][1-8][a-h][1-8][qrnb]?)\b/i, // Long algebraic notation
        /\b([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8][+#]?)\b/i, // Standard algebraic notation
        /\b(O-O-O|O-O)\b/i // Castling
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
}
