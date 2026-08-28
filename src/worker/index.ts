import { Env } from './types';
import { GameRoom } from './gameRoom';
import { GoogleGenAI } from '@google/genai';

export { GameRoom };

const ALLOWED_ORIGINS = [
  'https://mikado420.github.io',
  'http://localhost:5173',
  'http://localhost:3000',
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  if (origin.includes('github.io')) return true;
  if (origin.endsWith('.run.app')) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  if (origin.includes('workers.dev')) return true;
  return true; // Allow client requests across origins
}

function getCorsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  const allowed = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
  };
}

function handleCors(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

function jsonResponse(data: any, request: Request, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...getCorsHeaders(request),
    },
  });
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return handleCors(request);
    }

    // 2. Health check
    if (url.pathname === '/api/health') {
      return jsonResponse(
        {
          status: 'ok',
          service: 'SCRIPTIA Cloudflare Online Server (Durable Objects)',
          hasApiKey: !!env.GEMINI_API_KEY,
          rulesVersion: 'Version 0.03',
          cardPoolVersion: 'Ver.2.3',
        },
        request
      );
    }

    // 3. Room creation helper API
    if (url.pathname === '/api/room/create' && request.method === 'POST') {
      const code = generateRoomCode();
      return jsonResponse({ code }, request);
    }

    // 4. WebSocket connection to GameRoom DO
    // URL pattern: /ws?code=XXXXXX or /ws/XXXXXX
    if (url.pathname === '/ws' || url.pathname.startsWith('/ws/')) {
      let code = url.searchParams.get('code');
      if (!code && url.pathname.startsWith('/ws/')) {
        code = url.pathname.replace('/ws/', '').split('/')[0];
      }

      if (!code) {
        // Fallback: If no code given, generate one
        code = generateRoomCode();
        url.searchParams.set('code', code);
      }

      const roomCode = code.toUpperCase();
      const id = env.GAME_ROOM.idFromName(roomCode);
      const stub = env.GAME_ROOM.get(id);

      const modifiedUrl = new URL(request.url);
      modifiedUrl.searchParams.set('code', roomCode);
      const modifiedRequest = new Request(modifiedUrl.toString(), request);

      return stub.fetch(modifiedRequest);
    }

    // 5. AI Endpoints (Proxied to Google GenAI safely with env.GEMINI_API_KEY)
    if (url.pathname === '/api/ai/decision' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { visibleState, legalActions } = body;
        if (!visibleState || !legalActions || legalActions.length === 0) {
          return jsonResponse({ error: 'visibleState and non-empty legalActions are required' }, request, 400);
        }

        if (!env.GEMINI_API_KEY) {
          return jsonResponse({
            fallback: true,
            reason: 'No GEMINI_API_KEY configured on server. Used Heuristic AI.',
          }, request);
        }

        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const systemPrompt = `You are a Grandmaster TCG AI Player in a high-strategy card game (80-card pool Ver 2.3).
Your goal is to maximize your win probability by evaluating board state, tempo, card advantage, mana curves, lethal threats, and enemy triggers.

Given the current visible GameState and the list of Legal Actions (0-indexed):
1. Analyze your board vs opponent board, HP levels, active arcana mana, and threats.
2. Evaluate candidates and select the single BEST action index from the legal actions list.
3. Provide a clear tactical reasoning in Japanese.

You must respond with valid JSON adhering to this structure:
{
  "selectedIndex": number,
  "reason": "string (Japanese explanation of strategic reasoning)",
  "evaluations": [
    {
      "index": number,
      "score": number (0.0 to 10.0),
      "rationale": "string"
    }
  ]
}`;

        const prompt = `Current Game State:
${JSON.stringify(visibleState, null, 2)}

Legal Actions:
${JSON.stringify(
  legalActions.map((act: any, idx: number) => ({
    index: idx,
    description: act.description,
    category: act.category,
    cardName: act.cardName,
  })),
  null,
  2
)}

Select the optimal action index and provide reasoning.`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const responseText = response.text || '{}';
        const parsed = JSON.parse(responseText);
        const selectedIndex =
          typeof parsed.selectedIndex === 'number' &&
          parsed.selectedIndex >= 0 &&
          parsed.selectedIndex < legalActions.length
            ? parsed.selectedIndex
            : 0;

        return jsonResponse({
          fallback: false,
          selectedIndex,
          selectedAction: legalActions[selectedIndex].action,
          reason: parsed.reason || 'Gemini戦略分析による最適行動',
          evaluations: parsed.evaluations || [],
        }, request);
      } catch (err: any) {
        return jsonResponse({
          fallback: true,
          reason: `Gemini API Error: ${err.message || 'Unknown error'}. Fallback to Heuristic AI.`,
        }, request);
      }
    }

    if (url.pathname === '/api/ai/explain' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { visibleState } = body;
        if (!env.GEMINI_API_KEY) {
          return jsonResponse({
            analysis: '【戦況分析】現在の盤面は互角の攻防が続いています。アルカナの効率的な運用と相手ガードへの対処が鍵となります。',
          }, request);
        }
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const prompt = `あなたはプロTCG解説者兼コーチです。以下の局面（プレイヤー視点）の戦況を日本語で簡潔にプロ目線で分析してください。
- 現在の優勢度（盤面、リソース、ライフ）
- 次のターンの狙い目・勝ち筋
- 警戒すべき相手の動き

GameState:
${JSON.stringify(visibleState, null, 2)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.3 },
        });

        return jsonResponse({ analysis: response.text }, request);
      } catch {
        return jsonResponse({
          analysis: '戦況分析の取得中にエラーが発生しました。盤面の有利トレードとアルカナ管理を維持してください。',
        }, request);
      }
    }

    if (url.pathname === '/api/ai/analyze-match' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { matchSummary } = body;
        if (!env.GEMINI_API_KEY) {
          return jsonResponse({
            review: '【総括】序盤のマナカーブとテンポ維持が勝敗を分けました。デッキの平均コスト配分と除去スペルの採用枚数の調整が有効です。',
          }, request);
        }
        const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
        const prompt = `あなたはTCGのシミュレーション分析官です。以下の対戦結果サマリーを基に、勝因・敗因・デッキ調整の提案（キーカードの採用枚数など）を日本語で具体的にフィードバックしてください。

Match Data:
${JSON.stringify(matchSummary, null, 2)}`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { temperature: 0.3 },
        });

        return jsonResponse({ review: response.text }, request);
      } catch {
        return jsonResponse({ review: '対戦レビューの生成に失敗しました。' }, request);
      }
    }

    return new Response('SCRIPTIA Online Server (Cloudflare Workers + Durable Objects)', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        ...getCorsHeaders(request),
      },
    });
  },
};
