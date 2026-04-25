const COMMERCIAL_AREAS = [
  { name: '西岸梦中心', type: '综合商业', features: ['购物', '餐饮', '娱乐'], budgetMin: 50, emoji: '🌟', desc: '上海西岸地标，艺术与商业融合' },
  { name: '西岸中環', type: '精品商业', features: ['餐饮', '咖啡', '休闲'], budgetMin: 80, emoji: '🏙️', desc: '滨江精品商业，高颜值打卡地' },
  { name: '西岸凤巢', type: '文创园区', features: ['艺术', '咖啡', '拍照'], budgetMin: 0, emoji: '🎨', desc: '文创艺术聚落，小众宝藏地' },
  { name: '美高梅', type: '高端酒店商业', features: ['餐饮', '休闲', '娱乐'], budgetMin: 100, emoji: '✨', desc: '奢华体验，值得偶尔犒劳自己' },
  { name: '传媒港花园里', type: '休闲商业', features: ['餐饮', '购物', '逛街'], budgetMin: 30, emoji: '🌿', desc: '传媒港旁，烟火气满满的商业街' },
  { name: '星扬西岸中心', type: '综合商业', features: ['购物', '美食', '休闲'], budgetMin: 50, emoji: '⭐', desc: '西岸新地标，吃喝玩乐一站搞定' },
  { name: '星瀚广场', type: '社区商业', features: ['餐饮', '购物', '运动'], budgetMin: 20, emoji: '🏬', desc: '社区级商业，性价比之王' },
];

const BUDGET_OPTIONS = [
  { key: 'free', label: '¥0', sub: '免费', max: 0 },
  { key: 'lt50', label: '<¥50', sub: '轻松出行', max: 50 },
  { key: 'lt100', label: '<¥100', sub: '随意逛逛', max: 100 },
  { key: 'any', label: '随意', sub: '不设限', max: null },
];

const CATEGORIES = ['逛街', '吃饭', '购物', '美食', '拍照', '运动', '休闲'];

const FEATURE_MAP = {
  '逛街': ['逛街'],
  '吃饭': ['餐饮', '美食'],
  '购物': ['购物'],
  '美食': ['美食', '餐饮'],
  '拍照': ['拍照', '艺术'],
  '运动': ['运动'],
  '休闲': ['休闲', '咖啡'],
};

Page({
  data: {
    activeTab: 'mood',
    budgetOptions: BUDGET_OPTIONS,
    categories: CATEGORIES,
    selectedBudget: 'any',
    selectedCats: {},
    filteredAreas: COMMERCIAL_AREAS,
  },

  setTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab }, () => this._refilter());
  },

  setBudget(e) {
    this.setData({ selectedBudget: e.currentTarget.dataset.key }, () => this._refilter());
  },

  toggleCat(e) {
    const cat = e.currentTarget.dataset.cat;
    const cats = Object.assign({}, this.data.selectedCats);
    cats[cat] ? delete cats[cat] : (cats[cat] = true);
    this.setData({ selectedCats: cats }, () => this._refilter());
  },

  _refilter() {
    const { selectedBudget, selectedCats, activeTab } = this.data;
    const budgetOpt = BUDGET_OPTIONS.find(b => b.key === selectedBudget);
    const maxBudget = budgetOpt.max;
    const activeCats = Object.keys(selectedCats);

    let result = COMMERCIAL_AREAS.filter(area => {
      const budgetOk = maxBudget === null
        ? true
        : maxBudget === 0
          ? area.budgetMin === 0
          : area.budgetMin <= maxBudget;

      if (activeCats.length === 0) return budgetOk;

      const needed = activeCats.flatMap(cat => FEATURE_MAP[cat] || [cat]);
      return budgetOk && area.features.some(f => needed.includes(f));
    });

    if (activeTab === 'budget') {
      result = result.slice().sort((a, b) => a.budgetMin - b.budgetMin);
    }

    this.setData({ filteredAreas: result });
  },

  planRoute() {
    wx.showToast({
      title: '即将上线，敬请期待',
      icon: 'none',
      duration: 2000,
    });
  },
});
