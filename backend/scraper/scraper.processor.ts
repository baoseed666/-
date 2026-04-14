import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { Shop } from '../src/shops/shop.entity';
import { DianpingScraper } from './dianping.scraper';

export interface ScrapeJob { city: string; category: string; page?: number; }

@Processor('scraper', { concurrency: 2 })
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);
  private readonly scraper = new DianpingScraper();

  constructor(@InjectRepository(Shop) private readonly shops: Repository<Shop>) {
    super();
  }

  async process(job: Job<ScrapeJob>): Promise<void> {
    const { city, category, page = 1 } = job.data;
    this.logger.log(`Scraping ${city}/${category} page ${page}`);

    const raw = await this.scraper.scrapeCategory(city, category, page);
    if (raw.length === 0) {
      this.logger.warn(`No results for ${city}/${category} page ${page}`);
      return;
    }

    for (const r of raw) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (this.shops.upsert as any)(
        { ...r, scrapedAt: new Date() },
        { conflictPaths: ['externalId'], skipUpdateIfNoValuesChanged: true },
      );
    }
    this.logger.log(`Saved ${raw.length} shops for ${city}/${category} page ${page}`);
  }
}
