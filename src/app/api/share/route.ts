import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(req: NextRequest) {
  const { title, author, oneSentenceSummary, shareUrl } = await req.json();

  try {
    const qrDataUrl = await QRCode.toDataURL(shareUrl, {
      width: 200,
      margin: 2,
      color: { dark: '#1a1a2e', light: '#ffffff' },
    });

    // Generate a share card as SVG-based HTML for rendering
    const cardHtml = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
  .card { width: 400px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 20px; padding: 40px; color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
  .badge { display: inline-block; background: rgba(255,255,255,0.15); padding: 4px 12px; border-radius: 12px; font-size: 12px; margin-bottom: 20px; }
  .title { font-size: 24px; font-weight: 700; margin-bottom: 8px; line-height: 1.3; }
  .author { font-size: 14px; color: rgba(255,255,255,0.7); margin-bottom: 24px; }
  .divider { height: 1px; background: rgba(255,255,255,0.2); margin: 0 0 20px; }
  .summary { font-size: 15px; line-height: 1.6; color: rgba(255,255,255,0.9); font-style: italic; margin-bottom: 24px; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 12px; color: rgba(255,255,255,0.5); }
  .brand strong { color: rgba(255,255,255,0.8); font-size: 14px; display: block; margin-bottom: 4px; }
  .qr img { width: 80px; height: 80px; border-radius: 8px; }
</style>
</head>
<body>
  <div class="card">
    <span class="badge">📚 AI读书推荐</span>
    <div class="title">${title}</div>
    <div class="author">✍️ ${author}</div>
    <div class="divider"></div>
    <div class="summary">"${oneSentenceSummary}"</div>
    <div class="footer">
      <div class="brand">
        <strong>AI工作台</strong>
        扫码查看完整解读
      </div>
      <div class="qr"><img src="${qrDataUrl}" alt="QR Code" /></div>
    </div>
  </div>
</body>
</html>`;

    return NextResponse.json({ cardHtml, qrDataUrl });
  } catch (e) {
    console.error('Share card generation error:', e);
    return NextResponse.json({ error: 'Failed to generate share card' }, { status: 500 });
  }
}
