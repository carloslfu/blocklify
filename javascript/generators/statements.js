//statement blocks

Blocklify.JavaScript.Generator['js_if_statement'] = function(block) {
  var n = 0;
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'IF' + n,
      Blocklify.JavaScript.Generator.ORDER_NONE) || 'false';
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'DO' + n);
  var code = 'if (' + argument + ') {\n' + branch + '}';
  for (n = 1; n <= block.elseifCount_; n++) {
    argument = Blocklify.JavaScript.Generator.valueToCode(block, 'IF' + n,
        Blocklify.JavaScript.Generator.ORDER_NONE) || 'false';
    branch = Blocklify.JavaScript.Generator.statementToCode(block, 'DO' + n);
    code += ' else if (' + argument + ') {\n' + branch + '}';
  }
  if (block.elseCount_) {
    branch = Blocklify.JavaScript.Generator.statementToCode(block, 'ELSE');
    code += ' else {\n' + branch + '}';
  }
  return code + '\n';
};

Blocklify.JavaScript.Generator['js_return_statement'] = function(block) {
  var code = 'return ' + Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
    Blocklify.JavaScript.Generator.ORDER_NONE) + ';';
  return code + '\n';
};