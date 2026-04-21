const api = require('../../utils/api');
const auth = require('../../utils/auth');

const DEFAULT_CHANNELS = [
  { id: 1, icon: '☕', name: '咖啡券', description: '合作咖啡馆抵扣', points: 100 },
  { id: 2, icon: '🍜', name: '餐饮立减', description: '联盟餐厅¥5抵扣', points: 200 },
  { id: 3, icon: '🎬', name: '电影票优惠', description: '优先场次9折', points: 300 },
  { id: 4, icon: '🛒', name: '超市购物券', description: '满50减5', points: 500 }
];

Page({
  data: {
    points: 0,
    pointsValue: '0.00',
    redeemChannels: DEFAULT_CHANNELS
  },
  onLoad() {
    if (!auth.isLoggedIn()) {
      wx.navigateTo({ url: '/pages/login/index' });
      return;
    }
    this.loadPoints();
  },
  onShow() {
    if (auth.isLoggedIn()) this.loadPoints();
  },
  loadPoints() {
    api.get('/users/me/points').then(res => {
      const points = res.points || 0;
      this.setData({
        points,
        pointsValue: (points * 0.01).toFixed(2),
        redeemChannels: res.channels && res.channels.length ? res.channels : DEFAULT_CHANNELS
      });
    }).catch(() => {});
  },
  openChannel(e) {
    const url = e.currentTarget.dataset.url;
    if (!url) return;
    wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}` });
  }
});
