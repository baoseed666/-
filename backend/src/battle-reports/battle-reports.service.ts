import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BattleReport } from './battle-report.entity';
import { Challenge, ChallengeStatus } from '../challenges/challenge.entity';
import { ChallengeTask, TaskStatus } from '../challenges/challenge-task.entity';
import { AIProviderFactory } from '../challenges/ai/ai-provider.factory';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { PosterGenerator } from './poster.generator';

@Injectable()
export class BattleReportsService {
  private readonly poster = new PosterGenerator();

  constructor(
    @InjectRepository(BattleReport)
    private readonly reportRepo: Repository<BattleReport>,
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    private readonly ai: AIProviderFactory,
    private readonly leaderboard: LeaderboardService,
  ) {}

  async generate(challengeId: string, userId: string): Promise<BattleReport> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId, user: { id: userId } },
      relations: ['tasks'],
    });
    if (!challenge) throw new NotFoundException('Challenge not found');

    const cityAvgSave = await this.leaderboard.getCityAvgSave(challenge.city);
    const tasksCompleted = challenge.tasks.filter(
      (t: ChallengeTask) => t.status === TaskStatus.DONE,
    ).length;
    const savedAmount = parseFloat(String(challenge.savedAmount));
    const budget = parseFloat(String(challenge.budget));

    const reportOutput = await this.ai.generateReport({
      savedAmount,
      budget,
      peopleCount: challenge.peopleCount,
      city: challenge.city,
      tasksCompleted,
      cityAvgSave,
    });

    const report = this.reportRepo.create({
      challenge,
      headline: reportOutput.headline,
      rankTitle: reportOutput.rankTitle,
      percentile: reportOutput.percentile,
      imageUrl: null,
    });
    const saved = await this.reportRepo.save(report);

    const imageUrl = await this.poster.generate(
      saved.id,
      reportOutput,
      savedAmount,
      budget,
    );
    saved.imageUrl = imageUrl;
    return this.reportRepo.save(saved);
  }

  async findById(id: string): Promise<BattleReport> {
    const report = await this.reportRepo.findOne({
      where: { id },
      relations: ['challenge'],
    });
    if (!report) throw new NotFoundException('Battle report not found');
    return report;
  }
}
