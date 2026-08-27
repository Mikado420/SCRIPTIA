const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { CardDetailModal } from './components/CardDetailModal';",
  "import { CardInfoPanel } from './components/CardInfoPanel';"
);

code = code.replace(
  "<CardDetailModal card={inspectedCard} onClose={() => setInspectedCard(null)} />",
  "<CardInfoPanel card={inspectedCard} />"
);

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
