const TOKEN_KEY = 'km_token';
const REFRESH_TOKEN_KEY = 'km_refresh_token';
const DEMO_KEY = 'km_demo';

function getToken() {
  return wx.getStorageSync(TOKEN_KEY) || '';
}

function setToken(token) {
  wx.setStorageSync(TOKEN_KEY, token);
}

function setRefreshToken(token) {
  wx.setStorageSync(REFRESH_TOKEN_KEY, token);
}

function isDemoMode() {
  return !!wx.getStorageSync(DEMO_KEY);
}

function setDemoMode() {
  wx.setStorageSync(DEMO_KEY, '1');
}

function clearTokens() {
  wx.removeStorageSync(TOKEN_KEY);
  wx.removeStorageSync(REFRESH_TOKEN_KEY);
  wx.removeStorageSync(DEMO_KEY);
}

function isLoggedIn() {
  return !!getToken() || isDemoMode();
}

module.exports = { getToken, setToken, setRefreshToken, clearTokens, isLoggedIn, isDemoMode, setDemoMode };
