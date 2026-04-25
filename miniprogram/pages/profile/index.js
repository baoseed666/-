const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    user: null,
    avatarChar: '?',
    history: [],
    totalChallenges: 0,
    recentCount: 0,
  },
  onShow() {
    if (auth.isLoggedIn()) {
      this.loadProfile();
    } else {
      this.setData({ user: null, history: [] });
    }
  },
  loadProfile() {
    api.get('/users/me').then(user => {
      const name = user.nickname || '?';
      this.setData({ user, avatarChar: name.charAt(0).toUpperCase() || '?' });
    }).catch(() => {});

    api.get('/users/me/challenges').then(res => {
      const list = Array.isArray(res) ? res : (res.list || []);
      const history = list.slice(0, 10);
      // count challenges completed in the last 7 days
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentCount = list.filter(c => new Date(c.createdAt).getTime() > weekAgo).length;
      this.setData({ history, totalChallenges: list.length, recentCount });
    }).catch(() => {});
  },
  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },
  logout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后需重新登录',
      success: (res) => {
        if (res.confirm) {
          auth.clearTokens();
          getApp().globalData.userInfo = null;
          this.setData({ user: null, history: [], totalChallenges: 0, recentCount: 0 });
          wx.switchTab({ url: '/pages/index/index' });
        }
      }
    });
  },
  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
});
