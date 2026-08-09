import { NextResponse } from 'next/server';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7957170331:AAFO6ypVNJXo3RCOXmq1lTAQPoTJSfPQ4MA';
const DEFAULT_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '7458651817';

// Helper function to send Telegram notification to all registered chats
export async function sendTelegramBookingNotification(payload: {
  bookingId?: string;
  customerName: string;
  customerPhone: string;
  eventDate: string;
  totalPrice: number;
  itemsRequested: Array<{ item_name?: string; quantity: number; price?: number }>;
  supplierName?: string;
}) {
  const targetChatIds = new Set<string>();

  // Always include primary chat ID 7458651817
  if (DEFAULT_CHAT_ID) {
    targetChatIds.add(DEFAULT_CHAT_ID);
  }

  // 2. Fetch updates from Telegram Bot API to get chat_ids of anyone who initiated contact with @FrameLeadsBot
  try {
    const updatesRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`, {
      cache: 'no-store'
    });
    const updatesData = await updatesRes.json();
    if (updatesData.ok && Array.isArray(updatesData.result)) {
      for (const update of updatesData.result) {
        const chatId = update.message?.chat?.id || update.channel_post?.chat?.id || update.my_chat_member?.chat?.id;
        if (chatId) {
          targetChatIds.add(String(chatId));
        }
      }
    }
  } catch (e) {
    console.error('Error fetching Telegram bot updates:', e);
  }

  if (targetChatIds.size === 0) {
    return { success: false, reason: "No Telegram chat IDs found. Please send a message or /start to http://t.me/FrameLeadsBot" };
  }

  const itemsList = Array.isArray(payload.itemsRequested)
    ? payload.itemsRequested.map(i => `• <b>${i.item_name || 'Item'}</b> × ${i.quantity} (₹${i.price || 0}/day)`).join('\n')
    : 'No item details';

  const htmlMessage = 
`🎪 <b>NEW PANDALONLINE BOOKING!</b> 🎪

👤 <b>Customer:</b> ${payload.customerName}
📞 <b>Phone:</b> <a href="tel:${payload.customerPhone}">${payload.customerPhone}</a>
📅 <b>Event Date:</b> ${payload.eventDate}
🏪 <b>Supplier:</b> ${payload.supplierName || 'PandalOnline Hubli'}

📦 <b>Items Requested:</b>
${itemsList}

💰 <b>Total Rental:</b> ₹${payload.totalPrice}/day

⚡ <i>Reply to customer or check your PandalOnline Dashboard!</i>`;

  const results = [];
  for (const chatId of Array.from(targetChatIds)) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: htmlMessage,
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      });
      const data = await res.json();
      results.push({ chatId, status: data.ok ? 'sent' : 'failed', data });
    } catch (err: any) {
      results.push({ chatId, status: 'error', error: err.message });
    }
  }

  return { success: true, results, recipientCount: targetChatIds.size };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await sendTelegramBookingNotification(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  // Test endpoint to verify Telegram Bot configuration
  try {
    const testResult = await sendTelegramBookingNotification({
      customerName: "Test Customer (Auto Test)",
      customerPhone: "+91 9876543210",
      eventDate: new Date().toISOString().split('T')[0],
      totalPrice: 1500,
      itemsRequested: [{ item_name: "20x20 Shamiyana Tent", quantity: 1, price: 1000 }, { item_name: "Plastic Chairs", quantity: 50, price: 500 }],
      supplierName: "Shamiyana Test Supplier"
    });
    return NextResponse.json({ status: "Telegram API test executed", testResult });
  } catch (err: any) {
    return NextResponse.json({ status: "Error testing Telegram API", error: err.message }, { status: 500 });
  }
}
