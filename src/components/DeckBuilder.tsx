import React, { useState, useMemo, useRef, useEffect } from 'react';
import { CardData, Deck, FactionCode, CardType } from '../types/game';
import { ALL_CARDS, CARD_POOL_VERSION, getCardById } from '../data/cards';
import { PRESET_DECKS, validateDeck } from '../data/presetDecks';
import { CardItem } from './CardItem';
import {
  Plus,
  Minus,
  Save,
  Download,
  Upload,
  BarChart2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Play,
  Copy,
  Edit3,
  Search,
  Filter,
  RotateCcw,
  Sparkles,
  Layers,
  Swords,
  Shield,
  Heart,
  X,
  FileText,
  ChevronDown,
  Info,
  SlidersHorizontal,
} from 'lucide-react';

interface DeckBuilderProps {
  onInspectCard: (card: CardData) => void;
  onSaveCustomDeck: (deck: Deck) => void;
  onDeleteCustomDeck?: (deckId: string) => void;
  onDuplicateDeck?: (deck: Deck) => void;
  onTestDeck: (deck: Deck) => void;
  onStartBattleWithDeck?: (deck: Deck) => void;
  customDecks: Deck[];
}

type MobileTab = 'POOL' | 'DECK' | 'MANAGE' | 'ANALYSIS';
type SortOption = 'COST_ASC' | 'COST_DESC' | 'NAME_ASC' | 'COUNT_DESC' | 'TYPE';

export const DeckBuilder: React.FC<DeckBuilderProps> = ({
  onInspectCard,
  onSaveCustomDeck,
  onDeleteCustomDeck,
  onDuplicateDeck,
  onTestDeck,
  onStartBattleWithDeck,
  customDecks,
}) => {
  const allDecks = useMemo(() => [...customDecks, ...PRESET_DECKS], [customDecks]);

  // Active Deck ID being edited
  const [activeDeckId, setActiveDeckId] = useState<string>(() => {
    if (customDecks.length > 0) return customDecks[0].deckId;
    return PRESET_DECKS[0].deckId;
  });

  // Current Deck Form State
  const [deckName, setDeckName] = useState<string>('新規カスタムデッキ');
  const [deckFaction, setDeckFaction] = useState<FactionCode>('RED');
  const [deckVersion, setDeckVersion] = useState<string>('v1.0');
  const [deckCards, setDeckCards] = useState<string[]>([]);
  const [deckCreatedAt, setDeckCreatedAt] = useState<string>('');
  const [deckDescription, setDeckDescription] = useState<string>('');
  const [isPresetSource, setIsPresetSource] = useState<boolean>(false);

  // Initial snapshot to track dirty state
  const initialSnapshotRef = useRef<{
    name: string;
    faction: FactionCode;
    version: string;
    cards: string[];
    description: string;
  }>({
    name: '',
    faction: 'RED',
    version: 'v1.0',
    cards: [],
    description: '',
  });

  // Mobile navigation tab
  const [mobileTab, setMobileTab] = useState<MobileTab>('POOL');

  // Filters & Search
  const [filterFaction, setFilterFaction] = useState<FactionCode | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCost, setFilterCost] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('COST_ASC');

  // Inspected Card Detail in Builder
  const [selectedCardForModal, setSelectedCardForModal] = useState<CardData | null>(null);

  // Feedback Notifications
  const [notification, setNotification] = useState<{
    message: string;
    type: 'SUCCESS' | 'ERROR' | 'INFO';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'SUCCESS') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 3200);
  };

  const generateNewDeckId = () => {
    return `deck_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  };

  // Load a deck into the active editor
  const loadDeckIntoEditor = (deck: Deck, isPreset: boolean = false) => {
    // Sanitize cards by verifying card ID exists in card pool
    const sanitizedCards = (deck.cards || []).filter((cid) => getCardById(cid) !== undefined);

    setActiveDeckId(deck.deckId);
    setDeckName(deck.deckName);
    setDeckFaction(deck.faction);
    setDeckVersion(deck.deckVersion || 'v1.0');
    setDeckCards(sanitizedCards);
    setDeckCreatedAt(deck.createdAt || new Date().toISOString());
    setDeckDescription(deck.description || '');
    setIsPresetSource(isPreset);

    initialSnapshotRef.current = {
      name: deck.deckName,
      faction: deck.faction,
      version: deck.deckVersion || 'v1.0',
      cards: [...sanitizedCards],
      description: deck.description || '',
    };
  };

  // Initial load
  useEffect(() => {
    const target = allDecks.find((d) => d.deckId === activeDeckId) || allDecks[0];
    if (target) {
      const isPreset = PRESET_DECKS.some((p) => p.deckId === target.deckId);
      loadDeckIntoEditor(target, isPreset);
    }
  }, []);

  // Handle deck selection change from dropdown / list
  const handleSelectDeck = (deckId: string) => {
    if (isDirty) {
      if (!window.confirm('未保存の変更があります。変更を破棄して別のデッキを読み込みますか？')) {
        return;
      }
    }
    const found = allDecks.find((d) => d.deckId === deckId);
    if (found) {
      const isPreset = PRESET_DECKS.some((p) => p.deckId === found.deckId);
      loadDeckIntoEditor(found, isPreset);
      showNotification(`デッキ「${found.deckName}」を読み込みました。`, 'INFO');
    }
  };

  // Create brand new custom deck
  const handleCreateNewDeck = (templateCards: string[] = []) => {
    if (isDirty) {
      if (!window.confirm('未保存の変更があります。現在の編集を破棄して新規デッキを作成しますか？')) {
        return;
      }
    }
    const newId = generateNewDeckId();
    const now = new Date().toISOString();
    const defaultCards = templateCards.length > 0 ? [...templateCards] : [...PRESET_DECKS[0].cards];

    const newDeck: Deck = {
      deckId: newId,
      deckName: '新規カスタムデッキ',
      faction: 'RED',
      cards: defaultCards,
      deckVersion: 'v1.0',
      cardPoolVersion: CARD_POOL_VERSION,
      createdAt: now,
      updatedAt: now,
      description: '',
    };

    loadDeckIntoEditor(newDeck, false);
    showNotification('新しいデッキを作成しました。カードを追加・編集してください。', 'INFO');
  };

  // Copy preset as a new editable custom deck
  const handleCopyPresetAsCustom = (preset: Deck) => {
    const newId = generateNewDeckId();
    const now = new Date().toISOString();
    const newDeck: Deck = {
      ...preset,
      deckId: newId,
      deckName: `${preset.deckName} (カスタム)`,
      cards: [...preset.cards],
      createdAt: now,
      updatedAt: now,
      description: preset.description ? `${preset.description} [編集版]` : '',
    };

    onSaveCustomDeck(newDeck);
    loadDeckIntoEditor(newDeck, false);
    showNotification(`プリセット「${preset.deckName}」をマイデッキとして複製・読み込みました。`, 'SUCCESS');
  };

  // Duplicate current or selected deck
  const handleDuplicateDeckAction = (source: Deck) => {
    const newId = generateNewDeckId();
    const now = new Date().toISOString();
    const newDeck: Deck = {
      ...source,
      deckId: newId,
      deckName: `${source.deckName} (複製)`,
      cards: [...source.cards],
      createdAt: now,
      updatedAt: now,
    };

    onSaveCustomDeck(newDeck);
    loadDeckIntoEditor(newDeck, false);
    showNotification(`デッキ「${source.deckName}」を複製しました。`, 'SUCCESS');
  };

  // Delete current or custom deck
  const handleDeleteDeckAction = (deckIdToDelete: string) => {
    const targetDeck = customDecks.find((d) => d.deckId === deckIdToDelete);
    if (!targetDeck) {
      showNotification('公式プリセットデッキは削除できません。', 'ERROR');
      return;
    }

    if (window.confirm(`マイデッキ「${targetDeck.deckName}」を削除しますか？この操作は取り消せません。`)) {
      if (onDeleteCustomDeck) {
        onDeleteCustomDeck(deckIdToDelete);
      }
      showNotification(`デッキ「${targetDeck.deckName}」を削除しました。`, 'INFO');

      // If we deleted the active deck, load the next available deck
      const remainingCustom = customDecks.filter((d) => d.deckId !== deckIdToDelete);
      if (remainingCustom.length > 0) {
        loadDeckIntoEditor(remainingCustom[0], false);
      } else {
        loadDeckIntoEditor(PRESET_DECKS[0], true);
      }
    }
  };

  // Calculate adoption count per card in active deck
  const cardCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cardId of deckCards) {
      counts[cardId] = (counts[cardId] || 0) + 1;
    }
    return counts;
  }, [deckCards]);

  // Check dirty state
  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current;
    if (deckName !== snap.name) return true;
    if (deckFaction !== snap.faction) return true;
    if (deckVersion !== snap.version) return true;
    if (deckDescription !== snap.description) return true;
    if (deckCards.length !== snap.cards.length) return true;

    const curCounts: Record<string, number> = {};
    for (const c of deckCards) curCounts[c] = (curCounts[c] || 0) + 1;
    const snapCounts: Record<string, number> = {};
    for (const c of snap.cards) snapCounts[c] = (snapCounts[c] || 0) + 1;

    const allKeys = new Set([...Object.keys(curCounts), ...Object.keys(snapCounts)]);
    for (const k of allKeys) {
      if ((curCounts[k] || 0) !== (snapCounts[k] || 0)) return true;
    }
    return false;
  }, [deckName, deckFaction, deckVersion, deckDescription, deckCards]);

  // Current deck object
  const currentDeckObj: Deck = useMemo(() => {
    return {
      deckId: activeDeckId || generateNewDeckId(),
      deckName: deckName.trim() || '名称未設定デッキ',
      faction: deckFaction,
      cards: [...deckCards],
      deckVersion: deckVersion.trim() || 'v1.0',
      cardPoolVersion: CARD_POOL_VERSION,
      createdAt: deckCreatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: deckDescription,
    };
  }, [activeDeckId, deckName, deckFaction, deckCards, deckVersion, deckCreatedAt, deckDescription]);

  const validation = useMemo(() => validateDeck(currentDeckObj), [currentDeckObj]);

  // Save current deck
  const handleSaveDeck = () => {
    if (!validation.valid) {
      showNotification(`デッキを保存できません: ${validation.errors.join(', ')}`, 'ERROR');
      return;
    }

    let deckToSave = currentDeckObj;
    // If the user modified a preset deck, generate a custom deck ID so preset remains intact
    if (isPresetSource) {
      const newCustomId = generateNewDeckId();
      deckToSave = {
        ...currentDeckObj,
        deckId: newCustomId,
        deckName: `${deckName} (カスタム)`,
      };
      setActiveDeckId(newCustomId);
      setIsPresetSource(false);
    }

    onSaveCustomDeck(deckToSave);

    initialSnapshotRef.current = {
      name: deckToSave.deckName,
      faction: deckToSave.faction,
      version: deckToSave.deckVersion,
      cards: [...deckToSave.cards],
      description: deckToSave.description || '',
    };

    showNotification(`デッキ「${deckToSave.deckName}」を保存しました！`, 'SUCCESS');
  };

  // Revert changes
  const handleRevert = () => {
    if (window.confirm('最後に保存した状態に戻しますか？未保存の編集内容は破棄されます。')) {
      const snap = initialSnapshotRef.current;
      setDeckName(snap.name);
      setDeckFaction(snap.faction);
      setDeckVersion(snap.version);
      setDeckCards([...snap.cards]);
      setDeckDescription(snap.description);
      showNotification('変更を破棄して前回の保存状態に戻しました。', 'INFO');
    }
  };

  // Clear all cards
  const handleClearAllCards = () => {
    if (window.confirm('デッキのカードをすべて削除して空にしますか？')) {
      setDeckCards([]);
      showNotification('デッキの全カードを削除しました。', 'INFO');
    }
  };

  // Add card to deck (max 4 per card, max 40 in deck)
  const handleAddCard = (cardId: string, amount: number = 1) => {
    const currentCount = cardCounts[cardId] || 0;
    const canAdd = Math.min(amount, 4 - currentCount, 40 - deckCards.length);
    if (canAdd <= 0) {
      if (deckCards.length >= 40) {
        showNotification('デッキは最大40枚です。', 'ERROR');
      } else if (currentCount >= 4) {
        showNotification('同名カードは最大4枚までです。', 'ERROR');
      }
      return;
    }

    const toAdd = Array(canAdd).fill(cardId);
    setDeckCards((prev) => [...prev, ...toAdd]);
  };

  // Remove card from deck
  const handleRemoveCard = (cardId: string, amount: number = 1) => {
    let toRemove = amount;
    setDeckCards((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0 && toRemove > 0; i--) {
        if (updated[i] === cardId) {
          updated.splice(i, 1);
          toRemove--;
        }
      }
      return updated;
    });
  };

  // Export JSON
  const handleExportJSON = (targetDeck: Deck = currentDeckObj) => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetDeck, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${targetDeck.deckName}_${targetDeck.deckVersion}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification(`デッキ「${targetDeck.deckName}」をJSON出力しました。`, 'SUCCESS');
  };

  // Import JSON
  const handleImportJSONClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed || typeof parsed !== 'object') throw new Error('不正なJSON形式です。');
        if (!Array.isArray(parsed.cards)) throw new Error('cardsフィールドが配列ではありません。');

        const validCards = parsed.cards.filter(
          (cid: any) => typeof cid === 'string' && getCardById(cid) !== undefined
        );
        if (validCards.length === 0) throw new Error('有効なカードIDが含まれていません。');

        const newDeck: Deck = {
          deckId: generateNewDeckId(),
          deckName:
            typeof parsed.deckName === 'string'
              ? `${parsed.deckName} (インポート)`
              : 'インポートデッキ',
          faction: (['RED', 'BLUE', 'GREEN', 'HOLY', 'DARK', 'NEUTRAL'].includes(parsed.faction)
            ? parsed.faction
            : 'RED') as FactionCode,
          cards: validCards,
          deckVersion: typeof parsed.deckVersion === 'string' ? parsed.deckVersion : 'v1.0',
          cardPoolVersion: CARD_POOL_VERSION,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description:
            typeof parsed.description === 'string'
              ? parsed.description
              : 'JSONファイルからインポート',
        };

        onSaveCustomDeck(newDeck);
        loadDeckIntoEditor(newDeck, false);
        showNotification(`デッキ「${newDeck.deckName}」をインポートして読み込みました！`, 'SUCCESS');
      } catch (err: any) {
        showNotification(`インポート失敗: ${err.message || 'ファイルが壊れています'}`, 'ERROR');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // Filtered & Sorted Card Pool
  const filteredAndSortedPool = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = ALL_CARDS.filter((card) => {
      if (filterFaction !== 'ALL' && card.faction !== filterFaction) return false;
      if (filterType !== 'ALL' && card.cardType !== filterType) return false;
      if (filterCost !== 'ALL') {
        if (filterCost === '7+' && card.cost < 7) return false;
        if (filterCost !== '7+' && card.cost.toString() !== filterCost) return false;
      }
      if (q) {
        const matchName = card.name.toLowerCase().includes(q);
        const matchEffects = card.effectsText ? card.effectsText.toLowerCase().includes(q) : false;
        const matchRace = card.raceName ? card.raceName.toLowerCase().includes(q) : false;
        const matchClass = card.classification ? card.classification.toLowerCase().includes(q) : false;
        const matchType = card.cardType.toLowerCase().includes(q);
        const matchFaction = card.factionName.toLowerCase().includes(q);
        const matchId = card.cardId.toLowerCase().includes(q);
        return matchName || matchEffects || matchRace || matchClass || matchType || matchFaction || matchId;
      }
      return true;
    });

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'COST_ASC':
          return a.cost - b.cost || a.name.localeCompare(b.name, 'ja');
        case 'COST_DESC':
          return b.cost - a.cost || a.name.localeCompare(b.name, 'ja');
        case 'NAME_ASC':
          return a.name.localeCompare(b.name, 'ja');
        case 'COUNT_DESC':
          const countA = cardCounts[a.cardId] || 0;
          const countB = cardCounts[b.cardId] || 0;
          return countB - countA || a.cost - b.cost;
        case 'TYPE':
          return a.cardType.localeCompare(b.cardType) || a.cost - b.cost;
        default:
          return a.cost - b.cost;
      }
    });
  }, [searchQuery, filterFaction, filterType, filterCost, sortBy, cardCounts]);

  // Deck Analytics
  const analytics = useMemo(() => {
    const manaCurve: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    let unitCount = 0;
    let evolveCount = 0;
    let spellCount = 0;
    let runeCount = 0;
    let domainCount = 0;

    let totalCost = 0;
    let totalAtk = 0;
    let totalDef = 0;
    let totalBrk = 0;
    let unitTotal = 0;

    for (const cardId of deckCards) {
      const card = getCardById(cardId);
      if (!card) continue;

      const costKey = Math.min(Math.max(card.cost, 1), 7);
      manaCurve[costKey] = (manaCurve[costKey] || 0) + 1;
      totalCost += card.cost;

      if (card.cardType === 'UNIT') {
        unitCount++;
        unitTotal++;
        totalAtk += card.atk;
        totalDef += card.def;
        totalBrk += card.brk;
      } else if (card.cardType === 'EVOLVE_UNIT') {
        evolveCount++;
        unitTotal++;
        totalAtk += card.atk;
        totalDef += card.def;
        totalBrk += card.brk;
      } else if (card.cardType === 'SPELL') {
        spellCount++;
      } else if (card.cardType === 'RUNE') {
        runeCount++;
      } else if (card.cardType === 'DOMAIN') {
        domainCount++;
      }
    }

    const total = deckCards.length || 1;
    const avgCost = (totalCost / total).toFixed(2);
    const avgAtk = unitTotal > 0 ? (totalAtk / unitTotal).toFixed(1) : '-';
    const avgDef = unitTotal > 0 ? (totalDef / unitTotal).toFixed(1) : '-';
    const avgBrk = unitTotal > 0 ? (totalBrk / unitTotal).toFixed(1) : '-';
    const maxCurve = Math.max(...Object.values(manaCurve), 1);

    return {
      manaCurve,
      unitCount,
      evolveCount,
      spellCount,
      runeCount,
      domainCount,
      avgCost,
      avgAtk,
      avgDef,
      avgBrk,
      maxCurve,
    };
  }, [deckCards]);

  return (
    <div id="integrated-deck-builder" className="max-w-7xl mx-auto space-y-3 animate-fade-in pb-8">
      {/* Hidden File Input for JSON Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImport}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Top Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-fade-in border ${
            notification.type === 'SUCCESS'
              ? 'bg-emerald-950/95 border-emerald-500 text-emerald-200'
              : notification.type === 'ERROR'
              ? 'bg-rose-950/95 border-rose-500 text-rose-200'
              : 'bg-stone-900/95 border-stone-600 text-stone-200'
          }`}
        >
          {notification.type === 'SUCCESS' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : notification.type === 'ERROR' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. TOP HEADER & DECK SELECTION WORKSPACE BAR */}
      {/* ============================================================ */}
      <div className="bg-stone-900/95 border border-stone-800 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Deck Selector Dropdown & Quick Actions */}
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-[280px]">
            <select
              value={activeDeckId}
              onChange={(e) => handleSelectDeck(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 hover:border-amber-500 focus:border-amber-500 rounded-xl pl-3 pr-8 py-1.5 text-xs font-black text-white appearance-none cursor-pointer"
            >
              <optgroup label="マイデッキ (カスタム)">
                {customDecks.map((d) => (
                  <option key={d.deckId} value={d.deckId}>
                    {d.deckName} ({d.deckVersion || 'v1.0'}) [{d.cards.length}枚]
                  </option>
                ))}
              </optgroup>
              <optgroup label="公式プリセット">
                {PRESET_DECKS.map((p) => (
                  <option key={p.deckId} value={p.deckId}>
                    [公式] {p.deckName} ({p.deckVersion})
                  </option>
                ))}
              </optgroup>
            </select>
            <ChevronDown className="w-4 h-4 text-stone-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => handleCreateNewDeck()}
            className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-amber-400 hover:text-amber-300 border border-stone-800 hover:border-amber-500/80 transition-colors shadow-xs"
            title="新しい空のデッキを作成"
          >
            <Plus className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleDuplicateDeckAction(currentDeckObj)}
            className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors shadow-xs"
            title="現在のデッキを複製"
          >
            <Copy className="w-4 h-4" />
          </button>

          {!isPresetSource && customDecks.some((d) => d.deckId === activeDeckId) && (
            <button
              onClick={() => handleDeleteDeckAction(activeDeckId)}
              className="p-1.5 rounded-xl bg-stone-950 hover:bg-rose-950 text-stone-400 hover:text-rose-300 border border-stone-800 transition-colors shadow-xs"
              title="このマイデッキを削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleImportJSONClick}
            className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-white border border-stone-800 transition-colors shadow-xs"
            title="JSONファイルをインポート"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>

        {/* Center: Deck Name & Faction Inputs */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="デッキ名..."
            className="bg-stone-950 border border-stone-700 focus:border-amber-500 rounded-xl px-2.5 py-1 text-xs font-black text-white w-36 sm:w-48"
          />

          <select
            value={deckFaction}
            onChange={(e) => setDeckFaction(e.target.value as FactionCode)}
            className="bg-stone-950 border border-stone-700 rounded-xl px-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
          >
            <option value="RED">朱 (Red)</option>
            <option value="BLUE">蒼 (Blue)</option>
            <option value="GREEN">翠 (Green)</option>
            <option value="HOLY">聖 (Holy)</option>
            <option value="DARK">冥 (Dark)</option>
            <option value="NEUTRAL">無/混色</option>
          </select>

          {/* Dirty Status Badge */}
          {isDirty ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500 text-amber-300 text-[10px] font-bold shrink-0 animate-pulse">
              ● 未保存
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-600 text-emerald-300 text-[10px] font-bold shrink-0">
              ✓ 保存済
            </span>
          )}
        </div>

        {/* Right: Save & Battle Action Buttons */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isDirty && (
            <button
              onClick={handleRevert}
              className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-stone-800 transition-colors"
              title="未保存の変更を破棄"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => handleExportJSON(currentDeckObj)}
            className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors"
            title="JSON出力"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleSaveDeck}
            disabled={!validation.valid}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center gap-1 shadow-md disabled:opacity-40 transition-all active:scale-95"
            title="デッキを保存"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>

          <button
            onClick={() => {
              handleSaveDeck();
              if (onStartBattleWithDeck) onStartBattleWithDeck(currentDeckObj);
              else onTestDeck(currentDeckObj);
            }}
            disabled={!validation.valid}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 shadow-md disabled:opacity-40 transition-all active:scale-95"
            title="このデッキで対戦モードを開始"
          >
            <Play className="w-3.5 h-3.5" />
            <span>対戦へ</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. SUB-BAR: CARD COUNT STATUS & MOBILE TAB SWITCHER */}
      {/* ============================================================ */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto min-w-0">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-stone-400 font-bold">デッキ枚数:</span>
            <span
              className={`font-mono font-black text-sm px-2.5 py-0.5 rounded-lg ${
                deckCards.length === 40
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-sm'
                  : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}
            >
              {deckCards.length} / 40
            </span>
          </div>

          {validation.valid ? (
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px] truncate">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>規定を満たしています (40枚/同名最大4枚)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-400 font-bold text-[11px] truncate">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{validation.errors[0]}</span>
            </div>
          )}
        </div>

        {/* Mobile Tab Switcher */}
        <div className="flex lg:hidden items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 shrink-0">
          <button
            onClick={() => setMobileTab('POOL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'POOL' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            カード一覧
          </button>
          <button
            onClick={() => setMobileTab('DECK')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'DECK' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            デッキ ({deckCards.length})
          </button>
          <button
            onClick={() => setMobileTab('ANALYSIS')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'ANALYSIS'
                ? 'bg-amber-500 text-stone-950'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            分析
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. MAIN WORKSPACE (SIDE-BY-SIDE ON PC, TABBED ON MOBILE) */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* ---------------------------------------------------------- */}
        {/* LEFT COLUMN: ACTIVE DECK LIST & STATS (4 cols on Desktop)  */}
        {/* ---------------------------------------------------------- */}
        <div
          className={`lg:col-span-4 space-y-3.5 ${
            mobileTab === 'POOL' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Adopted Cards Panel */}
          <div
            className={`bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-lg flex flex-col ${
              mobileTab === 'ANALYSIS' ? 'hidden lg:flex' : 'flex'
            } h-[460px] lg:h-[540px]`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
              <span className="text-xs font-black text-stone-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>採用カード ({Object.keys(cardCounts).length}種 / {deckCards.length}枚)</span>
              </span>
              <button
                onClick={handleClearAllCards}
                className="text-[10px] text-stone-500 hover:text-rose-400 transition-colors"
              >
                全解除
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {Object.keys(cardCounts).length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-stone-500 py-16 space-y-2">
                  <Layers className="w-8 h-8 text-stone-700 stroke-1" />
                  <p>右側のカード一覧からカードの「＋」をタップしてデッキへ追加してください</p>
                </div>
              ) : (
                Object.entries(cardCounts)
                  .sort(([idA], [idB]) => {
                    const cA = getCardById(idA);
                    const cB = getCardById(idB);
                    if (!cA || !cB) return 0;
                    return cA.cost - cB.cost || cA.name.localeCompare(cB.name, 'ja');
                  })
                  .map(([cardId, count]) => {
                    const card = getCardById(cardId);
                    if (!card) return null;

                    return (
                      <div
                        key={cardId}
                        className="bg-stone-950/90 hover:bg-stone-950 border border-stone-800/80 hover:border-amber-400/40 rounded-xl p-1.5 flex items-center justify-between gap-1.5 transition-all group"
                      >
                        {/* Cost & Name & Quick Inspect */}
                        <div
                          onClick={() => setSelectedCardForModal(card)}
                          className="flex items-center gap-1.5 flex-1 min-w-0 cursor-pointer"
                        >
                          <span className="w-4 h-4 rounded-full bg-stone-900 border border-amber-500/80 text-[9px] font-black text-amber-300 flex items-center justify-center font-mono shrink-0">
                            {card.cost}
                          </span>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-stone-200 truncate group-hover:text-amber-200">
                              {card.name}
                            </span>
                            <span className="text-[9px] text-stone-500 font-mono">
                              {card.cardType === 'UNIT'
                                ? 'ユニット'
                                : card.cardType === 'EVOLVE_UNIT'
                                ? '進化'
                                : card.cardType === 'SPELL'
                                ? 'スペル'
                                : card.cardType === 'RUNE'
                                ? 'ルーン'
                                : 'ドメイン'}
                            </span>
                          </div>
                        </div>

                        {/* Count Modifiers (+ / -) */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleRemoveCard(cardId, 1)}
                            className="w-5 h-5 rounded-lg bg-stone-900 hover:bg-rose-950 text-stone-400 hover:text-rose-300 border border-stone-800 flex items-center justify-center transition-colors active:scale-95"
                            title="1枚減らす"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="font-mono font-black text-xs w-5 text-center text-amber-300">
                            {count}
                          </span>

                          <button
                            onClick={() => handleAddCard(cardId, 1)}
                            disabled={count >= 4 || deckCards.length >= 40}
                            className="w-5 h-5 rounded-lg bg-stone-900 hover:bg-emerald-950 text-stone-400 hover:text-emerald-300 border border-stone-800 flex items-center justify-center disabled:opacity-30 transition-colors active:scale-95"
                            title="1枚増やす"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Quick Analytics & Mana Curve Panel */}
          <div
            className={`bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-lg space-y-2.5 ${
              mobileTab === 'DECK' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-stone-800">
              <span className="text-xs font-black text-stone-200 flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                <span>デッキ分析 & マナカーブ</span>
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                平均コスト: <strong className="text-amber-300">{analytics.avgCost}</strong>
              </span>
            </div>

            {/* Mana Curve Visual Bars */}
            <div className="grid grid-cols-7 gap-1 items-end h-16 pt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((cost) => {
                const count = analytics.manaCurve[cost] || 0;
                const heightPercent = Math.max((count / analytics.maxCurve) * 100, count > 0 ? 12 : 2);

                return (
                  <div key={cost} className="flex flex-col items-center gap-0.5 h-full justify-end">
                    <span className="text-[9px] font-mono text-stone-400">{count}</span>
                    <div className="w-full bg-stone-950 rounded-t h-full flex items-end overflow-hidden">
                      <div
                        style={{ height: `${heightPercent}%` }}
                        className={`w-full transition-all duration-300 rounded-t ${
                          cost <= 2
                            ? 'bg-emerald-500'
                            : cost <= 4
                            ? 'bg-sky-500'
                            : cost <= 6
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      />
                    </div>
                    <span className="text-[9px] font-mono font-bold text-stone-300">{cost === 7 ? '7+' : cost}</span>
                  </div>
                );
              })}
            </div>

            {/* Breakdown Cards */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px] text-stone-300">
              <div className="bg-stone-950 p-1.5 rounded-lg border border-stone-800 text-center">
                <span className="text-stone-500 block">ユニット</span>
                <strong className="text-white text-xs">{analytics.unitCount + analytics.evolveCount}</strong>
              </div>
              <div className="bg-stone-950 p-1.5 rounded-lg border border-stone-800 text-center">
                <span className="text-stone-500 block">スペル/ルーン</span>
                <strong className="text-white text-xs">{analytics.spellCount + analytics.runeCount}</strong>
              </div>
              <div className="bg-stone-950 p-1.5 rounded-lg border border-stone-800 text-center">
                <span className="text-stone-500 block">平均 ATK/DEF</span>
                <strong className="text-amber-300 text-xs">{analytics.avgAtk} / {analytics.avgDef}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------- */}
        {/* RIGHT COLUMN: CARD MASTER POOL (8 cols on Desktop)         */}
        {/* ---------------------------------------------------------- */}
        <div
          className={`lg:col-span-8 space-y-3 ${
            mobileTab !== 'POOL' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* Card Pool Filters Bar */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-2.5 shadow-lg space-y-2">
            {/* Top Filter Row: Search & Faction Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[160px]">
                <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="カード名、効果、種族、ID検索..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-8 pr-2.5 py-1 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Faction Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {(['ALL', 'RED', 'BLUE', 'GREEN', 'HOLY', 'DARK', 'NEUTRAL'] as const).map((fac) => {
                  const label =
                    fac === 'ALL'
                      ? '全属性'
                      : fac === 'RED'
                      ? '朱'
                      : fac === 'BLUE'
                      ? '蒼'
                      : fac === 'GREEN'
                      ? '翠'
                      : fac === 'HOLY'
                      ? '聖'
                      : fac === 'DARK'
                      ? '冥'
                      : '無';

                  return (
                    <button
                      key={fac}
                      onClick={() => setFilterFaction(fac)}
                      className={`px-2 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        filterFaction === fac
                          ? fac === 'RED'
                            ? 'bg-red-600 text-white shadow-sm'
                            : fac === 'BLUE'
                            ? 'bg-sky-600 text-white shadow-sm'
                            : fac === 'GREEN'
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : fac === 'HOLY'
                            ? 'bg-amber-500 text-stone-950 shadow-sm'
                            : fac === 'DARK'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-stone-700 text-white shadow-sm'
                          : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Filter Row: Type, Cost, Sort */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-800/80 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-0.5 text-xs text-stone-200"
                >
                  <option value="ALL">全タイプ</option>
                  <option value="UNIT">ユニット</option>
                  <option value="EVOLVE_UNIT">進化ユニット</option>
                  <option value="SPELL">スペル</option>
                  <option value="RUNE">ルーン</option>
                  <option value="DOMAIN">ドメイン</option>
                </select>

                {/* Cost Filter */}
                <select
                  value={filterCost}
                  onChange={(e) => setFilterCost(e.target.value)}
                  className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-0.5 text-xs text-stone-200"
                >
                  <option value="ALL">全コスト</option>
                  <option value="1">コスト 1</option>
                  <option value="2">コスト 2</option>
                  <option value="3">コスト 3</option>
                  <option value="4">コスト 4</option>
                  <option value="5">コスト 5</option>
                  <option value="6">コスト 6</option>
                  <option value="7+">コスト 7+</option>
                </select>

                {/* Sort Option */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="bg-stone-950 border border-stone-700 rounded-lg px-2 py-0.5 text-xs text-stone-200"
                >
                  <option value="COST_ASC">コスト昇順</option>
                  <option value="COST_DESC">コスト降順</option>
                  <option value="NAME_ASC">名前順</option>
                  <option value="COUNT_DESC">採用枚数順</option>
                  <option value="TYPE">タイプ順</option>
                </select>
              </div>

              <div className="text-[11px] text-stone-400 font-mono">
                表示: <strong className="text-amber-300">{filteredAndSortedPool.length}</strong> 件
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-lg min-h-[460px] lg:min-h-[540px]">
            {filteredAndSortedPool.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-stone-500 space-y-2">
                <Search className="w-8 h-8 text-stone-600 stroke-1" />
                <p className="text-xs">条件に合致するカードが見つかりませんでした。</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3">
                {filteredAndSortedPool.map((card) => {
                  const adoptedCount = cardCounts[card.cardId] || 0;
                  const isMax = adoptedCount >= 4 || deckCards.length >= 40;

                  return (
                    <div
                      key={card.cardId}
                      className="flex flex-col items-center space-y-1 group relative select-none"
                    >
                      {/* Card Visual Item */}
                      <div
                        onClick={() => setSelectedCardForModal(card)}
                        className="cursor-pointer transition-transform duration-150 group-hover:scale-105 active:scale-95"
                      >
                        <CardItem
                          card={card}
                          size="xs"
                          isInteractive={true}
                          onInspect={() => setSelectedCardForModal(card)}
                        />
                      </div>

                      {/* Adoption Badge & Add/Remove Buttons */}
                      <div className="w-full flex items-center justify-between px-0.5 bg-stone-950/95 border border-stone-800 rounded-lg p-0.5 shadow-sm">
                        {/* Decrement Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveCard(card.cardId, 1);
                          }}
                          disabled={adoptedCount === 0}
                          className="w-5 h-5 rounded bg-stone-900 hover:bg-rose-950 text-stone-400 hover:text-rose-300 flex items-center justify-center disabled:opacity-20 active:scale-90 transition-all"
                          title="デッキから1枚削除"
                        >
                          <Minus className="w-3 h-3" />
                        </button>

                        {/* Adopted Count Display */}
                        <span
                          className={`text-[11px] font-mono font-black px-1 ${
                            adoptedCount > 0 ? 'text-amber-300' : 'text-stone-500'
                          }`}
                        >
                          {adoptedCount} / 4
                        </span>

                        {/* Increment Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCard(card.cardId, 1);
                          }}
                          disabled={isMax}
                          className="w-5 h-5 rounded bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center disabled:opacity-20 disabled:bg-stone-800 disabled:text-stone-500 active:scale-90 transition-all shadow-xs"
                          title="デッキへ1枚追加"
                        >
                          <Plus className="w-3 h-3 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. MODAL: CARD DETAIL INSPECT MODAL IN BUILDER               */}
      {/* ============================================================ */}
      {selectedCardForModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs animate-fade-in"
          onClick={() => setSelectedCardForModal(null)}
        >
          <div
            className="bg-stone-900 border-2 border-stone-600 rounded-2xl w-full max-w-sm p-4 shadow-2xl space-y-3 relative text-stone-100 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-stone-950 border border-amber-400 flex items-center justify-center font-black text-amber-300 font-mono text-xs">
                  {selectedCardForModal.cost}
                </span>
                <div>
                  <h3 className="text-sm font-black text-white">{selectedCardForModal.name}</h3>
                  <span className="text-[9px] text-stone-400 font-mono">
                    {selectedCardForModal.cardId} • {selectedCardForModal.factionName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCardForModal(null)}
                className="p-1 rounded-full text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Combat Stats if Unit */}
            {(selectedCardForModal.cardType === 'UNIT' ||
              selectedCardForModal.cardType === 'EVOLVE_UNIT') && (
              <div className="grid grid-cols-3 gap-2 bg-stone-950 p-2 rounded-xl border border-stone-800 text-center font-mono">
                <div>
                  <span className="text-[9px] text-red-400 block font-bold">ATK</span>
                  <span className="text-base font-black text-red-200">{selectedCardForModal.atk}</span>
                </div>
                <div>
                  <span className="text-[9px] text-sky-400 block font-bold">DEF</span>
                  <span className="text-base font-black text-sky-200">{selectedCardForModal.def}</span>
                </div>
                <div>
                  <span className="text-[9px] text-amber-400 block font-bold">BRK</span>
                  <span className="text-base font-black text-amber-200">{selectedCardForModal.brk}</span>
                </div>
              </div>
            )}

            {/* Effects Text */}
            <div className="bg-stone-950 p-2.5 rounded-xl border border-stone-800 text-xs leading-relaxed space-y-1">
              <span className="text-[10px] font-bold text-amber-400 block">カード効果・能力</span>
              <p className="text-stone-200 text-xs leading-relaxed whitespace-pre-wrap">
                {selectedCardForModal.effectsText || '通常効果なし'}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <div className="text-xs text-stone-400 font-mono">
                現在の採用: <strong className="text-amber-300">{cardCounts[selectedCardForModal.cardId] || 0}</strong> / 4枚
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRemoveCard(selectedCardForModal.cardId, 1)}
                  disabled={(cardCounts[selectedCardForModal.cardId] || 0) === 0}
                  className="px-2.5 py-1 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-300 hover:text-rose-200 text-xs font-bold disabled:opacity-30 flex items-center gap-1"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>削除</span>
                </button>

                <button
                  onClick={() => handleAddCard(selectedCardForModal.cardId, 1)}
                  disabled={
                    (cardCounts[selectedCardForModal.cardId] || 0) >= 4 ||
                    deckCards.length >= 40
                  }
                  className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-black disabled:opacity-30 flex items-center gap-1 shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>デッキに追加</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
