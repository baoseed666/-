import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Shop } from '../shops/shop.entity';

export interface ScrapeJob {
  city: string;
  category: string;
  page: number;
}

/** 大众点评爬虫 Processor — Puppeteer + stealth */
@Processor('scraper')
export class ScraperProcessor extends WorkerHost {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    @InjectRepository(Shop) private readonly shopRepo: Repository<Shop>,
  ) {
    super();
  }

  async process(job: Job<ScrapeJob>): Promise<void> {
    const { city, category, page } = job.data;
    this.logger.log(`Scraping ${city}/${category} page=${page}`);
    try {
      const shops = await this.scrapeDianping(city, category, page);
      if (shops.length > 0) {
        await this.upsertShops(shops);
        this.logger.log(
          `Upserted ${shops.length} shops for ${city}/${category}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `Scrape failed for ${city}/${category}: ${(err as Error).message}`,
      );
      // 爬虫失败不抛出，避免队列无限重试
    }
  }

  private async scrapeDianping(
    city: string,
    category: string,
    page: number,
  ): Promise<Partial<Shop>[]> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const puppeteer = require('puppeteer-extra');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StealthPlugin = require('puppeteer-extra-plugin-stealth');
    puppeteer.use(StealthPlugin());

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    });

    try {
      const browserPage = await browser.newPage();
      await browserPage.setViewport({ width: 1280, height: 800 });
      await browserPage.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      );

      const cityMap: Record<string, string> = {
        上海: 'shanghai',
        北京: 'beijing',
        广州: 'guangzhou',
        深圳: 'shenzhen',
        成都: 'chengdu',
        杭州: 'hangzhou',
        武汉: 'wuhan',
        西安: 'xian',
      };
      const citySlug = cityMap[city] ?? 'shanghai';
      const categoryMap: Record<string, string> = {
        餐饮: '美食',
        娱乐: '休闲娱乐',
        购物: '购物',
      };
      const categoryName = categoryMap[category] ?? '美食';

      const url = `https://www.dianping.com/search/keyword/${citySlug}/0_${encodeURIComponent(categoryName)}/p${page}`;
      await browserPage.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      await browserPage.waitForTimeout(2000);

      const shops = await browserPage.evaluate(() => {
        const items = document.querySelectorAll('.shop-list li[id]');
        return Array.from(items)
          .map((el) => {
            const nameEl = el.querySelector('h4');
            const ratingEl = el.querySelector('.item-rank-stars');
            const priceEl = el.querySelector('.mean-price strong');
            const imgEl = el.querySelector('img.main-img');
            const addrEl = el.querySelector('address');
            const linkEl = el.querySelector('a.img-block');
            const discountEls = el.querySelectorAll('.tag-block span');
            return {
              name: nameEl?.textContent?.trim() ?? '',
              rating: ratingEl?.getAttribute('title') ?? null,
              avgPrice: priceEl?.textContent?.replace(/[^0-9]/g, '') ?? null,
              imageUrl: imgEl?.getAttribute('src') ?? null,
              address: addrEl?.textContent?.trim() ?? null,
              externalUrl: linkEl
                ? `https://www.dianping.com${linkEl.getAttribute('href')}`
                : null,
              discountTypes: Array.from(discountEls)
                .map((e) => e.textContent?.trim())
                .filter(Boolean),
            };
          })
          .filter((s) => s.name);
      });

      return shops.map((s) => ({
        name: s.name,
        city,
        category,
        avgPrice: s.avgPrice ? parseFloat(s.avgPrice) : null,
        rating: s.rating ? parseFloat(s.rating) : null,
        imageUrl: s.imageUrl,
        address: s.address,
        externalUrl: s.externalUrl,
        discountTypes: (s.discountTypes as string[]).slice(0, 3),
        discounts: {},
        openHours: {},
        externalId: s.externalUrl
          ? `dp_${s.externalUrl.split('/').pop()}`
          : null,
      }));
    } finally {
      await browser.close();
    }
  }

  private async upsertShops(shops: Partial<Shop>[]): Promise<void> {
    for (const s of shops) {
      if (!s.externalId || !s.name) continue;
      const existing = await this.shopRepo.findOneBy({
        externalId: s.externalId,
      });
      if (existing) {
        Object.assign(existing, s);
        await this.shopRepo.save(existing);
      } else {
        await this.shopRepo.save(this.shopRepo.create(s));
      }
    }
  }
}
