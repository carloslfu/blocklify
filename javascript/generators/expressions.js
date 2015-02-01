//expressions

Blocklify.JavaScript.Generator['js_assignment_expression'] = function(block) {
  var variable = Blocklify.JavaScript.Generator.valueToCode(block, 'VAR',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var code = variable + ' ' + operator + ' ' + value + ';\n'; 
  return code;
};
Blocklify.JavaScript.Generator['js_update_expression_prefix'] = function(block) {
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var code = operator + argument + ';\n';
  return code;
};
Blocklify.JavaScript.Generator['js_update_expression_noprefix'] = function(block) {
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var code =  argument + operator + ';\n';
  return code;
};
Blocklify.JavaScript.Generator['js_binary_expression'] = function(block) {
  var OPERATORS = {
    '+': Blocklify.JavaScript.Generator.ORDER_ADDITION,
    '-': Blocklify.JavaScript.Generator.ORDER_SUBTRACTION,
    '*': Blocklify.JavaScript.Generator.ORDER_MULTIPLICATION,
    '/': Blocklify.JavaScript.Generator.ORDER_DIVISION,
    '%': Blocklify.JavaScript.Generator.ORDER_MODULUS
  };
  var operator = block.getFieldValue('OPERATOR');
  var left = Blocklify.JavaScript.Generator.valueToCode(block, 'LEFT',
      OPERATORS[operator]);
  var right = Blocklify.JavaScript.Generator.valueToCode(block, 'RIGHT',
      OPERATORS[operator]);
  var code =  left + ' ' + operator + ' ' + right;
  return [code, OPERATORS[operator]];
};