import sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ReportOutput } from '../challenges/ai/ai-provider.interface';

export class PosterGenerator {
  private readonly outputDir = path.join(process.cwd(), 'uploads', 'reports');

  async generate(
    reportId: string,
    data: ReportOutput,
    savedAmount: number,
    budget: number,
  ): Promise<string> {
    await fs.mkdir(this.outputDir, { recursive: true });
    const svg = `<svg width="750" height="1000" xmlns="http://www.w3.org/2000/svg">
  <rect width="750" height="1000" fill="#0a0a0a"/>
  <rect x="20" y="20" width="710" height="960" fill="none" stroke="#ffdd00" stroke-width="2"/>
  <text x="375" y="100" text-anchor="middle" font-family="monospace" font-size="48" fill="#ffdd00" font-weight="bold">抠门大王</text>
  <text x="375" y="145" text-anchor="middle" font-family="monospace" font-size="20" fill="#888">MISER KING BATTLE REPORT</text>
  <line x1="60" y1="165" x2="690" y2="165" stroke="#ffdd00" stroke-width="1" stroke-dasharray="5,5"/>
  <text x="375" y="240" text-anchor="middle" font-family="monospace" font-size="36" fill="#00ff88">【${data.rankTitle}】</text>
  <text x="375" y="340" text-anchor="middle" font-family="monospace" font-size="72" fill="#ffdd00" font-weight="bold">¥${savedAmount}</text>
  <text x="375" y="385" text-anchor="middle" font-family="monospace" font-size="18" fill="#888">成功省下</text>
  <text x="150" y="460" text-anchor="middle" font-family="monospace" font-size="16" fill="#ff4444">HP: ${data.hpConsumed}/${budget}</text>
  <text x="375" y="460" text-anchor="middle" font-family="monospace" font-size="16" fill="#4444ff">MP: ${data.mpUsed} 技能</text>
  <text x="600" y="460" text-anchor="middle" font-family="monospace" font-size="16" fill="#00ff88">击败: ${data.percentile}%</text>
  <text x="375" y="540" text-anchor="middle" font-family="monospace" font-size="22" fill="#ffffff">${data.headline.slice(0, 24)}</text>
  <text x="375" y="950" text-anchor="middle" font-family="monospace" font-size="14" fill="#555">抠门大王 · 省钱是一种态度</text>
</svg>`;
    const filename = `${reportId}.png`;
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(this.outputDir, filename));
    return `/uploads/reports/${filename}`;
  }
}
