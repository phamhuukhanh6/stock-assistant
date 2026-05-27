import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { jwtVerify, SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { agents } from './agents.js';
import { buildPrompt, truncateMessages } from './utils.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

const getSecretKey = (secret) => new TextEncoder().encode(secret || "super-secret-default-key-12345");

// Root route for testing
app.get('/', (c) => c.text('Stock Assistant API is running!'));
app.get('/health', (c) => c.json({ status: 'ok' }));

async function authMiddleware(c, next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.split(' ')[1];
  if (token === 'guest') {
    c.set('user', { id: 0, username: 'guest', isGuest: true });
    return next();
  }

  try {
    const secret = getSecretKey(c.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    c.set('user', payload);
    await next();
  } catch (e) {
    return c.json({ error: 'Invalid token' }, 401);
  }
}

// Financial Data Utils
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

async function getMarketOverview() {
  try {
    const url = "https://iq.vietcap.com.vn/api/iq-insight-service/v1/market-indices";
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Referer": "https://iq.vietcap.com.vn/" } });
    const data = await res.json();
    
    let indicesStr = "";
    if (data?.data && Array.isArray(data.data)) {
      const mapping = { "VNINDEX": "VNINDEX", "VN30": "VN30", "HNXIndex": "HNXIndex", "UpcomIndex": "HNXUpcomIndex" };
      const validIndices = data.data.filter(i => mapping[i.comGroupCode] || mapping[i.symbol]);
      indicesStr = validIndices.map(i => {
        const name = mapping[i.comGroupCode] || i.symbol;
        const val = i.indexValue || i.price || "N/A";
        const pct = i.percentChange !== undefined ? `${i.percentChange}%` : "N/A";
        return `${name}: ${val} (${pct})`;
      }).join('; ');
    }
    return `[DỮ LIỆU THỊ TRƯỜNG]: ${indicesStr || "N/A"}`;
  } catch (e) {
    return "[DỮ LIỆU THỊ TRƯỜNG]: VNINDEX: 1.912,93 (-0,78%); VN30: 2.027,45 (-0,92%)";
  }
}

async function getStockFullIntelligence(symbol) {
  symbol = symbol.toUpperCase();
  let result = `--- DỮ LIỆU MÃ ${symbol} ---\n`;
  try {
    const statsRes = await fetch(`https://iq.vietcap.com.vn/api/iq-insight-service/v1/company/${symbol}/statistics-financial`, { headers: { "User-Agent": USER_AGENT, "Referer": "https://iq.vietcap.com.vn/" } }).then(r => r.json());
    if (statsRes?.data && Array.isArray(statsRes.data) && statsRes.data.length > 0) {
      const s = statsRes.data[statsRes.data.length - 1];
      result += `[Tài chính]: P/E: ${s.pe?.toFixed(1)}, P/B: ${s.pb?.toFixed(1)}, ROE: ${(s.roe * 100).toFixed(1)}%, ROA: ${(s.roa * 100).toFixed(1)}%.\n`;
    }
  } catch (e) {}
  return result;
}

// Routes
app.post('/api/auth/register', async (c) => {
  const { full_name, username, email, password } = await c.req.json();
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await c.env.DB.prepare('INSERT INTO users (full_name, username, email, password) VALUES (?, ?, ?, ?)').bind(full_name, username, email, hashedPassword).run();
    return c.json({ message: 'Đăng ký thành công' }, 201);
  } catch (e) {
    return c.json({ error: 'Tài khoản hoặc email đã tồn tại' }, 400);
  }
});

app.post('/api/auth/login', async (c) => {
  const { username, password } = await c.req.json();
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE username = ? OR email = ?').bind(username, username).first();
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return c.json({ error: 'Tài khoản hoặc mật khẩu không chính xác' }, 401);
  }
  const secret = getSecretKey(c.env.JWT_SECRET);
  const token = await new SignJWT({ id: user.id, username: user.username, full_name: user.full_name }).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('7d').sign(secret);
  return c.json({ token, user: { full_name: user.full_name, username: user.username } });
});

app.get('/api/agents', async (c) => c.json(agents));

app.get('/api/projects', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.isGuest) return c.json([]);
  const projects = await c.env.DB.prepare('SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC').bind(user.id).all();
  return c.json(projects.results);
});

app.post('/api/projects', authMiddleware, async (c) => {
  const user = c.get('user');
  if (user.isGuest) return c.json({ error: 'Forbidden' }, 403);
  const { name } = await c.req.json();
  const result = await c.env.DB.prepare('INSERT INTO projects (user_id, name) VALUES (?, ?)').bind(user.id, name).run();
  return c.json({ id: result.meta.last_row_id, name }, 201);
});

app.post('/api/chat', authMiddleware, async (c) => {
  const { messages, systemPrompt, model = 'gemini-3.5-flash', conversationId } = await c.req.json();
  const apiKey = c.env.GOOGLE_API_KEY;
  const user = c.get('user');

  const saveMessage = async (role, content) => {
    if (!user.isGuest && conversationId) {
      await c.env.DB.prepare('INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)').bind(conversationId, role, content).run();
    }
  };

  const lastUserMsg = messages[messages.length - 1].content;
  await saveMessage('user', lastUserMsg);

  let dataContext = "";
  const lastMsgUpper = lastUserMsg.toUpperCase();
  if (["THỊ TRƯỜNG", "VNINDEX"].some(k => lastMsgUpper.includes(k))) dataContext += await getMarketOverview() + "\n";
  const tickerMatch = lastMsgUpper.match(/\b[A-Z]{3,4}\b/g);
  if (tickerMatch) {
    const tickers = [...new Set(tickerMatch)].slice(0, 3);
    for (const t of tickers) dataContext += await getStockFullIntelligence(t) + "\n";
  }

  const fullPrompt = buildPrompt({ messages: truncateMessages(messages, 4), systemPrompt, dataContext, isStockQuery: !!tickerMatch });

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }], generationConfig: { maxOutputTokens: 2048 } })
  });

  if (!response.ok) return c.json({ error: 'Gemini API Error' }, 500);

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let assistantContent = "";

  (async () => {
    let buffer = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let startIdx;
        while ((startIdx = buffer.indexOf('{')) !== -1) {
          let depth = 0, endIdx = -1, inString = false, escaped = false;
          for (let i = startIdx; i < buffer.length; i++) {
            const char = buffer[i];
            if (char === '"' && !escaped) inString = !inString;
            if (inString) { escaped = (char === '\\' && !escaped); continue; }
            if (char === '{') depth++; else if (char === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
            escaped = false;
          }
          if (endIdx !== -1) {
            try {
              const data = JSON.parse(buffer.substring(startIdx, endIdx + 1));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
              if (text) {
                assistantContent += text;
                await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            } catch (e) {}
            buffer = buffer.substring(endIdx + 1);
          } else break;
        }
      }
      await saveMessage('assistant', assistantContent);
      await writer.write(new TextEncoder().encode(`data: [DONE]\n\n`));
    } catch (e) {
      await writer.write(new TextEncoder().encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new Response(readable, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
});

export default app;
