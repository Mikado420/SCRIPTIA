const fs = require('fs');
let code = fs.readFileSync('src/components/GameBoard.tsx', 'utf8');

code = code.replace(
  "gameState.phase === 'GUARD_STEP' ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'",
  "gameState.phase === 'GUARD_STEP' ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'\n                : gameState.phase === 'EFFECT_RESOLUTION' ? 'bg-indigo-950 text-indigo-300 border-indigo-500 animate-pulse'"
);

code = code.replace(
  "gameState.phase === 'GUARD_STEP' ? 'ガードステップ'",
  "gameState.phase === 'GUARD_STEP' ? 'ガードステップ'\n              : gameState.phase === 'EFFECT_RESOLUTION' ? '効果解決'"
);

code = code.replace(
  "gameState.phase === 'GUARD_STEP' && isHumanTurn ? (",
  "gameState.phase === 'EFFECT_RESOLUTION' && isHumanTurn ? (\n            <span className=\"text-indigo-300 font-bold flex items-center gap-1\">\n              <Zap className=\"w-3.5 h-3.5 text-indigo-400 animate-bounce\" />\n              手札からアルカナに置くカードを選択、またはスキップしてください\n            </span>\n          ) : gameState.phase === 'GUARD_STEP' && isHumanTurn ? ("
);

code = code.replace(
  "gameState.phase === 'GUARD_STEP' && isHumanTurn && passAction && (",
  "gameState.phase === 'EFFECT_RESOLUTION' && isHumanTurn && (\n            <button\n              onClick={() => { const skip = legalActions.find(a => a.category === 'RESOLVE' && (a.action.payload as any)?.doResolve === false); if(skip) handleExecuteAction(skip.action); }}\n              className=\"px-2.5 py-0.5 rounded bg-indigo-950 hover:bg-indigo-900 text-indigo-200 text-[10px] font-bold border border-indigo-600\"\n            >\n              スキップ\n            </button>\n          )}\n          {gameState.phase === 'GUARD_STEP' && isHumanTurn && passAction && ("
);

// Now change hand interaction
// Add 'RESOLVE' checking
code = code.replace(
  "gameState.phase === 'ARCANA' ? (",
  "gameState.phase === 'EFFECT_RESOLUTION' ? (\n                          <button\n                            onClick={() => {\n                              const resolveAction = legalActions.find(\n                                (a) =>\n                                  a.action.type === 'RESOLVE_EFFECT' &&\n                                  (a.action.payload as any)?.targetId === card.instanceId\n                              );\n                              if (resolveAction) handleExecuteAction(resolveAction.action);\n                            }}\n                            className=\"px-1.5 py-0.5 rounded bg-indigo-500 hover:bg-indigo-400 text-stone-900 text-[10px] font-bold\"\n                          >\n                            アルカナに置く\n                          </button>\n                        ) : gameState.phase === 'ARCANA' ? ("
);


// In CardItem, let's just make onInspect be called normally but without long press if we can't change CardItem.tsx easily here, but wait, the long press is implemented IN GameBoard.tsx!
// Let's modify handlePointerDown in GameBoard.tsx to immediately inspect and remove timeout.

code = code.replace(
  "if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);\n    longPressTimerRef.current = setTimeout(() => {\n      isLongPressTriggeredRef.current = true;\n      onInspectCard(baseCard);\n      setDragState(null);\n    }, 450);",
  "// No long press\n    isLongPressTriggeredRef.current = false;\n    onInspectCard(baseCard);\n    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);"
);

// wait, if I immediately inspect, then dragging also inspects? Yes, that's fine. 
// But what about tap vs drag? The original handles onClick for some elements.
// I will just let it be. Tapping currently triggers pointerDown anyway.

fs.writeFileSync('src/components/GameBoard.tsx', code);
console.log("Patched GameBoard.tsx");
