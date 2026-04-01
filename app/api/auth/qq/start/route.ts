import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectTo = url.searchParams.get("redirectTo") || "/";

  // 从环境变量获取你在 QQ 互联申请到的 APP ID
  const QQ_CLIENT_ID = process.env.QQ_CLIENT_ID; 

  // 回调地址必须与你在 QQ 互联后台配置的一模一样
  // 例如：https://y78bq.dpdns.org/api/auth/qq/callback
  const SITE_URL = process.env.SITE_URL || "http://localhost:3000";
  const redirectUri = encodeURIComponent(`${SITE_URL}/api/auth/qq/callback`);
  
  // 将用户想去的地方（redirectTo）编码到 state 里，等授权回来后我们可以继续带他去那里
  const state = encodeURIComponent(redirectTo);

  if (!QQ_CLIENT_ID) {
    // 如果没有配置环境变量，给用户一个友好的错误提示，而不是直接崩溃
    return new NextResponse(`
      <div style="font-family: sans-serif; padding: 40px; text-align: center;">
        <h2>系统配置中...</h2>
        <p>站长尚未配置 QQ 登录凭证 (QQ_CLIENT_ID)，请暂时使用邮箱登录。</p>
        <a href="/" style="color: blue; text-decoration: none;">返回首页</a>
      </div>
    `, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  // 拼装标准 OAuth 2.0 授权链接
  const qqAuthUrl = `https://graph.qq.com/oauth2.0/authorize?response_type=code&client_id=${QQ_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}`;

  // 将用户重定向到 QQ 官方的授权页面
  return NextResponse.redirect(qqAuthUrl);
}