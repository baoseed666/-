import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIProvider, ChallengeInput, ReportInput, ReportOutput } from './ai-provider.interface';
import { DeepSeekProvider } from './deepseek.provider';
import { ClaudeProvider } from './claude.provider';

@Injectable()
export class AIProviderFactory implements AIProvider {
  private readonly deepseek: DeepSeekProvider;
  private readonly claude: ClaudeProvider;

  constructor(config: ConfigService) {
    this.deepseek = new DeepSeekProvider(config.get('deepseek.apiKey')!, config.get('deepseek.baseUrl')!);
    this.claude = new ClaudeProvider(config.get('anthropic.apiKey')!);
  }

  async *streamChallenge(input: ChallengeInput): AsyncIterable<string> {
    try {
      yield* this.deepseek.streamChallenge(input);
    } catch {
      yield* this.claude.streamChallenge(input);
    }
  }

  async generateReport(input: ReportInput): Promise<ReportOutput> {
    try {
      return await this.deepseek.generateReport(input);
    } catch {
      return await this.claude.generateReport(input);
    }
  }
}
