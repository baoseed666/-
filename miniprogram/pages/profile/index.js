const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    user: null,
    avatarChar: '?',
    history: []
  },
  onShow() {
    if (auth.isLoggedIn()) {
      this.loadProfile();
    } else {
      this.setData({ user: null });
    }
  },
  loadProfile() {
    api.get('/users/me').then(user => {
      const name = user.nickname || user.name || '?';
      this.setData({ user, avatarChar: name.charAt(0) || '?' });
    }).catch(() => {});
    api.get('/users/me/challenges').then(res => {
      this.setData({ history: (res.list || res || []).slice(0, 10) });
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
          this.setData({ user: null, history: [] });
          wx.switchTab({ url: '/pages/index/index' });
        }
      }
    });
  }
});
