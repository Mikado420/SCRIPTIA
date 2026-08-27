import React, { useState, useEffect, useRef } from 'react';
import {
  Action,
  AIDecisionLog,
  CardData,
  Deck,
  GameLogEntry,
  GameState,
  LegalAction,
  PlayerId,
  CardInstance,
} from '../types/game';
import { PRESET_DECKS } from '../data/presetDecks';
import { audioService } from '../utils/AudioService';
import { GameEngine } from '../engine/gameEngine';
import { AIService } from '../services/aiService';
import { CardItem } from './CardItem';
import { PlayerHUD } from './battle/PlayerHUD';
import { BattlefieldZone } from './battle/BattlefieldZone';
import { HandZone } from './battle/HandZone';
import { CombatOverlay } from './battle/CombatOverlay';
import { CardDetailPanel } from './battle/CardDetailPanel';
import { GameMenuModal } from './battle/GameMenuModal';
import { ArchiveOverlay } from './ArchiveOverlay';
import { ArcanaOverlay } from './ArcanaOverlay';
import { GameLogOverlay } from './GameLogOverlay';
import {
  Play,
  ArrowRight,
  Menu,
  Sparkles,
  Settings,
  X,
  Bot,
  User,
  RotateCcw,
} from 'lucide-react';
import { AppTab } from './Navbar';

interface GameBoardProps {
  onInspectCard: (card: CardData) => void;
  onNavigateTab?: (tab: AppTab) => void;
  customDecks: Deck[];
  hasApiKey: boolean;
}

interface DragState {
  card: CardData | CardInstance;
  source: 'HAND' | 'PLAYER_UNIT' | 'GUARD_UNIT';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  onInspectCard,
  onNavigateTab,
  customDecks,
  hasApiKey,
}) => {
  const allAvailableDecks = [...customDecks, ...PRESET_DECKS];

  const [deckAId, setDeckAId] = useState<string>(PRESET_DECKS[0].deckId);
  const [deckBId, setDeckBId] = useState<string>(PRESET_DECKS[1].deckId);

  const [playerAIsAI, setPlayerAIsAI] = useState<boolean>(false);
  const [playerBIsAI, setPlayerBIsAI] = useState<boolean>(true);
  const [useGeminiForAI, setUseGeminiForAI] = useState<boolean>(hasApiKey);

  const [engine] = useState(() => new GameEngine(Date.now()));
  const [aiService] = useState(() => new AIService(engine));

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [legalActions, setLegalActions] = useState<LegalAction[]>([]);
  const [latestAIDecision, setLatestAIDecision] = useState<AIDecisionLog | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [isProcessingStep, setIsProcessingStep] = useState<boolean>(false);
  const [gameLogs, setGameLogs] = useState<GameLogEntry[]>([]);

  // Selection states
  const [selectedHandInstanceId, setSelectedHandInstanceId] = useState<string | null>(null);
  const [selectedAttackerInstanceId, setSelectedAttackerInstanceId] = useState<string | null>(null);
  const [detailCard, setDetailCard] = useState<CardData | CardInstance | null>(null);

  // Transient Combat Visual Animation State
  const [combatAnimation, setCombatAnimation] = useState<{
    type: 'ATTACK' | 'GUARD' | 'DAMAGE' | 'DESTROY' | 'SPELL' | 'EVOLVE';
    sourceText?: string;
    targetText?: string;
    damageAmount?: number;
  } | null>(null);

  // Drag and Drop state
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredDropZone, setHoveredDropZone] = useState<string | null>(null);

  // Overlay Modals
  const [archiveModalTarget, setArchiveModalTarget] = useState<'A' | 'B' | null>(null);
  const [arcanaModalTarget, setArcanaModalTarget] = useState<'A' | 'B' | null>(null);
  const [showLogModal, setShowLogModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showMenuModal, setShowMenuModal] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(audioService.getMuted());

  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const matchIdRef = useRef<string>('');
  const isActionExecutingRef = useRef<boolean>(false);
  const lastDragEndTimeRef = useRef<number>(0);
  const dragPointerIdRef = useRef<number | null>(null);

  // Invariant verification check
  const verifyGameInvariants = (state: GameState, logSource: string) => {
    const checkPlayer = (p: typeof state.playerA, role: string) => {
      const total = p.deck.length + p.hand.length + p.battlefield.length + p.arcana.length + p.archive.length;
      if (total !== 40) {
        console.warn(
          `[Invariant Alert][${logSource}] Player ${role} (${p.playerId}) total card count = ${total} (expected 40). ` +
          `Deck:${p.deck.length}, Hand:${p.hand.length}, Field:${p.battlefield.length}, Arcana:${p.arcana.length}, Archive:${p.archive.length}`
        );
      }
    };
    checkPlayer(state.playerA, 'P1');
    checkPlayer(state.playerB, 'P2');
  };

  // Initialize Match
  const startNewMatch = () => {
    if (autoPlayTimerRef.current) {
      clearInterval(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
    setIsAutoPlaying(false);
    isActionExecutingRef.current = false;

    const deckA = allAvailableDecks.find((d) => d.deckId === deckAId) || PRESET_DECKS[0];
    const deckB = allAvailableDecks.find((d) => d.deckId === deckBId) || PRESET_DECKS[1];
    const newMatchId = `game_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    matchIdRef.current = newMatchId;

    const state = engine.createInitialState(
      newMatchId,
      deckA.cards,
      deckB.cards,
      `${deckA.deckName.split(' ')[0]} (P1)`,
      `${deckB.deckName.split(' ')[0]} (P2)`,
      playerAIsAI,
      playerBIsAI,
      playerAIsAI ? (useGeminiForAI ? 'GEMINI' : 'HEURISTIC') : 'HUMAN',
      playerBIsAI ? (useGeminiForAI ? 'GEMINI' : 'HEURISTIC') : 'HUMAN',
      Date.now()
    );

    verifyGameInvariants(state, 'InitialState');
    setGameState(state);
    setGameLogs(engine.getLogs());
    setLatestAIDecision(null);
    setSelectedHandInstanceId(null);
    setSelectedAttackerInstanceId(null);
    setDetailCard(null);
    setDragState(null);
    setCombatAnimation(null);

    const actions = engine.getLegalActions(state);
    setLegalActions(actions);
    audioService.playTurn();
  };

  useEffect(() => {
    startNewMatch();
    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      matchIdRef.current = '';
    };
  }, [deckAId, deckBId]);

  // Audio and Animation dispatcher
  const triggerActionFeedback = (action: Action, prevState?: GameState, nextState?: GameState) => {
    switch (action.type) {
      case 'PLAY_UNIT':
        audioService.playSummon();
        setCombatAnimation({ type: 'ATTACK', sourceText: 'ユニット召喚' });
        break;
      case 'EVOLVE':
        audioService.playEvolve();
        setCombatAnimation({ type: 'EVOLVE', sourceText: 'ユニット進化！' });
        break;
      case 'PLAY_SPELL':
        audioService.playSpell();
        setCombatAnimation({ type: 'SPELL', sourceText: 'スペル詠唱' });
        break;
      case 'ATTACK': {
        audioService.playAttack();
        const payload = action.payload as any;
        const targetDesc = payload?.targetType === 'PLAYER' ? '結界へ直接攻撃！' : 'ユニット迎撃！';
        setCombatAnimation({
          type: 'ATTACK',
          sourceText: '攻撃宣言',
          targetText: targetDesc,
        });
        break;
      }
      case 'GUARD':
        if ((action.payload as any)?.doGuard) {
          audioService.playGuard();
          setCombatAnimation({ type: 'GUARD', sourceText: 'ガード防御発動！' });
        }
        break;
      case 'SET_RUNE':
        audioService.playRune();
        break;
      case 'PLAY_DOMAIN':
        audioService.playDomain();
        setCombatAnimation({ type: 'SPELL', sourceText: 'ドメイン展開' });
        break;
      case 'END_TURN':
        audioService.playTurn();
        break;
      default:
        break;
    }

    if (prevState && nextState) {
      if (nextState.playerA.barrier < prevState.playerA.barrier || nextState.playerB.barrier < prevState.playerB.barrier) {
        audioService.playDamage();
      } else if (
        (nextState.playerA.archive.length > prevState.playerA.archive.length ||
          nextState.playerB.archive.length > prevState.playerB.archive.length) &&
        action.type !== 'SET_ARCANA' &&
        action.type !== 'EVOLVE'
      ) {
        audioService.playDestroy();
      }
    }

    // Auto clear combat animation after 900ms
    setTimeout(() => {
      setCombatAnimation(null);
    }, 900);
  };

  // Execute Action
  const handleExecuteAction = (action: Action) => {
    if (!gameState || gameState.gameStatus !== 'IN_PROGRESS' || isProcessingStep || isActionExecutingRef.current) {
      return;
    }

    const currentMatch = matchIdRef.current;
    isActionExecutingRef.current = true;
    setIsProcessingStep(true);

    try {
      if (matchIdRef.current !== currentMatch) return;

      const { nextState, log } = engine.step(gameState, action);
      verifyGameInvariants(nextState, `Action_${action.type}`);

      triggerActionFeedback(action, gameState, nextState);
      setGameState(nextState);
      setGameLogs((prev) => [...prev, log]);

      setSelectedHandInstanceId(null);
      setSelectedAttackerInstanceId(null);
      setDragState(null);

      const nextActions = engine.getLegalActions(nextState);
      setLegalActions(nextActions);
    } catch (err) {
      console.error('[handleExecuteAction Error]:', err);
    } finally {
      isActionExecutingRef.current = false;
      setIsProcessingStep(false);
    }
  };

  // AI Turn Execution
  const executeAITurn = async () => {
    if (!gameState || gameState.gameStatus !== 'IN_PROGRESS' || isProcessingStep || isActionExecutingRef.current) {
      return;
    }

    const currentMatch = matchIdRef.current;
    const activePlayer = gameState.activePlayer;
    let effectivePlayerId: PlayerId = activePlayer;
    let effectiveIsAI = activePlayer === 'PLAYER_A' ? playerAIsAI : playerBIsAI;

    if (gameState.phase === 'GUARD_STEP' && gameState.pendingCombat) {
      effectivePlayerId = engine.getOpponent(gameState, gameState.pendingCombat.attackerPlayerId).playerId;
      effectiveIsAI = effectivePlayerId === 'PLAYER_A' ? playerAIsAI : playerBIsAI;
    } else if (gameState.phase === 'RUNE_STEP' && gameState.pendingTrigger) {
      effectivePlayerId = gameState.pendingTrigger.triggeringPlayerId;
      effectiveIsAI = effectivePlayerId === 'PLAYER_A' ? playerAIsAI : playerBIsAI;
    }

    if (!effectiveIsAI) return;

    isActionExecutingRef.current = true;
    setIsProcessingStep(true);

    try {
      const currentLegal = engine.getLegalActions(gameState);
      if (currentLegal.length === 0) return;

      const decision = await aiService.getDecision(
        gameState,
        currentLegal,
        effectivePlayerId,
        useGeminiForAI
      );

      if (matchIdRef.current !== currentMatch) return;

      setLatestAIDecision(decision);

      const { nextState, log } = engine.step(gameState, decision.selectedAction);
      verifyGameInvariants(nextState, `AI_Action_${decision.selectedAction.type}`);

      triggerActionFeedback(decision.selectedAction, gameState, nextState);
      setGameState(nextState);
      setGameLogs((prev) => [...prev, log]);

      const nextActions = engine.getLegalActions(nextState);
      setLegalActions(nextActions);
    } catch (err) {
      console.error('AI Turn Error:', err);
    } finally {
      isActionExecutingRef.current = false;
      setIsProcessingStep(false);
    }
  };

  // Auto trigger AI turns
  useEffect(() => {
    if (!gameState || gameState.gameStatus !== 'IN_PROGRESS' || isProcessingStep) return;

    let isCurrentAI = gameState.activePlayer === 'PLAYER_A' ? playerAIsAI : playerBIsAI;

    if (gameState.phase === 'GUARD_STEP' && gameState.pendingCombat) {
      const defPlayer = engine.getOpponent(gameState, gameState.pendingCombat.attackerPlayerId).playerId;
      isCurrentAI = defPlayer === 'PLAYER_A' ? playerAIsAI : playerBIsAI;
    } else if (gameState.phase === 'RUNE_STEP' && gameState.pendingTrigger) {
      const runePlayer = gameState.pendingTrigger.triggeringPlayerId;
      isCurrentAI = runePlayer === 'PLAYER_A' ? playerAIsAI : playerBIsAI;
    }

    if (isCurrentAI && isAutoPlaying) {
      const timer = setTimeout(() => {
        executeAITurn();
      }, 450);
      return () => clearTimeout(timer);
    }
  }, [gameState, isAutoPlaying, playerAIsAI, playerBIsAI]);

  // Pointer drag handlers with capture and threshold
  const handlePointerDown = (
    e: React.PointerEvent,
    card: CardData | CardInstance,
    source: 'HAND' | 'PLAYER_UNIT' | 'GUARD_UNIT'
  ) => {
    if (!isHumanTurn || isProcessingStep) return;

    dragPointerIdRef.current = e.pointerId;
    try {
      (e.currentTarget as HTMLElement)?.setPointerCapture?.(e.pointerId);
    } catch {}

    setDragState({
      card,
      source,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: false,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;

    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    const distance = Math.hypot(dx, dy);

    // 12px threshold to distinguish deliberate drag from slight finger wobble
    if (distance >= 12 || dragState.isDragging) {
      setDragState((prev) =>
        prev ? { ...prev, currentX: e.clientX, currentY: e.clientY, isDragging: true } : null
      );

      const elem = document.elementFromPoint(e.clientX, e.clientY);
      if (elem) {
        const dropZoneElem = elem.closest('[data-dropzone]');
        if (dropZoneElem) {
          const zoneId = dropZoneElem.getAttribute('data-dropzone');
          setHoveredDropZone(zoneId);
          return;
        }
      }
      setHoveredDropZone(null);
    }
  };

  const handlePointerUp = (e?: React.PointerEvent) => {
    if (e && dragPointerIdRef.current !== null) {
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {}
      dragPointerIdRef.current = null;
    }

    if (!dragState) return;

    const { card, source, isDragging } = dragState;
    const cardInstId = 'instanceId' in card ? card.instanceId : undefined;

    if (isDragging && cardInstId) {
      // Mark timestamp so subsequent click events are safely suppressed
      lastDragEndTimeRef.current = Date.now();

      // 1. Hand card drop
      if (source === 'HAND') {
        if (gameState?.phase === 'ARCANA' && (hoveredDropZone === 'ARCANA_ZONE' || hoveredDropZone === 'PLAYER_ARCANA')) {
          const arcAction = legalActions.find(
            (a) => a.action.type === 'SET_ARCANA' && (a.action.payload as any)?.cardInstanceId === cardInstId
          );
          if (arcAction) {
            handleExecuteAction(arcAction.action);
            setDragState(null);
            setHoveredDropZone(null);
            return;
          }
        }

        if (gameState?.phase === 'ACTION' && hoveredDropZone === 'PLAYER_BATTLEFIELD') {
          const playAction = legalActions.find(
            (a) =>
              (a.action.type === 'PLAY_UNIT' ||
                a.action.type === 'PLAY_SPELL' ||
                a.action.type === 'SET_RUNE' ||
                a.action.type === 'PLAY_DOMAIN') &&
              (a.action.payload as any)?.cardInstanceId === cardInstId
          );
          if (playAction) {
            handleExecuteAction(playAction.action);
            setDragState(null);
            setHoveredDropZone(null);
            return;
          }
        }

        if (gameState?.phase === 'ACTION' && hoveredDropZone?.startsWith('UNIT_A_')) {
          const baseUnitInstId = hoveredDropZone.replace('UNIT_A_', '');
          const evolveAction = legalActions.find(
            (a) =>
              a.action.type === 'EVOLVE' &&
              (a.action.payload as any)?.cardInstanceId === cardInstId &&
              (a.action.payload as any)?.baseUnitInstanceId === baseUnitInstId
          );
          if (evolveAction) {
            handleExecuteAction(evolveAction.action);
            setDragState(null);
            setHoveredDropZone(null);
            return;
          }
        }
      }

      // 2. Unit attack drop
      if (source === 'PLAYER_UNIT') {
        if (hoveredDropZone === 'OPPONENT_LEADER' || hoveredDropZone === 'OPPONENT_HP') {
          const leaderAttack = legalActions.find(
            (a) =>
              a.action.type === 'ATTACK' &&
              (a.action.payload as any)?.attackerInstanceId === cardInstId &&
              (a.action.payload as any)?.targetType === 'PLAYER'
          );
          if (leaderAttack) {
            handleExecuteAction(leaderAttack.action);
            setDragState(null);
            setHoveredDropZone(null);
            return;
          }
        }

        if (hoveredDropZone?.startsWith('UNIT_B_')) {
          const targetUnitInstId = hoveredDropZone.replace('UNIT_B_', '');
          const unitAttack = legalActions.find(
            (a) =>
              a.action.type === 'ATTACK' &&
              (a.action.payload as any)?.attackerInstanceId === cardInstId &&
              (a.action.payload as any)?.targetType === 'UNIT' &&
              (a.action.payload as any)?.targetUnitInstanceId === targetUnitInstId
          );
          if (unitAttack) {
            handleExecuteAction(unitAttack.action);
            setDragState(null);
            setHoveredDropZone(null);
            return;
          }
        }
      }

      // 3. Guard unit drop
      if (source === 'GUARD_UNIT') {
        if (hoveredDropZone === 'COMBAT_ZONE' || hoveredDropZone === 'OPPONENT_BATTLEFIELD') {
          const guardAction = legalActions.find(
            (a) =>
              a.action.type === 'GUARD' &&
              (a.action.payload as any)?.guardInstanceId === cardInstId &&
              (a.action.payload as any)?.doGuard === true
          );
          if (guardAction) {
            handleExecuteAction(guardAction.action);
            setDragState(null);
            setHoveredDropZone(null);
            return;
          }
        }
      }
    }

    setDragState(null);
    setHoveredDropZone(null);
  };

  const handlePointerCancel = (e?: React.PointerEvent) => {
    if (e && dragPointerIdRef.current !== null) {
      try {
        (e.currentTarget as HTMLElement)?.releasePointerCapture?.(e.pointerId);
      } catch {}
      dragPointerIdRef.current = null;
    }
    setDragState(null);
    setHoveredDropZone(null);
  };

  if (!gameState) {
    return (
      <div className="h-full w-full flex items-center justify-center text-stone-400 bg-stone-950">
        対戦画面を構築中...
      </div>
    );
  }

  const pA = gameState.playerA;
  const pB = gameState.playerB;
  const activeArcanaCountA = pA.arcana.filter((a) => !a.isRested).length;
  const activeArcanaCountB = pB.arcana.filter((a) => !a.isRested).length;

  let respondingPlayerId = gameState.activePlayer;
  if (gameState.phase === 'GUARD_STEP' && gameState.pendingCombat) {
    respondingPlayerId = engine.getOpponent(gameState, gameState.pendingCombat.attackerPlayerId).playerId;
  } else if (gameState.phase === 'RUNE_STEP' && gameState.pendingTrigger) {
    respondingPlayerId = gameState.pendingTrigger.triggeringPlayerId;
  }
  const isHumanTurn = respondingPlayerId === 'PLAYER_A' ? !playerAIsAI : !playerBIsAI;

  const legalAttacksForSelectedAttacker = legalActions.filter(
    (leg) =>
      leg.action.type === 'ATTACK' &&
      (leg.action.payload as any)?.attackerInstanceId === selectedAttackerInstanceId
  );
  const canAttackOpponentLeader = legalAttacksForSelectedAttacker.some(
    (a) => (a.action.payload as any)?.targetType === 'PLAYER'
  );

  const passAction = legalActions.find((a) => a.category === 'PASS');
  const canPlaceArcana =
    gameState.phase === 'ARCANA' &&
    isHumanTurn &&
    legalActions.some((a) => a.action.type === 'SET_ARCANA');

  return (
    <div
      id="game-board-container"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="h-[100dvh] w-screen flex flex-col justify-between bg-stone-950 text-stone-100 overflow-hidden relative select-none"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* ============================================================ */}
      {/* 1. TOP OPPONENT AREA: Minimal HUD + Quick Menu Trigger */}
      {/* ============================================================ */}
      <div className="w-full shrink-0 flex items-center justify-between px-2 pt-1 pb-0.5 z-20">
        <div className="flex-1 max-w-2xl">
          <PlayerHUD
            player={pB}
            isOpponent={true}
            isAI={playerBIsAI}
            activeArcanaCount={activeArcanaCountB}
            isTargetableForAttack={canAttackOpponentLeader}
            isHoveredDropZone={hoveredDropZone === 'OPPONENT_LEADER'}
            onOpenArchive={() => setArchiveModalTarget('B')}
            onOpenArcana={() => setArcanaModalTarget('B')}
            onInspectCard={(c) => setDetailCard(c)}
            onSelectLeaderAttack={() => {
              const attackLeader = legalAttacksForSelectedAttacker.find(
                (a) => (a.action.payload as any)?.targetType === 'PLAYER'
              );
              if (attackLeader) handleExecuteAction(attackLeader.action);
            }}
          />
        </div>

        {/* Top Right Quick Menu & Auto Battle Toggle */}
        <div className="flex items-center gap-1.5 ml-2">
          <button
            onClick={() => setIsAutoPlaying(!isAutoPlaying)}
            className={`px-2.5 py-1 rounded-full text-xs font-black flex items-center gap-1 border transition-all ${
              isAutoPlaying
                ? 'bg-emerald-600 text-white border-emerald-400 animate-pulse'
                : 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'
            }`}
            title="AIオート対戦の切り替え"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="text-[11px]">{isAutoPlaying ? 'AUTO中' : 'AUTO'}</span>
          </button>

          <button
            id="open-game-menu-btn"
            onClick={() => setShowMenuModal(true)}
            className="p-1.5 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-700 transition-colors shadow-sm"
            title="対戦メニューを開く"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. OPPONENT BATTLEFIELD (Field B) */}
      {/* ============================================================ */}
      <BattlefieldZone
        units={pB.battlefield}
        isOpponent={true}
        selectedAttackerInstanceId={selectedAttackerInstanceId}
        legalActions={legalActions}
        isHumanTurn={isHumanTurn}
        phase={gameState.phase}
        hoveredDropZone={hoveredDropZone}
        dragSource={dragState?.source}
        onSelectAttacker={setSelectedAttackerInstanceId}
        onInspectCard={(c) => setDetailCard(c)}
        onExecuteAction={handleExecuteAction}
        onPointerDownUnit={(e, u) => handlePointerDown(e, u, 'GUARD_UNIT')}
      />

      {/* ============================================================ */}
      {/* 3. CENTER BATTLE DIVIDER & COMBAT ANIMATIONS */}
      {/* ============================================================ */}
      <CombatOverlay
        gameState={gameState}
        legalActions={legalActions}
        isHumanTurn={isHumanTurn}
        selectedAttackerInstanceId={selectedAttackerInstanceId}
        combatAnimation={combatAnimation}
        onClearAttacker={() => setSelectedAttackerInstanceId(null)}
        onExecuteAction={handleExecuteAction}
      />

      {/* ============================================================ */}
      {/* 4. PLAYER BATTLEFIELD (Field A) */}
      {/* ============================================================ */}
      <BattlefieldZone
        units={pA.battlefield}
        isOpponent={false}
        selectedAttackerInstanceId={selectedAttackerInstanceId}
        legalActions={legalActions}
        isHumanTurn={isHumanTurn}
        phase={gameState.phase}
        hoveredDropZone={hoveredDropZone}
        dragSource={dragState?.source}
        onSelectAttacker={(id) => {
          setSelectedAttackerInstanceId(id);
          setSelectedHandInstanceId(null);
        }}
        onInspectCard={(c) => setDetailCard(c)}
        onExecuteAction={handleExecuteAction}
        onPointerDownUnit={(e, u) =>
          handlePointerDown(e, u, gameState.phase === 'GUARD_STEP' ? 'GUARD_UNIT' : 'PLAYER_UNIT')
        }
      />

      {/* ============================================================ */}
      {/* 5. PLAYER BOTTOM ZONE: Hand, HUD & End Turn Action */}
      {/* ============================================================ */}
      <div className="w-full shrink-0 flex flex-col z-30">
        {/* Dynamic Responsive Hand Zone */}
        <HandZone
          hand={pA.hand}
          selectedHandInstanceId={selectedHandInstanceId}
          legalActions={legalActions}
          phase={gameState.phase}
          isHumanTurn={isHumanTurn}
          onSelectCard={(id) => {
            setSelectedHandInstanceId(id);
            setSelectedAttackerInstanceId(null);
          }}
          onInspectCard={(c) => setDetailCard(c)}
          onExecuteAction={handleExecuteAction}
          onPointerDownCard={(e, card) => handlePointerDown(e, card, 'HAND')}
        />

        {/* Player Bottom HUD Bar */}
        <div className="w-full flex items-center justify-between px-2 sm:px-4 py-1 bg-stone-950/95 border-t border-stone-800/80">
          <div className="flex-1 max-w-3xl">
            <PlayerHUD
              player={pA}
              isOpponent={false}
              isAI={playerAIsAI}
              activeArcanaCount={activeArcanaCountA}
              canPlaceArcana={canPlaceArcana}
              isHoveredDropZone={hoveredDropZone === 'ARCANA_ZONE'}
              onOpenArchive={() => setArchiveModalTarget('A')}
              onOpenArcana={() => {
                if (selectedHandInstanceId && gameState.phase === 'ARCANA') {
                  const arcAction = legalActions.find(
                    (a) =>
                      a.action.type === 'SET_ARCANA' &&
                      (a.action.payload as any)?.cardInstanceId === selectedHandInstanceId
                  );
                  if (arcAction) {
                    handleExecuteAction(arcAction.action);
                    return;
                  }
                }
                setArcanaModalTarget('A');
              }}
              onInspectCard={(c) => setDetailCard(c)}
            />
          </div>

          {/* Prominent End Turn Button at Bottom-Right */}
          <div className="shrink-0 ml-3">
            {passAction && gameState.phase === 'ACTION' && isHumanTurn ? (
              <button
                id="end-turn-btn"
                onClick={() => handleExecuteAction(passAction.action)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs shadow-xl shadow-amber-600/30 border border-amber-300 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <span>ターン終了</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-stone-900/90 border border-stone-800 text-stone-500 font-mono text-[11px]">
                {isHumanTurn ? '待機中' : '相手行動中'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 6. FLOATING DRAG GHOST PREVIEW */}
      {/* ============================================================ */}
      {dragState && dragState.isDragging && (
        <div
          style={{
            position: 'fixed',
            left: dragState.currentX - 45,
            top: dragState.currentY - 75,
            pointerEvents: 'none',
            zIndex: 9999,
          }}
          className="opacity-95 scale-110 shadow-2xl transition-transform drop-shadow-[0_12px_24px_rgba(0,0,0,0.85)] filter brightness-110"
        >
          <CardItem card={dragState.card} size="xs" isInteractive={false} />
        </div>
      )}

      {/* ============================================================ */}
      {/* 7. MODALS & OVERLAYS */}
      {/* ============================================================ */}
      {/* Card Detail Floating Panel with '×' close button */}
      <CardDetailPanel card={detailCard} onClose={() => setDetailCard(null)} />

      {/* Game Menu Modal */}
      <GameMenuModal
        isOpen={showMenuModal}
        onClose={() => setShowMenuModal(false)}
        onResetMatch={() => {
          setShowMenuModal(false);
          startNewMatch();
        }}
        onOpenLogs={() => setShowLogModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onNavigateTab={onNavigateTab}
        isMuted={isMuted}
        onToggleMute={() => {
          const newMuted = audioService.toggleMute();
          setIsMuted(newMuted);
        }}
      />

      {/* Archive Overlay */}
      <ArchiveOverlay
        isOpen={archiveModalTarget !== null}
        onClose={() => setArchiveModalTarget(null)}
        title={archiveModalTarget === 'A' ? `${pA.name} のアーカイブ` : `${pB.name} のアーカイブ`}
        cards={archiveModalTarget === 'A' ? pA.archive : pB.archive}
        onInspectCard={(c) => setDetailCard(c)}
      />

      {/* Arcana Overlay */}
      <ArcanaOverlay
        isOpen={arcanaModalTarget !== null}
        onClose={() => setArcanaModalTarget(null)}
        title={arcanaModalTarget === 'A' ? `${pA.name} のアルカナ` : `${pB.name} のアルカナ`}
        arcanaCards={arcanaModalTarget === 'A' ? pA.arcana : pB.arcana}
        onInspectCard={(c) => setDetailCard(c)}
      />

      {/* Match Log Overlay */}
      <GameLogOverlay
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        logs={gameLogs}
        latestAIDecision={latestAIDecision}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowSettingsModal(false)}
        >
          <div
            className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md p-5 shadow-2xl relative text-stone-100 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                対戦設定 & デッキ選択
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-stone-400 font-bold block mb-1">先攻 (Player 1) デッキ:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={deckAId}
                    onChange={(e) => setDeckAId(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    {allAvailableDecks.map((d) => (
                      <option key={d.deckId} value={d.deckId} className="bg-stone-900">
                        {d.deckName} ({d.deckVersion})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPlayerAIsAI(!playerAIsAI)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                      playerAIsAI
                        ? 'bg-amber-600 text-amber-100 border-amber-500'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    {playerAIsAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    <span>{playerAIsAI ? 'AI操作' : '手動操作'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-stone-400 font-bold block mb-1">後攻 (Player 2) デッキ:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={deckBId}
                    onChange={(e) => setDeckBId(e.target.value)}
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-white font-medium focus:outline-none focus:border-amber-500"
                  >
                    {allAvailableDecks.map((d) => (
                      <option key={d.deckId} value={d.deckId} className="bg-stone-900">
                        {d.deckName} ({d.deckVersion})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setPlayerBIsAI(!playerBIsAI)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 border ${
                      playerBIsAI
                        ? 'bg-sky-600 text-sky-100 border-sky-500'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    {playerBIsAI ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    <span>{playerBIsAI ? 'AI操作' : '手動操作'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-stone-800">
                <div>
                  <span className="font-bold text-stone-300 block">AI思考エンジン</span>
                  <span className="text-[10px] text-stone-500">
                    {useGeminiForAI ? 'Gemini 3.7 Flashによる推論' : '高速ルールベース評価器'}
                  </span>
                </div>
                <button
                  onClick={() => setUseGeminiForAI(!useGeminiForAI)}
                  className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 border ${
                    useGeminiForAI
                      ? 'bg-purple-900 text-purple-200 border-purple-500'
                      : 'bg-stone-800 text-stone-400 border-stone-700'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{useGeminiForAI ? 'Gemini 3.7' : 'Heuristic'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-800">
              <button
                onClick={() => {
                  startNewMatch();
                  setShowSettingsModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs"
              >
                設定を適用して再開
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
