const api = require('../../utils/api');
const auth = require('../../utils/auth');

const MOCK_RESULT = {
  emotion_label: '🌸 治愈探索者',
  sqti_tag: 'SEHC',
  sqti_description: '独处疗愈型，偏好安静环境中的感官体验',
  emotion_description: '今天的你渴望宁静与治愈，适合在小而美的空间里放慢脚步，用一杯好茶或一段慢走来充电。',
  routes: [
    {
      title: '咖啡小径漫游',
      mood: '☕ 慵懒治愈',
      total_cost: 80,
      stops: [
        { time: '下午2点', place: '独立咖啡馆', activity: '点一杯手冲静静发呆', shop_category: '咖啡奶茶', estimated_cost: 35, recommended_shops: [] },
        { time: '下午4点', place: '书店', activity: '翻翻新书不买也无妨', estimated_cost: 0, recommended_shops: [] },
        { time: '傍晚5点', place: '甜品小铺', activity: '打卡一份下午茶', shop_category: '甜品蛋糕', estimated_cost: 45, recommended_shops: [] },
      ]
    }
  ]
};

Page({
  data: {
    mode: 'quick',
    questions: [],
    answers: [],
    currentStep: 0,
    analyzing: false,
    modeSelected: false,
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
  },

  selectMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ mode, modeSelected: true, answers: [], currentStep: 0 });
    this.loadQuestions(mode);
  },

  loadQuestions(mode) {
    api.get(`/emotion/questions?mode=${mode}`).then(questions => {
      this.setData({ questions });
    }).catch(() => {
      const fallback = mode === 'deep' ? DEEP_FALLBACK : QUICK_FALLBACK;
      this.setData({ questions: fallback });
    });
  },

  selectOption(e) {
    const index = e.currentTarget.dataset.index;
    const answers = [...this.data.answers];
    answers[this.data.currentStep] = index;
    this.setData({ answers });
  },

  prevStep() {
    this.setData({ currentStep: this.data.currentStep - 1 });
  },

  nextOrSubmit() {
    const { currentStep, questions, answers } = this.data;
    if (answers[currentStep] === undefined) return;
    if (currentStep < questions.length - 1) {
      this.setData({ currentStep: currentStep + 1 });
    } else {
      this.submitQuiz();
    }
  },

  submitQuiz() {
    this.setData({ analyzing: true });
    const { answers, questions, mode } = this.data;
    const payload = answers.map((answerIdx, i) => ({
      questionId: questions[i].id,
      answer: questions[i].options[answerIdx],
    }));
    api.post('/emotion/quiz/sync', { answers: payload, mode }).then(result => {
      this.setData({ analyzing: false });
      this.goToResult(result);
    }).catch(() => {
      this.setData({ analyzing: false });
      this.goToResult(MOCK_RESULT);
    });
  },

  goToResult(data) {
    wx.navigateTo({
      url: `/pages/emotion-result/index?data=${encodeURIComponent(JSON.stringify(data))}`
    });
  },

  backToMode() {
    this.setData({ modeSelected: false, questions: [], answers: [], currentStep: 0 });
  },
});

const QUICK_FALLBACK = [
  { id: 1, question: '此刻你的心情更像？', options: ['🌸 治愈系', '⚡ 能量系', '😴 慵懒系', '🌙 神秘系'] },
  { id: 2, question: '理想的社交规模？', options: ['👤 独处', '👫 2-3人小聚', '👥 5-8人派对', '🎉 大型活动'] },
  { id: 3, question: '今天最想做什么？', options: ['🍵 慢下来体验', '📸 探索打卡', '🛒 购物消费', '🎮 娱乐游玩'] },
  { id: 4, question: '预算范围？', options: ['💚 50元以内', '💛 50-150元', '🧡 150-300元', '❤️ 不限制'] },
  { id: 5, question: '时间充裕度？', options: ['⏰ 1-2小时', '🕐 半天', '🌅 全天', '🌙 晚上'] },
];

const DEEP_FALLBACK = [
  { id: 1, question: '你今天的心情更像哪种天气？', options: ['☀️ 晴朗明媚', '🌤 云淡风轻', '🌧 细雨绵绵', '⛈ 雷阵雨'] },
  { id: 2, question: '你现在最想用什么方式"消耗"时间？', options: ['🚶 漫无目的地走走', '📖 沉浸在某个故事里', '🎵 用音乐填满空间', '🍳 动手做点什么'] },
  { id: 3, question: '理想的社交规模是？', options: ['👤 一人独处', '👫 2-3亲密好友', '👥 4-8小团体', '🎉 大型社交'] },
  { id: 4, question: '你消费的主要驱动力是什么？', options: ['🔧 功能需求', '💆 情绪疗愈', '🥂 社交仪式', '🎁 自我奖励'] },
  { id: 5, question: '你理想的消费环境是？', options: ['🤫 安静私密', '🏮 热闹有烟火气', '🌿 自然户外', '✨ 精致有腔调'] },
  { id: 6, question: '现在几点你最想出门？', options: ['🌅 上午（10点前）', '☀️ 下午（12-17点）', '🌆 傍晚（17-20点）', '🌙 夜晚（20点后）'] },
  { id: 7, question: '你的可支配预算感觉？', options: ['💚 省着花', '💛 随意花', '🧡 今天特别', '❤️ 不考虑'] },
  { id: 8, question: '什么让你最快获得满足感？', options: ['🍜 美食', '🎡 体验', '🛍 购物', '🛌 休息'] },
  { id: 9, question: '你倾向于？', options: ['📋 规划好的行程', '🎲 随走随看'] },
  { id: 10, question: '最近让你有共鸣的是？', options: ['🎵 一首歌', '🎬 一部电影', '📚 一本书', '💬 一段对话'] },
  { id: 11, question: '你的身体现在需要？', options: ['🏃 运动放松', '🧘 静止休息', '🎆 感官刺激', '🫖 温暖舒适'] },
  { id: 12, question: '你想要这次出行留下什么？', options: ['📸 美好记忆', '🎁 实用收获', '💨 情绪释放', '🤝 新的认识'] },
];
