# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: challenge.spec.ts >> 边界：拒绝位置授权 >> 拒绝定位 → 显示"位置未知"badge且主线任务有降级提示
- Location: e2e\challenge.spec.ts:176:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\爆seed\AppData\Local\ms-playwright\webkit-2272\Playwright.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```