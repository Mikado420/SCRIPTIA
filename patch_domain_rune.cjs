const fs = require('fs');
let code = fs.readFileSync('src/components/GameBoard.tsx', 'utf8');

const oppRuneDomainCode = `
          {/* Opponent Domain & Runes */}
          <div className="flex gap-1 items-center bg-stone-900 border border-stone-800 p-1 rounded-md">
            <div className="text-[9px] text-stone-500 font-bold px-1">DOMAIN</div>
            {pB.domain ? (
               <div className="w-10 h-14 bg-indigo-900/50 border border-indigo-400 rounded cursor-pointer overflow-hidden relative" onClick={() => onInspectCard(pB.domain.baseCard)}>
                 <div className="absolute inset-0 flex items-center justify-center text-[8px] text-center font-bold text-indigo-200">{pB.domain.baseCard.name}</div>
               </div>
            ) : <div className="w-10 h-14 border border-dashed border-stone-700 rounded opacity-30" />}
            
            <div className="text-[9px] text-stone-500 font-bold px-1 ml-2">RUNES</div>
            {[0, 1].map(i => {
              const rune = pB.runes[i];
              return rune ? (
                <div key={i} className="w-10 h-14 bg-stone-800 border-2 border-stone-600 rounded-md relative shadow-md">
                   <div className="absolute inset-0 bg-[url('/card-back.png')] bg-cover bg-center opacity-50" />
                   <div className="absolute inset-0 flex items-center justify-center text-[10px] text-stone-400 font-bold">伏せ</div>
                </div>
              ) : (
                <div key={i} className="w-10 h-14 border border-dashed border-stone-700 rounded opacity-30" />
              )
            })}
          </div>
`;

code = code.replace(
  "{/* Right: Hand/Deck Info */}",
  oppRuneDomainCode + "\n          {/* Right: Hand/Deck Info */}"
);


const playerRuneDomainCode = `
          {/* Player Domain & Runes */}
          <div className="flex gap-1 items-center bg-stone-900 border border-stone-800 p-1 rounded-md ml-2">
            <div className="text-[9px] text-stone-500 font-bold px-1">DOMAIN</div>
            {pA.domain ? (
               <div className="w-10 h-14 bg-indigo-900/50 border border-indigo-400 rounded cursor-pointer overflow-hidden relative" onClick={() => onInspectCard(pA.domain.baseCard)}>
                 <div className="absolute inset-0 flex items-center justify-center text-[8px] text-center font-bold text-indigo-200">{pA.domain.baseCard.name}</div>
               </div>
            ) : <div className="w-10 h-14 border border-dashed border-stone-700 rounded opacity-30" />}
            
            <div className="text-[9px] text-stone-500 font-bold px-1 ml-2">RUNES</div>
            {[0, 1].map(i => {
              const rune = pA.runes[i];
              return rune ? (
                <div key={i} className="w-10 h-14 bg-stone-800 border-2 border-purple-500 rounded-md relative shadow-md cursor-pointer overflow-hidden" onClick={() => onInspectCard(rune.baseCard)}>
                   <div className="absolute inset-0 flex items-center justify-center text-[8px] text-center font-bold text-purple-200">{rune.baseCard.name}</div>
                </div>
              ) : (
                <div key={i} className="w-10 h-14 border border-dashed border-stone-700 rounded opacity-30" />
              )
            })}
          </div>
`;

code = code.replace(
  "{/* Arcana Slot & Drop Target */}",
  playerRuneDomainCode + "\n            {/* Arcana Slot & Drop Target */}"
);

fs.writeFileSync('src/components/GameBoard.tsx', code);
console.log("Patched Domain/Rune UI");
