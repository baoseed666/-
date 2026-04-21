export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret',
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  sms: {
    demoMode: process.env.SMS_DEMO_MODE === 'true',
    providerUrl: process.env.SMS_PROVIDER_URL,
    apiKey: process.env.SMS_API_KEY,
  },
  wechat: {
    appId: process.env.WECHAT_APP_ID,
    appSecret: process.env.WECHAT_APP_SECRET,
    redirectUri: process.env.WECHAT_REDIRECT_URI,
    miniAppId: process.env.WECHAT_MINI_APP_ID,
    miniAppSecret: process.env.WECHAT_MINI_APP_SECRET,
    demoMode: process.env.WECHAT_DEMO_MODE === 'true',
  },
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
  },
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  amap: {
    apiKey: process.env.AMAP_API_KEY ?? '',
  },
  baidu: {
    ak: process.env.BAIDU_MAP_AK ?? '',
  },
});
