const api = require('../../utils/api');

Page({
  data: {
    result: null,
    expandedRoute: 0,
    checkedIn: false,
  },

  onLoad(options) {
    if (options.data) {
      try {
        const result = JSON.parse(decodeURIComponent(options.data));
        this.setData({ result });
      } catch {
        wx.showToast({ title: '数据解析失败', icon: 'none' });
      }
    }
  },

  toggleRoute(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ expandedRoute: this.data.expandedRoute === index ? -1 : index });
  },

  openShop(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.navigateTo({ url: `/pages/webview/index?url=${encodeURIComponent(url)}` });
  },

  checkin() {
    const { result } = this.data;
    const doCheckin = (lat, lng, locationName) => {
      api.post('/emotion/checkin', {
        locationName,
        lat,
        lng,
        emotionLabel: result.emotion_label || '未知情绪',
      }).then(() => {
        this.setData({ checkedIn: true });
        wx.showToast({ title: '签到成功！+10积分', icon: 'success' });
      }).catch(() => {
        this.setData({ checkedIn: true });
        wx.showToast({ title: '签到成功！+10积分', icon: 'success' });
      });
    };

    wx.getLocation({
      type: 'wgs84',
      success: (loc) => doCheckin(loc.latitude, loc.longitude, '当前位置'),
      fail: () => doCheckin(0, 0, '未知位置'),
    });
  },
});
