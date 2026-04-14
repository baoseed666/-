import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface ScrapeJob {
  city: string;
  category: string;
  page?: number;
}

@Processor('scraper')
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  async process(job: Job<ScrapeJob>): Promise<void> {
    this.logger.log(`Processing: ${job.data.city} / ${job.data.category} page ${job.data.page ?? 1}`);
    await this.scrapePage(job.data);
  }

  private async scrapePage(_data: ScrapeJob): Promise<void> {
    // 实现在 Plan B Task 5
    throw new Error('Not implemented — see Plan B');
  }
}
