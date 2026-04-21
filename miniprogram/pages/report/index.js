const api = require('../../utils/api');

const MOCK_REPORT = {
  title: '初级抠门侠',
  rank: '初级抠门侠',
  savedAmount: 15,
  percentile: 68,
  summary: '不错！这次挑战中你成功避开了3个消费陷阱，用最少的钱完成了目标。你已经具备了抠门侠的基本素养，继续修炼可晋升"中级省钱达人"！'
};

Page({
  data: {
    report: null,
    reportId: null
  },
  onLoad(options) {
    const reportId = options.reportId;
    this.setData({ reportId });
    if (reportId && reportId !== 'mock') {
      api.get(`/reports/${reportId}`).then(report => {
        this.setData({ report });
      }).catch(() => {
        this.setData({ report: MOCK_REPORT });
      });
    } else {
      this.setData({ report: MOCK_REPORT });
    }
  },
  share() {
    wx.showShareMenu({ withShareTicket: false });
    wx.showToast({ title: '点击右上角分享', icon: 'none' });
  },
  goLeaderboard() {
    wx.navigateTo({ url: '/pages/leaderboard/index' });
  },
  goChallenge() {
    wx.navigateBack({ delta: 10 });
  },
  onShareAppMessage() {
    const { report } = this.data;
    return {
      title: `我是"${report?.title || '抠门侠'}"，本次省下¥${report?.savedAmount || 0}！`,
      path: '/pages/index/index'
    };
  }
});
