const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    cityStats: null,
    rank: ''
  },
  onLoad() {
    this.loadStats();
    if (auth.isLoggedIn()) this.loadProfile();
  },
  onShow() {
    if (!auth.isLoggedIn()) {
      this.setData({ rank: '' });
    }
  },
  loadStats() {
    api.get('/stats/city?city=上海').then(data => {
      this.setData({ cityStats: { userCount: data.todayCount, totalSaved: data.todayTotalSaved } });
    }).catch(() => {
      this.setData({ cityStats: { userCount: 1024, totalSaved: '38,800' } });
    });
  },
  loadProfile() {
    api.get('/users/me').then(user => {
      this.setData({ rank: user.rankTitle || '' });
    }).catch(() => {});
  },
  goEmotion() {
    wx.switchTab({ url: '/pages/emotion/index' });
  },
  goChallenge() {
    wx.navigateTo({ url: '/pages/challenge/index' });
  },
  goPoints() {
    wx.switchTab({ url: '/pages/points/index' });
  }
});
