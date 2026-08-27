const fs = require('fs');
let code = fs.readFileSync('src/components/CardInfoPanel.tsx', 'utf8');

code = code.replace(
  "interface CardInfoPanelProps {\n  card: CardData | null;\n}",
  "import { X } from 'lucide-react';\n\ninterface CardInfoPanelProps {\n  card: CardData | null;\n  onClose: () => void;\n}"
);

code = code.replace(
  "export const CardInfoPanel: React.FC<CardInfoPanelProps> = ({ card }) => {",
  "export const CardInfoPanel: React.FC<CardInfoPanelProps> = ({ card, onClose }) => {"
);

code = code.replace(
  "pointer-events-none",
  "pointer-events-auto"
);

code = code.replace(
  "<span className=\"text-amber-400 shrink-0 ml-2\">COST {card.cost}</span>\n      </div>",
  "<span className=\"text-amber-400 shrink-0 ml-2\">COST {card.cost}</span>\n        <button onClick={onClose} className=\"ml-2 text-stone-400 hover:text-stone-200\"><X className=\"w-4 h-4\" /></button>\n      </div>"
);

fs.writeFileSync('src/components/CardInfoPanel.tsx', code);
console.log("Patched CardInfoPanel");
