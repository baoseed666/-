import { NestFactory } from '@nestjs/core';
import { ScraperModule } from './scraper.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ScraperModule);
  console.log('Scraper worker started');
}

bootstrap();
