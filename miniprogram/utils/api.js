const BASE_URL = 'http://localhost:3000';
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
          auth.clearTokens();
          return reject(new Error('Unauthorized'));
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(new Error(res.data?.message || `HTTP ${res.statusCode}`));
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || 'Network error'));
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
