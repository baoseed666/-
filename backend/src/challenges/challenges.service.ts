import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Challenge, ChallengeStatus } from './challenge.entity';
import { ChallengeTask, TaskStatus } from './challenge-task.entity';
import { User } from '../users/user.entity';
import { ShopsService } from '../shops/shops.service';
import { AIProviderFactory } from './ai/ai-provider.factory';
import { ChallengeOutput } from './ai/ai-provider.interface';

@Injectable()
export class ChallengesService {
  constructor(
    @InjectRepository(Challenge) private readonly challenges: Repository<Challenge>,
    @InjectRepository(ChallengeTask) private readonly tasks: Repository<ChallengeTask>,
    private readonly shops: ShopsService,
    private readonly ai: AIProviderFactory,
  ) {}

  async create(user: User, rawText: string, city: string): Promise<Challenge> {
    const { budget, peopleCount } = this.parseBasics(rawText);
    const challenge = this.challenges.create({ user, inputText: rawText, budget, peopleCount, city });
    return this.challenges.save(challenge);
  }

  async *streamTasks(challengeId: string, lat?: number, lng?: number): AsyncIterable<string> {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();

    const category = this.inferCategory(challenge.inputText);
    const shopContext = await this.shops.getContextShops(challenge.city, category, lat, lng);
    const timeOfDay = this.getTimeOfDay();

    let buffer = '';
    yield `event: plan_start\ndata: {}\n\n`;

    for await (const chunk of this.ai.streamChallenge({
      rawText: challenge.inputText,
      budget: challenge.budget,
      peopleCount: challenge.peopleCount,
      city: challenge.city,
      shopContext,
      timeOfDay,
    })) {
      buffer += chunk;
      yield `event: task_chunk\ndata: ${JSON.stringify({ chunk })}\n\n`;
    }

    const output: ChallengeOutput = JSON.parse(buffer);
    await this.persistTasks(challenge, output);
    yield `event: complete\ndata: ${JSON.stringify({ challengeId })}\n\n`;
  }

  async findWithTasks(id: string, userId: string) {
    const c = await this.challenges.findOne({
      where: { id, user: { id: userId } },
      relations: ['tasks', 'tasks.shop'],
    });
    if (!c) throw new NotFoundException();
    return c;
  }

  async updateTaskStatus(challengeId: string, taskId: string, userId: string, status: TaskStatus) {
    const task = await this.tasks.findOne({
      where: { id: taskId, challenge: { id: challengeId, user: { id: userId } } },
      relations: ['challenge', 'challenge.user'],
    });
    if (!task) throw new NotFoundException();
    task.status = status;
    return this.tasks.save(task);
  }

  async complete(challengeId: string, userId: string, savedAmount: number) {
    const challenge = await this.challenges.findOne({
      where: { id: challengeId, user: { id: userId } },
      relations: ['user'],
    });
    if (!challenge) throw new NotFoundException();
    challenge.status = ChallengeStatus.COMPLETED;
    challenge.savedAmount = savedAmount;
    return this.challenges.save(challenge);
  }

  private parseBasics(text: string): { budget: number; peopleCount: number } {
    const budgetMatch = text.match(/(\d+)\s*元/);
    const peopleMatch = text.match(/(\d+)\s*[人个]/);
    return {
      budget: budgetMatch ? parseFloat(budgetMatch[1]) : 100,
      peopleCount: peopleMatch ? parseInt(peopleMatch[1], 10) : 1,
    };
  }

  private inferCategory(text: string): string {
    if (/烧烤|火锅|餐|饭|吃/.test(text)) return '餐饮';
    if (/娱乐|玩|电影|KTV/.test(text)) return '娱乐';
    return '餐饮';
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    if (h < 22) return 'evening';
    return 'night';
  }

  private async persistTasks(challenge: Challenge, output: ChallengeOutput) {
    const firstPlan = output.plans[0];
    if (!firstPlan) return;
    const entities = firstPlan.tasks.map((t, i) =>
      this.tasks.create({
        challenge,
        type: t.type as any,
        description: t.description,
        tips: t.tips,
        sortOrder: i,
      }),
    );
    await this.tasks.save(entities);
  }
}
