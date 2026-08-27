const fs = require('fs');
let code = fs.readFileSync('src/components/CardInfoPanel.tsx', 'utf8');

code = code.replace(
  "card.faction === 'WHITE' ? '聖' : card.faction === 'BLACK'",
  "card.faction === 'HOLY' ? '聖' : card.faction === 'DARK'"
);

code = code.replace(
  "card.category || 'なし'",
  "card.raceName || card.classification || 'なし'"
);

code = code.replace(
  "card.effects && card.effects.length > 0 && (\n        <div className=\"px-3 py-2 text-xs text-stone-300 leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto\">\n          {card.effects.map(e => e.description).join('\\n')}\n        </div>\n      )",
  "card.effectsText && (\n        <div className=\"px-3 py-2 text-xs text-stone-300 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto\">\n          {card.effectsText}\n        </div>\n      )"
);

fs.writeFileSync('src/components/CardInfoPanel.tsx', code);
console.log("Patched CardInfoPanel.tsx");
