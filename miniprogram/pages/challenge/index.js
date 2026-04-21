const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    phase: 'input',
    input: '',
    inputValid: false,
    challengeId: null,
    plans: [],
    selectedPlanIndex: 0,
    challenge: null,
    completing: false,
    loadingText: '正在制定省钱方案...',
    errorMsg: '',
  },

  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
    }
  },

  onUnload() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  },

  onInput(e) {
    const input = e.detail.value;
    this.setData({ input, inputValid: input.trim().length > 0 });
  },

  fillExample(e) {
    const input = e.currentTarget.dataset.text;
    this.setData({ input, inputValid: input.trim().length > 0 });
  },

  startChallenge() {
    const { input } = this.data;
    if (!input.trim()) return;
    this.setData({ phase: 'loading', errorMsg: '' });

    api.post('/challenges', { rawText: input })
      .then(res => {
        const id = res.id || res.challengeId;
        this.setData({ challengeId: id });
        return api.post(`/challenges/${id}/generate`, {});
      })
      .then(() => {
        this.pollForPlans(this.data.challengeId);
      })
      .catch(err => {
        this.setData({
          phase: 'input',
          errorMsg: '创建挑战失败，请重试：' + (err.message || ''),
        });
      });
  },

  pollForPlans(id) {
    let elapsed = 0;
    this._pollTimer = setInterval(() => {
      elapsed += 1500;
      if (elapsed > 120000) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
        this.setData({
          phase: 'input',
          errorMsg: 'AI 生成超时，请稍后重试',
        });
        return;
      }

      api.get(`/challenges/${id}`).then(res => {
        if (res.allPlans && res.allPlans.length > 0) {
          clearInterval(this._pollTimer);
          this._pollTimer = null;
          this.setData({ phase: 'plan_select', plans: res.allPlans });
        }
      }).catch(() => {});
    }, 1500);
  },

  confirmPlan(e) {
    const planIndex = e.currentTarget.dataset.index;
    const { challengeId } = this.data;
    this.setData({ selectedPlanIndex: planIndex });

    api.post(`/challenges/${challengeId}/confirm-plan`, { planIndex })
      .then(res => {
        if (res.tasks) {
          res.tasks = res.tasks.map(task => ({
            ...task,
            shopRecommendations: (task.shopRecommendations || []).map(shop => ({
              ...shop,
              discountList: shop.discounts ? Object.values(shop.discounts) : [],
            })),
          }));
        }
        this.setData({ phase: 'tasks', challenge: res });
      })
      .catch(err => {
        wx.showToast({ title: '选择方案失败，请重试', icon: 'none' });
      });
  },

  completeChallenge() {
    const { challengeId, challenge } = this.data;
    this.setData({ completing: true });

    const savedAmount = challenge.estimatedSave || 0;

    api.post(`/challenges/${challengeId}/complete`, { savedAmount })
      .then(res => {
        const reportId = res.reportId || res.id || challengeId;
        wx.navigateTo({ url: `/pages/report/index?reportId=${reportId}` });
      })
      .catch(() => {
        wx.showToast({ title: '结算失败，请重试', icon: 'none' });
      })
      .finally(() => {
        this.setData({ completing: false });
      });
  },

  openLink(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}` });
  },

  openShopDouyin(e) {
    const name = e.currentTarget.dataset.name;
    const url = `https://www.douyin.com/search/${encodeURIComponent(name + ' 上海龙华')}`;
    wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}` });
  },

  difficultyClass(difficulty) {
    if (difficulty === '地狱') return 'hell';
    if (difficulty === '普通') return 'normal';
    return 'easy';
  },
});
