const api = require('../../utils/api');

const MOCK_LIST = [
  { rank: 1, nickname: '省钱王者', title: '传说级抠门宗师', totalSaved: 3288 },
  { rank: 2, nickname: '精打细算小李', title: '史诗抠门达人', totalSaved: 2100 },
  { rank: 3, nickname: '优惠猎手', title: '稀有省钱高手', totalSaved: 1580 },
  { rank: 4, nickname: '地铁侠', title: '高级抠门侠', totalSaved: 980 },
  { rank: 5, nickname: '砍价女王', title: '中级省钱达人', totalSaved: 760 }
];

Page({
  data: {
    list: [],
    cityStats: null
  },
  onLoad() {
    this.loadData();
  },
  loadData() {
    api.get('/leaderboard?city=上海&limit=20').then(res => {
      this.setData({ list: res.list || res || [] });
    }).catch(() => {
      this.setData({ list: MOCK_LIST });
    });
    api.get('/stats/city?city=上海').then(data => {
      this.setData({ cityStats: data });
    }).catch(() => {
      this.setData({ cityStats: { userCount: 1024, totalSaved: '38,800', avgSaved: 38 } });
    });
  }
});
