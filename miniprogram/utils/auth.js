const TOKEN_KEY = 'km_token';
const REFRESH_TOKEN_KEY = 'km_refresh_token';

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function setRefreshToken(token) {
  wx.setStorageSync(REFRESH_TOKEN_KEY, token);
}

function clearTokens() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(REFRESH_TOKEN_KEY);
}

function isLoggedIn() {
  return !!getToken();
}

module.exports = { getToken, setToken, setRefreshToken, clearTokens, isLoggedIn };
