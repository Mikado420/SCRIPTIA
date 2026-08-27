import React, { useState, useMemo, useRef } from 'react';
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
  ArrowLeft,
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

type BuilderMobileTab = 'POOL' | 'DECK' | 'ANALYSIS';
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
  // Mode: LIST (Deck manager) or EDIT (Active deck editing)
  const [viewMode, setViewMode] = useState<'LIST' | 'EDIT'>('LIST');

  // Currently Editing Deck States
  const [editingDeckId, setEditingDeckId] = useState<string>('');
  const [deckName, setDeckName] = useState<string>('新規カスタムデッキ');
  const [deckFaction, setDeckFaction] = useState<FactionCode>('RED');
  const [deckVersion, setDeckVersion] = useState<string>('v1.0');
  const [deckCards, setDeckCards] = useState<string[]>([]);
  const [deckCreatedAt, setDeckCreatedAt] = useState<string>('');
  const [deckDescription, setDeckDescription] = useState<string>('');

  // Initial snapshot to accurately track unsaved changes (isDirty)
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

  // Mobile sub-tab in EDIT mode
  const [mobileTab, setMobileTab] = useState<BuilderMobileTab>('POOL');

  // Card Pool Filters & Sort
  const [filterFaction, setFilterFaction] = useState<FactionCode | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterCost, setFilterCost] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('COST_ASC');

  // Feedback notifications
  const [notification, setNotification] = useState<{ message: string; type: 'SUCCESS' | 'ERROR' | 'INFO' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (message: string, type: 'SUCCESS' | 'ERROR' | 'INFO' = 'SUCCESS') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 3000);
  };

  // Helper to generate unique stable deck ID
  const generateNewDeckId = () => {
    return `deck_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  };

  // --------------------------------------------------------------------------
  // Deck Lifecycle Actions
  // --------------------------------------------------------------------------

  // Start new empty/template deck
  const handleCreateNewDeck = (templateCards: string[] = []) => {
    const newId = generateNewDeckId();
    const now = new Date().toISOString();
    const defaultCards = templateCards.length > 0 ? [...templateCards] : [...PRESET_DECKS[0].cards];
    
    setEditingDeckId(newId);
    setDeckName('新規カスタムデッキ');
    setDeckFaction('RED');
    setDeckVersion('v1.0');
    setDeckCards(defaultCards);
    setDeckCreatedAt(now);
    setDeckDescription('');

    initialSnapshotRef.current = {
      name: '新規カスタムデッキ',
      faction: 'RED',
      version: 'v1.0',
      cards: [...defaultCards],
      description: '',
    };

    setViewMode('EDIT');
    setMobileTab('POOL');
  };

  // Open existing custom deck for editing
  const handleOpenEditDeck = (deck: Deck) => {
    setEditingDeckId(deck.deckId);
    setDeckName(deck.deckName);
    setDeckFaction(deck.faction);
    setDeckVersion(deck.deckVersion || 'v1.0');
    setDeckCards([...deck.cards]);
    setDeckCreatedAt(deck.createdAt || new Date().toISOString());
    setDeckDescription(deck.description || '');

    initialSnapshotRef.current = {
      name: deck.deckName,
      faction: deck.faction,
      version: deck.deckVersion || 'v1.0',
      cards: [...deck.cards],
      description: deck.description || '',
    };

    setViewMode('EDIT');
    setMobileTab('POOL');
  };

  // Copy a preset into a brand new editable custom deck
  const handleCopyPreset = (preset: Deck) => {
    const newId = generateNewDeckId();
    const now = new Date().toISOString();
    const newName = `${preset.deckName} (コピー)`;
    
    setEditingDeckId(newId);
    setDeckName(newName);
    setDeckFaction(preset.faction);
    setDeckVersion('v1.0');
    setDeckCards([...preset.cards]);
    setDeckCreatedAt(now);
    setDeckDescription(preset.description ? `${preset.description} [コピー]` : '');

    initialSnapshotRef.current = {
      name: newName,
      faction: preset.faction,
      version: 'v1.0',
      cards: [...preset.cards],
      description: preset.description ? `${preset.description} [コピー]` : '',
    };

    setViewMode('EDIT');
    setMobileTab('POOL');
    showNotification(`プリセット「${preset.deckName}」を新規デッキとして読み込みました。`, 'INFO');
  };

  // Duplicate an existing custom deck
  const handleDuplicateCustomDeck = (source: Deck) => {
    if (onDuplicateDeck) {
      onDuplicateDeck(source);
      showNotification(`デッキ「${source.deckName}」を複製しました。`, 'SUCCESS');
      return;
    }

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
    showNotification(`デッキ「${source.deckName}」を複製しました。`, 'SUCCESS');
  };

  // Delete a custom deck
  const handleDeleteCustomDeck = (deck: Deck) => {
    if (window.confirm(`カスタムデッキ「${deck.deckName}」を削除しますか？この操作は取り消せません。`)) {
      if (onDeleteCustomDeck) {
        onDeleteCustomDeck(deck.deckId);
      }
      showNotification(`デッキ「${deck.deckName}」を削除しました。`, 'INFO');
    }
  };

  // Check if current edit has unsaved changes
  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current;
    if (deckName !== snap.name) return true;
    if (deckFaction !== snap.faction) return true;
    if (deckVersion !== snap.version) return true;
    if (deckDescription !== snap.description) return true;
    if (deckCards.length !== snap.cards.length) return true;
    
    // Compare card frequencies
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

  // Current deck object to save
  const currentDeckObj: Deck = useMemo(() => {
    return {
      deckId: editingDeckId || generateNewDeckId(),
      deckName: deckName.trim() || '名称未設定デッキ',
      faction: deckFaction,
      cards: [...deckCards],
      deckVersion: deckVersion.trim() || 'v1.0',
      cardPoolVersion: CARD_POOL_VERSION,
      createdAt: deckCreatedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      description: deckDescription,
    };
  }, [editingDeckId, deckName, deckFaction, deckCards, deckVersion, deckCreatedAt, deckDescription]);

  const validation = useMemo(() => validateDeck(currentDeckObj), [currentDeckObj]);

  // Save current deck
  const handleSave = () => {
    if (!validation.valid) {
      showNotification(`デッキを保存できません: ${validation.errors.join(', ')}`, 'ERROR');
      return;
    }

    onSaveCustomDeck(currentDeckObj);

    // Update snapshot after successful save so isDirty becomes false
    initialSnapshotRef.current = {
      name: currentDeckObj.deckName,
      faction: currentDeckObj.faction,
      version: currentDeckObj.deckVersion,
      cards: [...currentDeckObj.cards],
      description: currentDeckObj.description || '',
    };

    showNotification(`デッキ「${currentDeckObj.deckName} (${currentDeckObj.deckVersion})」を保存しました。`, 'SUCCESS');
  };

  // Revert changes to last saved state
  const handleRevertChanges = () => {
    if (window.confirm('最後に保存した状態に戻しますか？現在の未保存の編集内容は破棄されます。')) {
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
  const handleClearDeck = () => {
    if (window.confirm('デッキの全カードを削除して空にしますか？')) {
      setDeckCards([]);
      showNotification('デッキの全カードを削除しました。', 'INFO');
    }
  };

  // Return to Deck List with unsaved check
  const handleReturnToList = () => {
    if (isDirty) {
      if (!window.confirm('未保存の変更があります。変更を破棄してデッキ一覧に戻りますか？')) {
        return;
      }
    }
    setViewMode('LIST');
  };

  // --------------------------------------------------------------------------
  // Card Pool & Deck Manipulation
  // --------------------------------------------------------------------------

  // Count copies in current deck
  const cardCounts: Record<string, number> = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const cardId of deckCards) {
      counts[cardId] = (counts[cardId] || 0) + 1;
    }
    return counts;
  }, [deckCards]);

  const addCard = (cardId: string, amount: number = 1) => {
    const currentCount = cardCounts[cardId] || 0;
    const canAdd = Math.min(amount, 4 - currentCount, 40 - deckCards.length);
    if (canAdd <= 0) return;

    const toAdd = Array(canAdd).fill(cardId);
    setDeckCards([...deckCards, ...toAdd]);
  };

  const removeCard = (cardId: string, amount: number = 1) => {
    let toRemove = amount;
    const updated = [...deckCards];
    for (let i = updated.length - 1; i >= 0 && toRemove > 0; i--) {
      if (updated[i] === cardId) {
        updated.splice(i, 1);
        toRemove--;
      }
    }
    setDeckCards(updated);
  };

  // --------------------------------------------------------------------------
  // JSON Export & Import
  // --------------------------------------------------------------------------

  const handleExportJSON = (targetDeck: Deck = currentDeckObj) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(targetDeck, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${targetDeck.deckName}_${targetDeck.deckVersion}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification(`デッキ「${targetDeck.deckName}」をJSON形式でエクスポートしました。`, 'SUCCESS');
  };

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

        // Validation
        if (!parsed || typeof parsed !== 'object') throw new Error('不正なJSON形式です。');
        if (!Array.isArray(parsed.cards)) throw new Error('cardsフィールドが配列ではありません。');

        // Check if cards exist in pool
        const validCards = parsed.cards.filter((cid: any) => typeof cid === 'string' && getCardById(cid) !== undefined);
        if (validCards.length === 0) throw new Error('有効なカードIDが含まれていません。');

        const newDeck: Deck = {
          deckId: generateNewDeckId(),
          deckName: typeof parsed.deckName === 'string' ? `${parsed.deckName} (インポート)` : 'インポートデッキ',
          faction: (['RED', 'BLUE', 'GREEN', 'HOLY', 'DARK', 'NEUTRAL'].includes(parsed.faction)
            ? parsed.faction
            : 'RED') as FactionCode,
          cards: validCards,
          deckVersion: typeof parsed.deckVersion === 'string' ? parsed.deckVersion : 'v1.0',
          cardPoolVersion: CARD_POOL_VERSION,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: typeof parsed.description === 'string' ? parsed.description : 'JSONファイルからインポート',
        };

        onSaveCustomDeck(newDeck);
        showNotification(`デッキ「${newDeck.deckName}」をインポートして保存しました！`, 'SUCCESS');
      } catch (err: any) {
        showNotification(`インポート失敗: ${err.message || 'ファイルが壊れています'}`, 'ERROR');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  // --------------------------------------------------------------------------
  // Filtered & Sorted Card Pool
  // --------------------------------------------------------------------------

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
        return matchName || matchEffects || matchRace || matchClass || matchType || matchFaction;
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

  // --------------------------------------------------------------------------
  // Deck Analytics
  // --------------------------------------------------------------------------

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

  // ==========================================================================
  // RENDER: 1. DECK MANAGER LIST VIEW
  // ==========================================================================
  if (viewMode === 'LIST') {
    return (
      <div id="deck-manager-view" className="max-w-6xl mx-auto space-y-5 animate-fade-in pb-8">
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
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            ) : notification.type === 'ERROR' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Sparkles className="w-4 h-4 text-amber-400" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Header Ribbon & Global Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 rounded-2xl p-4 shadow-lg">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              <span>デッキ構築・デッキ管理</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              保存済みデッキの編集・改良、新規デッキ作成、複製、対戦・検証への連携
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCreateNewDeck()}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>新しいデッキを作成</span>
            </button>

            <button
              onClick={handleImportJSONClick}
              className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              title="JSONファイルを読み込んで新規登録"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden xs:inline">JSONインポート</span>
            </button>
          </div>
        </div>

        {/* Section 1: Saved Custom Decks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>マイデッキ (カスタムデッキ) ({customDecks.length}件)</span>
            </h3>
            <span className="text-[11px] text-stone-500">
              タップして編集・改良できます
            </span>
          </div>

          {customDecks.length === 0 ? (
            <div className="bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-stone-800/80 flex items-center justify-center mx-auto text-stone-500">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-300">保存されたマイデッキはありません</p>
                <p className="text-xs text-stone-500 mt-1">
                  「新しいデッキを作成」または下の「プリセット」をコピーして最初のデッキを構築しましょう。
                </p>
              </div>
              <button
                onClick={() => handleCreateNewDeck()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs inline-flex items-center gap-1.5 shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>新規デッキを作成</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {customDecks.map((deck) => {
                const val = validateDeck(deck);
                const updatedDate = deck.updatedAt
                  ? new Date(deck.updatedAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '未記録';

                return (
                  <div
                    key={deck.deckId}
                    className="bg-stone-900/90 hover:bg-stone-900 border border-stone-800 hover:border-amber-400/60 rounded-2xl p-3.5 shadow-md transition-all flex flex-col justify-between space-y-3 group"
                  >
                    {/* Top Row: Title & Faction */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              deck.faction === 'RED'
                                ? 'bg-red-500'
                                : deck.faction === 'BLUE'
                                ? 'bg-sky-500'
                                : deck.faction === 'GREEN'
                                ? 'bg-emerald-500'
                                : deck.faction === 'HOLY'
                                ? 'bg-amber-300'
                                : deck.faction === 'DARK'
                                ? 'bg-purple-500'
                                : 'bg-stone-400'
                            }`}
                          />
                          <h4 className="font-black text-sm text-white truncate" title={deck.deckName}>
                            {deck.deckName}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-1 font-mono">
                          <span className="text-amber-400 font-bold">{deck.deckVersion || 'v1.0'}</span>
                          <span>•</span>
                          <span>更新: {updatedDate}</span>
                        </div>
                      </div>

                      {/* Card Count Badge */}
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg shrink-0 ${
                          val.valid
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border border-rose-800'
                        }`}
                      >
                        {deck.cards.length} / 40
                      </span>
                    </div>

                    {/* Deck Description */}
                    {deck.description && (
                      <p className="text-[11px] text-stone-400 line-clamp-2 leading-relaxed">
                        {deck.description}
                      </p>
                    )}

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditDeck(deck)}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>編集</span>
                        </button>

                        <button
                          onClick={() => {
                            if (onStartBattleWithDeck) onStartBattleWithDeck(deck);
                            else onTestDeck(deck);
                          }}
                          disabled={!val.valid}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 disabled:opacity-40 transition-all"
                          title="このデッキで対戦モードを開始"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>対戦</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-stone-400">
                        <button
                          onClick={() => handleDuplicateCustomDeck(deck)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 hover:text-white transition-colors"
                          title="デッキを複製"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleExportJSON(deck)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 hover:text-white transition-colors"
                          title="JSONエクスポート"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleDeleteCustomDeck(deck)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 hover:text-rose-300 transition-colors"
                          title="デッキを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Preset Decks (Read-only / Copyable) */}
        <div className="space-y-3 pt-4 border-t border-stone-800">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-stone-300 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-stone-400" />
              <span>公式プリセットデッキ ({PRESET_DECKS.length}件)</span>
            </h3>
            <span className="text-[11px] text-stone-500">
              コピーして新規デッキとして自由にカスタマイズ可能です
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRESET_DECKS.map((preset) => (
              <div
                key={preset.deckId}
                className="bg-stone-950/80 border border-stone-800/90 rounded-2xl p-3.5 shadow-sm flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-stone-200">{preset.deckName}</h4>
                      <span className="text-[10px] font-mono text-stone-500">
                        {preset.faction} • {preset.deckVersion}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400">
                      公式プリセット
                    </span>
                  </div>
                  {preset.description && (
                    <p className="text-[11px] text-stone-400 mt-2 line-clamp-2 leading-relaxed">
                      {preset.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-stone-900 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopyPreset(preset)}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-amber-500 hover:text-stone-950 text-stone-200 font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>コピーして編集</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onStartBattleWithDeck) onStartBattleWithDeck(preset);
                      else onTestDeck(preset);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-700 font-bold text-xs flex items-center gap-1 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>対戦</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER: 2. DECK EDIT WORKSPACE
  // ==========================================================================
  return (
    <div id="deck-builder-workspace" className="max-w-7xl mx-auto space-y-3 animate-fade-in pb-6">
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
            <CheckCircle className="w-4 h-4 text-emerald-400" />
          ) : notification.type === 'ERROR' ? (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          ) : (
            <Sparkles className="w-4 h-4 text-amber-400" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Top Header & Navigation Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-lg flex flex-wrap items-center justify-between gap-3">
        {/* Left: Back to List & Deck Title Input */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <button
            onClick={handleReturnToList}
            className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 border border-stone-800 hover:border-amber-400 transition-colors shrink-0"
            title="デッキ一覧へ戻る"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="デッキ名を入力..."
              className="bg-stone-950 border border-stone-700 focus:border-amber-500 rounded-xl px-3 py-1 text-sm font-black text-white w-full max-w-[220px] sm:max-w-[280px]"
            />

            {/* Unsaved status badge */}
            {isDirty ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500 text-amber-300 text-[10px] font-bold shrink-0 animate-pulse">
                ● 未保存
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-600 text-emerald-300 text-[10px] font-bold shrink-0">
                ✓ 保存済み
              </span>
            )}
          </div>
        </div>

        {/* Center: Deck Settings (Faction, Version) */}
        <div className="flex items-center gap-2 shrink-0">
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

          <input
            type="text"
            value={deckVersion}
            onChange={(e) => setDeckVersion(e.target.value)}
            className="bg-stone-950 border border-stone-700 rounded-xl px-1.5 py-1 text-xs font-mono font-bold text-amber-300 w-16 text-center focus:outline-none"
            placeholder="v1.0"
            title="デッキバージョン"
          />
        </div>

        {/* Right: Actions (Save, Test, Revert, Export, Clear) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleSave}
            disabled={!validation.valid}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-xs flex items-center gap-1 shadow-md disabled:opacity-40 transition-all active:scale-95"
            title="変更を保存"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存</span>
          </button>

          <button
            onClick={() => {
              handleSave();
              if (onStartBattleWithDeck) onStartBattleWithDeck(currentDeckObj);
              else onTestDeck(currentDeckObj);
            }}
            disabled={!validation.valid}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md disabled:opacity-40 transition-all"
            title="保存して対戦を開始"
          >
            <Play className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">対戦/検証</span>
          </button>

          {isDirty && (
            <button
              onClick={handleRevertChanges}
              className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-amber-300 border border-stone-800 transition-colors"
              title="変更を破棄して直前の保存状態に戻す"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => handleExportJSON(currentDeckObj)}
            className="p-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-white border border-stone-800 transition-colors"
            title="JSON形式でエクスポート"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearDeck}
            className="p-1.5 rounded-xl bg-stone-950 hover:bg-rose-950 text-stone-400 hover:text-rose-300 border border-stone-800 transition-colors"
            title="デッキのカードを全クリア"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Deck Stats & Quick Card Count Indicator */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto">
          {/* Deck Count */}
          <div className="flex items-center gap-1.5">
            <span className="text-stone-400 font-bold">枚数:</span>
            <span
              className={`font-mono font-black text-sm px-2 py-0.5 rounded-lg ${
                deckCards.length === 40
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-rose-950 text-rose-300 border border-rose-700'
              }`}
            >
              {deckCards.length} / 40
            </span>
          </div>

          {/* Validation Status */}
          {validation.valid ? (
            <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px] hidden sm:flex">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>規定を満たしています (40枚/同名最大4枚)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-rose-400 font-bold text-[11px] truncate max-w-[260px] sm:max-w-none">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{validation.errors[0]}</span>
            </div>
          )}
        </div>

        {/* Mobile Tab Switcher (Visible on mobile/tablet) */}
        <div className="flex lg:hidden items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 shrink-0">
          <button
            onClick={() => setMobileTab('POOL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              mobileTab === 'POOL' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            カード
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
              mobileTab === 'ANALYSIS' ? 'bg-amber-500 text-stone-950' : 'text-stone-400 hover:text-white'
            }`}
          >
            分析
          </button>
        </div>
      </div>

      {/* Main Responsive Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* ========================================================== */}
        {/* LEFT COLUMN (4 cols on Desktop): Current Deck List & Analysis */}
        {/* ========================================================== */}
        <div
          className={`lg:col-span-4 space-y-3.5 ${
            mobileTab === 'POOL' ? 'hidden lg:block' : 'block'
          }`}
        >
          {/* 1. Adopted Cards List Panel */}
          <div
            className={`bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-lg flex flex-col ${
              mobileTab === 'ANALYSIS' ? 'hidden lg:flex' : 'flex'
            } h-[420px] lg:h-[480px]`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-2">
              <span className="text-xs font-black text-stone-200">
                採用カード一覧 ({Object.keys(cardCounts).length}種 / {deckCards.length}枚)
              </span>
              <button
                onClick={handleClearDeck}
                className="text-[10px] text-stone-500 hover:text-rose-400"
              >
                全解除
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {Object.keys(cardCounts).length === 0 ? (
                <div className="text-center text-xs text-stone-600 py-20">
                  右側のカードプールからカードをタップして追加してください
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
                        className="flex items-center justify-between p-1.5 sm:p-2 bg-stone-950 rounded-xl border border-stone-800/80 hover:border-stone-700 transition-colors"
                      >
                        {/* Cost + Name */}
                        <div
                          onClick={() => onInspectCard(card)}
                          className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0 mr-1.5"
                          title="タップで詳細確認"
                        >
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center justify-center shrink-0">
                            {card.cost}
                          </span>
                          <div className="truncate text-xs font-bold text-stone-200">
                            {card.name}
                          </div>
                        </div>

                        {/* Plus / Minus count buttons */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => removeCard(cardId, 1)}
                            className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center text-xs font-bold active:scale-95"
                            title="1枚削除"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="w-5 text-center font-mono font-black text-xs text-amber-300">
                            {count}
                          </span>

                          <button
                            onClick={() => addCard(cardId, 1)}
                            disabled={count >= 4 || deckCards.length >= 40}
                            className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-25 flex items-center justify-center text-xs font-bold active:scale-95"
                            title="1枚追加"
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

          {/* 2. Mini Analytics / Mana Curve Panel */}
          <div
            className={`bg-stone-900 border border-stone-800 rounded-2xl p-3 shadow-lg space-y-2.5 ${
              mobileTab === 'DECK' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-stone-200 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
                <span>コストカーブ & 構成分析</span>
              </span>
              <span className="text-[10px] text-stone-400 font-mono">
                平均COST: <strong className="text-amber-300">{analytics.avgCost}</strong>
              </span>
            </div>

            {/* Mana Curve Bars */}
            <div className="grid grid-cols-7 gap-1.5 items-end h-16 pt-1">
              {[1, 2, 3, 4, 5, 6, 7].map((cost) => {
                const count = analytics.manaCurve[cost] || 0;
                const heightPct = Math.max(8, (count / analytics.maxCurve) * 100);
                return (
                  <div key={cost} className="flex flex-col items-center gap-0.5 h-full justify-end">
                    <span className="text-[9px] font-mono font-bold text-stone-300">{count}</span>
                    <div
                      className="w-full bg-gradient-to-t from-amber-600 to-amber-400 rounded-t-sm transition-all"
                      style={{ height: `${heightPct}%` }}
                    />
                    <span className="text-[9px] font-mono text-stone-500">{cost === 7 ? '7+' : cost}</span>
                  </div>
                );
              })}
            </div>

            {/* Card Types Breakdown Grid */}
            <div className="grid grid-cols-5 gap-1 text-center text-[10px] pt-1 border-t border-stone-800">
              <div className="bg-stone-950 p-1 rounded-lg border border-stone-800/80">
                <div className="text-stone-500">ユニット</div>
                <div className="font-bold text-amber-300">{analytics.unitCount}</div>
              </div>
              <div className="bg-stone-950 p-1 rounded-lg border border-stone-800/80">
                <div className="text-stone-500">進化</div>
                <div className="font-bold text-amber-400">{analytics.evolveCount}</div>
              </div>
              <div className="bg-stone-950 p-1 rounded-lg border border-stone-800/80">
                <div className="text-stone-500">スペル</div>
                <div className="font-bold text-sky-300">{analytics.spellCount}</div>
              </div>
              <div className="bg-stone-950 p-1 rounded-lg border border-stone-800/80">
                <div className="text-stone-500">ルーン</div>
                <div className="font-bold text-purple-300">{analytics.runeCount}</div>
              </div>
              <div className="bg-stone-950 p-1 rounded-lg border border-stone-800/80">
                <div className="text-stone-500">ドメイン</div>
                <div className="font-bold text-amber-200">{analytics.domainCount}</div>
              </div>
            </div>

            {/* Combat Stats Averages */}
            <div className="flex items-center justify-around bg-stone-950/80 p-1.5 rounded-lg text-[10px] text-stone-400">
              <span>平均ATK: <strong className="text-red-300 font-mono">{analytics.avgAtk}</strong></span>
              <span>平均DEF: <strong className="text-sky-300 font-mono">{analytics.avgDef}</strong></span>
              <span>平均BRK: <strong className="text-amber-300 font-mono">{analytics.avgBrk}</strong></span>
            </div>
          </div>
        </div>

        {/* ========================================================== */}
        {/* RIGHT COLUMN (8 cols on Desktop): Card Pool Explorer */}
        {/* ========================================================== */}
        <div
          className={`lg:col-span-8 bg-stone-900 border border-stone-800 rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col ${
            mobileTab !== 'POOL' ? 'hidden lg:flex' : 'flex'
          } h-[600px] lg:h-[680px]`}
        >
          {/* Search, Filter & Sort Controls */}
          <div className="space-y-2 pb-3 border-b border-stone-800 mb-3 shrink-0">
            {/* Search Input & Sort Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="カード名、効果、系統、種族、存在分類で検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-8 pr-7 py-1.5 text-xs text-stone-100 placeholder:text-stone-600 focus:outline-none focus:border-amber-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort Selector */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-stone-950 border border-stone-700 rounded-xl px-2 py-1.5 text-xs font-bold text-stone-300 focus:outline-none focus:border-amber-500 shrink-0"
              >
                <option value="COST_ASC">コスト昇順</option>
                <option value="COST_DESC">コスト降順</option>
                <option value="NAME_ASC">名前順</option>
                <option value="COUNT_DESC">採用枚数順</option>
                <option value="TYPE">種類順</option>
              </select>
            </div>

            {/* Faction Filter Pills */}
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-[10px] text-stone-500 mr-0.5">系統:</span>
              {(['ALL', 'RED', 'BLUE', 'GREEN', 'HOLY', 'DARK', 'NEUTRAL'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterFaction(f)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                    filterFaction === f
                      ? 'bg-amber-500 text-stone-950'
                      : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                  }`}
                >
                  {f === 'ALL'
                    ? '全'
                    : f === 'RED'
                    ? '朱'
                    : f === 'BLUE'
                    ? '蒼'
                    : f === 'GREEN'
                    ? '翠'
                    : f === 'HOLY'
                    ? '聖'
                    : f === 'DARK'
                    ? '冥'
                    : '無'}
                </button>
              ))}
            </div>

            {/* Card Type & Cost Filter Row */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-stone-500 mr-0.5">種類:</span>
                {(['ALL', 'UNIT', 'EVOLVE_UNIT', 'SPELL', 'RUNE', 'DOMAIN'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      filterType === t ? 'bg-stone-700 text-white' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {t === 'ALL'
                      ? '全'
                      : t === 'UNIT'
                      ? 'ユニット'
                      : t === 'EVOLVE_UNIT'
                      ? '進化'
                      : t === 'SPELL'
                      ? 'スペル'
                      : t === 'RUNE'
                      ? 'ルーン'
                      : 'ドメイン'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] text-stone-500 mr-0.5">COST:</span>
                {(['ALL', '1', '2', '3', '4', '5', '6', '7+'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilterCost(c)}
                    className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold ${
                      filterCost === c
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                    }`}
                  >
                    {c === 'ALL' ? '全' : c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 overflow-y-auto pr-1">
            {filteredAndSortedPool.length === 0 ? (
              <div className="text-center text-xs text-stone-600 py-20">
                該当するカードが見つかりませんでした
              </div>
            ) : (
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
                {filteredAndSortedPool.map((card) => {
                  const countInDeck = cardCounts[card.cardId] || 0;
                  const isMaxed = countInDeck >= 4 || deckCards.length >= 40;

                  return (
                    <div
                      key={card.cardId}
                      className="relative group flex flex-col items-center"
                    >
                      <CardItem
                        card={card}
                        size="sm"
                        isInteractive={true}
                        onInspect={onInspectCard}
                        onClick={() => addCard(card.cardId, 1)}
                      />

                      {/* Quick Add & Count Controller floating pill */}
                      <div className="w-full flex items-center justify-between px-1.5 py-0.5 bg-stone-950/95 border border-stone-800 rounded-lg mt-1 text-[10px] shadow-sm">
                        <div className="flex items-center gap-0.5">
                          <span className="font-mono font-bold text-amber-300">{countInDeck}</span>
                          <span className="font-mono text-[8px] text-stone-500">/4</span>
                        </div>

                        <div className="flex items-center gap-1">
                          {countInDeck > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeCard(card.cardId, 1);
                              }}
                              className="w-4 h-4 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center font-bold"
                              title="1枚削除"
                            >
                              -
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              addCard(card.cardId, 1);
                            }}
                            disabled={isMaxed}
                            className="w-4 h-4 rounded bg-amber-500 hover:bg-amber-400 disabled:opacity-25 text-stone-950 flex items-center justify-center font-bold"
                            title="1枚追加"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
