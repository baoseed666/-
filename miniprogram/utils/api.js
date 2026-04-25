// Simulator: localhost works directly
// Real device (iPhone): must use LAN IP on same WiFi
const BASE_URL = 'http://192.168.31.158:3000';
const auth = require('./auth');

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const token = auth.getToken();
    const header = { 'Content-Type': 'application/json' };
    if (token) header['Authorization'] = `Bearer ${token}`;

    wx.request({
      url: BASE_URL + path,
      method,
      data,
      header,
      timeout: 120000,
      success(res) {
        if (res.statusCode === 401) {
          if (!auth.isDemoMode()) auth.clearTokens();
          return reject(new Error('登录已过期，请重新登录'));
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(res.data?.message || `HTTP ${res.statusCode}`));
        }
      },
      fail(err) {
        const msg = err.errMsg || '';
        reject(new Error(msg.includes('ERR_CONNECTION_REFUSED') || msg.includes('connect ECONNREFUSED')
          ? '无法连接服务器，请启动后端（npm run start:dev）'
          : '网络请求失败'));
      }
    });
  });
}

function get(path) {
  return request('GET', path);
}

function post(path, data) {
  return request('POST', path, data);
}

module.exports = { request, get, post };
