const fs = require('fs');
let code = fs.readFileSync('src/components/CardItem.tsx', 'utf8');

code = code.replace(
  '<span className="text-[9px] text-rose-300 font-sans">BRK</span>\n            <span>{currentBrk}</span>',
  '<span>{currentBrk}</span>'
);

// Let's also remove the long press from CardItem since it was removed in previous step from GameBoard
code = code.replace(
  '  const startLongPress = () => {\n    isLongPressTriggeredRef.current = false;\n    if (timerRef.current) clearTimeout(timerRef.current);\n    timerRef.current = setTimeout(() => {\n      isLongPressTriggeredRef.current = true;\n      setIsLongPressing(true);\n      if (onInspect) {\n        onInspect(baseCard);\n      }\n      setTimeout(() => setIsLongPressing(false), 200);\n    }, 450); // 450ms threshold\n  };\n\n  const cancelLongPress = () => {\n    if (timerRef.current) clearTimeout(timerRef.current);\n  };',
  ''
);

code = code.replace(
  'onPointerDown={(e) => {\n        startLongPress();\n        if (onPointerDown) onPointerDown(e);\n      }}\n      onPointerUp={cancelLongPress}\n      onPointerLeave={cancelLongPress}',
  'onPointerDown={(e) => {\n        if (onPointerDown) onPointerDown(e);\n        if (onInspect) onInspect(baseCard);\n      }}'
);

fs.writeFileSync('src/components/CardItem.tsx', code);
console.log("Patched BRK and removed long press");
