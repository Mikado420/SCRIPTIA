import {
  Action,
  AIDecisionLog,
  GameState,
  LegalAction,
  PlayerId,
  VisibleGameState,
} from '../types/game';
import { AIEvaluator } from '../engine/aiEvaluator';
import { GameEngine } from '../engine/gameEngine';
import { DEFAULT_WORKER_URL } from './multiplayerService';

export class AIService {
  private engine: GameEngine;
  private evaluator: AIEvaluator;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.evaluator = new AIEvaluator(engine);
  }

  private async fetchAiEndpoint(endpoint: string, body: any): Promise<Response> {
    try {
      const localRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (localRes.ok) return localRes;
    } catch {
      // Fallback
    }

    // Fallback to Cloudflare Worker
    const workerEndpoint = `${DEFAULT_WORKER_URL}${endpoint}`;
    return fetch(workerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  public async getDecision(
    state: GameState,
    legalActions: LegalAction[],
    aiPlayerId: PlayerId,
    useGemini = true
  ): Promise<AIDecisionLog> {
    if (!useGemini) {
      return this.evaluator.selectBestAction(state, legalActions, aiPlayerId);
    }

    const visibleState = this.evaluator.extractVisibleState(state, aiPlayerId, legalActions);

    try {
      const response = await this.fetchAiEndpoint('/api/ai/decision', {
        visibleState,
        legalActions,
        aiPlayerId,
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data: any = await response.json();

      if (data.fallback || !data.selectedAction) {
        const fallbackDecision = this.evaluator.selectBestAction(state, legalActions, aiPlayerId);
        fallbackDecision.isFallback = true;
        fallbackDecision.fallbackReason = data.reason || 'Gemini fallback mode';
        return fallbackDecision;
      }

      const me = this.engine.getPlayer(state, aiPlayerId);
      const opp = this.engine.getOpponent(state, aiPlayerId);

      const decisionLog: AIDecisionLog = {
        id: `gemini_dec_${Date.now()}`,
        gameId: state.gameId,
        turn: state.turnNumber,
        phase: state.phase,
        aiPlayer: aiPlayerId,
        selectedAction: data.selectedAction,
        reason: data.reason || 'Geminiによる戦略的意思決定',
        candidates: data.evaluations?.map((ev: any) => ({
          action: legalActions[ev.index]?.action || data.selectedAction,
          score: ev.score,
          rationale: ev.rationale,
        })) || [],
        isFallback: false,
        visibleStateSummary: {
          myBarrier: me.barrier,
          opponentBarrier: opp.barrier,
          myHandCount: me.hand.length,
          oppHandCount: opp.hand.length,
          myActiveArcana: me.arcana.filter((a) => !a.isRested).length,
          myBattlefieldCount: me.battlefield.length,
          oppBattlefieldCount: opp.battlefield.length,
        },
        timestamp: Date.now(),
      };

      return decisionLog;
    } catch (err: any) {
      console.warn('Gemini request failed, defaulting to heuristic AI:', err);
      const fallbackDecision = this.evaluator.selectBestAction(state, legalActions, aiPlayerId);
      fallbackDecision.isFallback = true;
      fallbackDecision.fallbackReason = `Network/API Error: ${err.message}. Used local heuristic evaluation.`;
      return fallbackDecision;
    }
  }

  public async explainBoardState(state: GameState, aiPlayerId: PlayerId): Promise<string> {
    const legal = this.engine.getLegalActions(state);
    const visibleState = this.evaluator.extractVisibleState(state, aiPlayerId, legal);

    try {
      const response = await this.fetchAiEndpoint('/api/ai/explain', { visibleState });
      const data: any = await response.json();
      return data.analysis || '戦況分析を取得できませんでした。';
    } catch {
      return 'オフライン戦況分析: 盤面の有利トレードとアルカナの順次セットを心がけてください。';
    }
  }

  public async analyzeMatchSummary(summary: any): Promise<string> {
    try {
      const response = await this.fetchAiEndpoint('/api/ai/analyze-match', { matchSummary: summary });
      const data: any = await response.json();
      return data.review || '対戦総括を取得できませんでした。';
    } catch {
      return 'オフライン対戦総括: 序盤のアルカナ配分とテンポ維持が勝敗を分けました。';
    }
  }
}
