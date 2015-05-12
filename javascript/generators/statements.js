//statement blocks

Blocklify.JavaScript.Generator['js_for_statement'] = function(block) {
  var value_condition = Blocklify.JavaScript.Generator.valueToCode(block, 'CONDITION', Blocklify.JavaScript.Generator.ORDER_NONE);
  var statements_first = '', func;
  var first_targetblock = block.getInputTargetBlock('FIRST');
  if (first_targetblock) {
    if (first_targetblock.type == 'js_variable_declaration' ||
        first_targetblock.type == 'js_variable_declaration_unary') {
      func = Blocklify.JavaScript.Generator[first_targetblock.type];
      statements_first = func.call(first_targetblock, first_targetblock);
      statements_first = Blocklify.JavaScript.Generator.statementToCode(block, 'FIRST');
      statements_first = statements_first.substring(2, statements_first.length - 2);
    } else {
      statements_first = Blocklify.JavaScript.Generator.sequenceToCode(block, 'FIRST');
    }
  }
  var statements_do = Blocklify.JavaScript.Generator.statementToCode(block, 'DO');
  var statements_step = Blocklify.JavaScript.Generator.sequenceToCode(block, 'STEP');
  // TODO: Assemble JavaScript into code variable.
  var code = 'for (' + statements_first + '; ' + value_condition + '; ' + statements_step + ') {\n' +
    statements_do + '}';
  return code;
};

Blocklify.JavaScript.Generator['js_return_statement'] = function(block) {
  var code = 'return ' + Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
    Blocklify.JavaScript.Generator.ORDER_NONE) + ';';
  return code + '\n';
};

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