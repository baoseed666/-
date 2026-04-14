import { Logger } from '@nestjs/common';
import { RateLimiter } from './rate-limiter';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const puppeteerExtra = require('puppeteer-extra');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteerExtra.use(StealthPlugin());

export interface RawShop {
  name: string;
  category: string;
  city: string;
  district: string;
  avgPrice: number | null;
  rating: number | null;
  lat: number;
  lng: number;
  discounts: Record<string, unknown>;
  openHours: Record<string, unknown>;
  externalId: string;
}

export class DianpingScraper {
  private readonly logger = new Logger(DianpingScraper.name);
  private readonly limiter = new RateLimiter(600);

  async scrapeCategory(city: string, category: string, page = 1): Promise<RawShop[]> {
    const browser = await puppeteerExtra.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const tab = await browser.newPage();
      await tab.setUserAgent(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      );
      await tab.setViewport({ width: 390, height: 844 });

      await this.limiter.throttle();
      const url = this.buildUrl(city, category, page);
      this.logger.log(`Fetching: ${url}`);

      await tab.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      await tab.waitForSelector('.shop-list-item, .J_shop_item', { timeout: 15000 }).catch(() => {});

      const shops = await tab.evaluate((cityArg: string, catArg: string) => {
        const items = document.querySelectorAll('.shop-list-item, .J_shop_item, [data-testid="shop-item"]');
        return Array.from(items).map((el) => {
          const name = el.querySelector('.shop-name, .title')?.textContent?.trim() ?? '';
          const rating = parseFloat(el.querySelector('.star-score, .rating')?.textContent ?? '0') || null;
          const avgPrice = parseFloat(el.querySelector('.per-price, .avg-price')?.textContent?.replace(/[^0-9.]/g, '') ?? '0') || null;
          const district = el.querySelector('.address, .district')?.textContent?.trim() ?? '';
          const externalId = el.getAttribute('data-id') ?? el.querySelector('a')?.href?.match(/\/(\d+)$/)?.[1] ?? '';
          return { name, category: catArg, city: cityArg, district, avgPrice, rating,
                   lat: 0, lng: 0, discounts: {}, openHours: {}, externalId };
        }).filter((s: any) => s.name && s.externalId);
      }, city, category);

      return shops as RawShop[];
    } finally {
      await browser.close();
    }
  }

  private buildUrl(city: string, category: string, page: number): string {
    const cityMap: Record<string, string> = {
      '上海': 'shanghai', '北京': 'beijing', '广州': 'guangzhou',
      '深圳': 'shenzhen', '成都': 'chengdu', '杭州': 'hangzhou',
      '武汉': 'wuhan', '西安': 'xian',
    };
    const catMap: Record<string, string> = { '餐饮': 'food', '娱乐': 'entertainment', '购物': 'shopping' };
    const citySlug = cityMap[city] ?? city.toLowerCase();
    const catSlug = catMap[category] ?? category;
    return `https://www.dianping.com/${citySlug}/${catSlug}/p${page}`;
  }
}
