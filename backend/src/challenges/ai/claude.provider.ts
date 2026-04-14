import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, ChallengeInput, ReportInput, ReportOutput } from './ai-provider.interface';
import { buildChallengePrompt, buildReportPrompt, SYSTEM_PROMPT } from './prompts';

export class ClaudeProvider implements AIProvider {
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *streamChallenge(input: ChallengeInput): AsyncIterable<string> {
    const stream = await this.client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildChallengePrompt(input) }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async generateReport(input: ReportInput): Promise<ReportOutput> {
    const res = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildReportPrompt(input) }],
    });
    const text = res.content[0].type === 'text' ? res.content[0].text : '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch?.[0] ?? '{}') as ReportOutput;
  }
}
