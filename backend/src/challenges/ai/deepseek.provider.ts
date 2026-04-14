import OpenAI from 'openai';
import { AIProvider, ChallengeInput, ReportInput, ReportOutput } from './ai-provider.interface';
import { buildChallengePrompt, buildReportPrompt, SYSTEM_PROMPT } from './prompts';

export class DeepSeekProvider implements AIProvider {
  private readonly client: OpenAI;

  constructor(apiKey: string, baseUrl: string) {
    this.client = new OpenAI({ apiKey, baseURL: baseUrl });
  }

  async *streamChallenge(input: ChallengeInput): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      stream: true,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildChallengePrompt(input) },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async generateReport(input: ReportInput): Promise<ReportOutput> {
    const res = await this.client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildReportPrompt(input) },
      ],
      temperature: 0.8,
    });
    return JSON.parse(res.choices[0].message.content ?? '{}') as ReportOutput;
  }
}
