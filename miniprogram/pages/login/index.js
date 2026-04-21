const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    phone: '',
    code: '',
    loading: false,
    smsSent: false,
    smsCountdown: 0
  },
  onPhoneInput(e) {
    this.setData({ phone: e.detail.value });
  },
  onCodeInput(e) {
    this.setData({ code: e.detail.value });
  },
  sendSms() {
    const { phone } = this.data;
    if (phone.length < 11) return;
    api.post('/auth/sms/send', { phone }).then(() => {
      wx.showToast({ title: '验证码已发送', icon: 'none' });
    }).catch(err => {
      wx.showToast({ title: err.message || '发送失败', icon: 'none' });
    });
    this.setData({ smsSent: true, smsCountdown: 60 });
    const timer = setInterval(() => {
      const n = this.data.smsCountdown - 1;
      if (n <= 0) {
        clearInterval(timer);
        this.setData({ smsSent: false, smsCountdown: 0 });
      } else {
        this.setData({ smsCountdown: n });
      }
    }, 1000);
  },
  login() {
    const { phone, code } = this.data;
    if (!phone || code.length < 6) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' });
      return;
    }
    this.setData({ loading: true });
    api.post('/auth/sms/verify', { phone, otp: code }).then(res => {
      auth.setToken(res.accessToken || res.token);
      if (res.refreshToken) auth.setRefreshToken(res.refreshToken);
      const app = getApp();
      app.globalData.userInfo = res.user || null;
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        wx.switchTab({ url: '/pages/index/index' });
      }
    }).catch(err => {
      wx.showToast({ title: err.message || '登录失败', icon: 'none' });
    }).finally(() => {
      this.setData({ loading: false });
    });
  }
});
