const fs = require('fs');
let code = fs.readFileSync('src/components/GameBoard.tsx', 'utf8');

code = code.replace(
  '<div className="flex items-end justify-center -space-x-5 sm:-space-x-7 transition-all max-w-full">',
  '<div className="flex items-end justify-center transition-all max-w-full">'
);

code = code.replace(
  'style={{ zIndex: isSelected ? 40 : index + 1 }}',
  'style={{ zIndex: isSelected ? 40 : index + 1, marginLeft: index === 0 ? "0px" : `${Math.min(-10, Math.max(-50, -8 * (pA.hand.length - 2)))}px` }}'
);

fs.writeFileSync('src/components/GameBoard.tsx', code);
console.log("Patched hand UI");
