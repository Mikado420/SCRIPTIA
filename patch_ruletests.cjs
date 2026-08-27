const fs = require('fs');
let code = fs.readFileSync('src/engine/ruleTests.ts', 'utf8');

code = code.replace(
  "testId: 'test_summoning_sickness_abolished',\n      category: 'CORE_RULE',\n      name: '召喚酔い廃止 (召喚ターン即時攻撃可能)',\n      description: '召喚直後のユニットがそのターンに攻撃できることを検証',\n      passed: canAttackAfterSummon,\n      message: canAttackAfterSummon\n        ? '召喚ターンに正しく攻撃可能と判定されました。'\n        : '召喚したユニットが攻撃できません (召喚酔い判定が残存しています)。',",
  "testId: 'test_summoning_sickness',\n      category: 'CORE_RULE',\n      name: '召喚酔い',\n      description: '召喚直後のユニットがそのターンに攻撃できないことを検証',\n      passed: !canAttackAfterSummon,\n      message: !canAttackAfterSummon\n        ? '召喚ターンに正しく攻撃不可と判定されました。'\n        : '召喚したユニットが攻撃できてしまいます。',"
);

fs.writeFileSync('src/engine/ruleTests.ts', code);
console.log("Patched ruleTests for summoning sickness");
