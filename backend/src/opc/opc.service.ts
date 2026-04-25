import { Injectable, NotFoundException, BadRequestException, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { OpcTask } from './opc-task.entity';

const DEMO_TASKS = [
  { merchantName: '新天地·网红咖啡馆', taskType: '摄影', title: '拍摄店内特色咖啡拉花', description: '需要拍摄5张以上高质量咖啡拉花照片，光线充足，构图美观，用于我们的社媒推广。', pointsReward: 200 },
  { merchantName: '陆家嘴·景观餐厅', taskType: '摄影', title: '外滩夜景配餐拍摄', description: '傍晚时分拍摄餐厅与外滩夜景的联合镜头，要求专业设备或高端手机，提供RAW格式。', pointsReward: 300 },
  { merchantName: '南京路·时尚买手店', taskType: '摄影', title: '新品服装上身穿搭拍摄', description: '为本季新品拍摄穿搭大片，需要真人出镜，风格简约时尚，提供5套完整穿搭。', pointsReward: 250 },
  { merchantName: '徐家汇·老字号餐厅', taskType: '内容', title: '撰写品牌故事软文', description: '以第一人称视角撰写一篇800字以上的品牌故事，融入老上海情怀，适合小红书平台发布。', pointsReward: 150 },
  { merchantName: '豫园·文创集市', taskType: '内容', title: '制作非遗手工艺短视频脚本', description: '为我们的非遗剪纸工艺品写一个60秒短视频脚本，要求有情节有冲突，突出匠人精神。', pointsReward: 180 },
  { merchantName: '五角场·潮流集合店', taskType: '内容', title: '小红书种草笔记10篇', description: '为门店不同品类产品各写一篇种草笔记，要求真实体验感，自然植入，每篇300字+。', pointsReward: 120 },
  { merchantName: '静安寺·精品酒店', taskType: '导览', title: '酒店周边美食导览员', description: '接待入住外地客人，带领其探访酒店周边500米内特色本帮菜馆，时长约2小时，需熟悉本地美食。', pointsReward: 100 },
  { merchantName: '田子坊·艺术街区', taskType: '导览', title: '石库门建筑文化讲解', description: '为外国游客提供英文讲解，介绍石库门历史与艺术街区文化，时长1.5小时，需要英语流利。', pointsReward: 200 },
  { merchantName: '环球港·购物中心', taskType: '导览', title: '购物中心优惠攻略向导', description: '帮助外地顾客规划最优购物路线，介绍当日促销信息，提供个性化推荐，工作时长3小时。', pointsReward: 80 },
  { merchantName: '虹桥·商务区展馆', taskType: '导览', title: '企业展厅参观接待', description: '接待来访商务团队，完成公司展厅30分钟标准讲解，需提前熟悉我司产品手册，着装正式。', pointsReward: 150 },
];

@Injectable()
export class OpcService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(OpcTask) private readonly repo: Repository<OpcTask>,
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap() {
    const count = await this.repo.count();
    if (count === 0) {
      await this.repo.save(DEMO_TASKS.map((d) => this.repo.create(d)));
    }
  }

  getTasks(taskType?: string) {
    const where: Record<string, string> = { status: 'open' };
    if (taskType && ['摄影', '内容', '导览'].includes(taskType)) where.taskType = taskType;
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async acceptTask(taskId: string, userId: string) {
    const task = await this.repo.findOneBy({ id: taskId });
    if (!task) throw new NotFoundException('任务不存在');
    if (task.status !== 'open') throw new BadRequestException('任务已被接单');

    await this.dataSource.transaction(async (em) => {
      await em.update(OpcTask, taskId, { status: 'taken', takenByUserId: userId });
      await em.query('UPDATE users SET points = points + $1 WHERE id = $2', [task.pointsReward, userId]);
    });

    return { pointsRewarded: task.pointsReward };
  }
}
