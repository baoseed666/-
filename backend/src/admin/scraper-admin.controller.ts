import { Controller, Post, Get, Body } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScrapeJob } from '../../scraper/scraper.processor';

const CITIES = ['上海', '北京', '广州', '深圳', '成都', '杭州', '武汉', '西安'];
const CATEGORIES = ['餐饮', '娱乐', '购物'];

@Controller('admin/scraper')
export class ScraperAdminController {
  constructor(@InjectQueue('scraper') private readonly queue: Queue) {}

  @Post('start')
  async start(
    @Body('city') city?: string,
    @Body('category') category?: string,
  ) {
    const cities = city ? [city] : CITIES;
    const cats = category ? [category] : CATEGORIES;
    const jobs: ScrapeJob[] = cities.flatMap((c) =>
      cats.map((cat) => ({ city: c, category: cat, page: 1 })),
    );
    await this.queue.addBulk(
      jobs.map((data) => ({
        name: 'scrape',
        data,
        opts: { attempts: 3, backoff: 5000 },
      })),
    );
    return { enqueued: jobs.length, cities, categories: cats };
  }

  @Get('status')
  async status() {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }
}
