//expressions

Blocklify.JavaScript.Generator['js_assignment_expression'] = function(block) {
  var variable = Blocklify.JavaScript.Generator.valueToCode(block, 'VAR',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var code = variable + ' ' + operator + ' ' + value;
  //If has output returns a tuple with the order of precedence
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_update_expression_prefix'] = function(block) {
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var OPERATORS = {
    '++': Blocklify.JavaScript.Generator.ORDER_INCREMENT,
    '--': Blocklify.JavaScript.Generator.ORDER_DECREMENT
  };
  var code = operator + argument;
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_update_expression_noprefix'] = function(block) {
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var OPERATORS = {
    '++': Blocklify.JavaScript.Generator.ORDER_INCREMENT,
    '--': Blocklify.JavaScript.Generator.ORDER_DECREMENT
  };
  var code =  argument + operator;
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_binary_expression'] = function(block) {
  var OPERATORS = {
    '+': Blocklify.JavaScript.Generator.ORDER_ADDITION,
    '-': Blocklify.JavaScript.Generator.ORDER_SUBTRACTION,
    '*': Blocklify.JavaScript.Generator.ORDER_MULTIPLICATION,
    '/': Blocklify.JavaScript.Generator.ORDER_DIVISION,
    '==': Blocklify.JavaScript.Generator.ORDER_EQUALITY,
    '!=': Blocklify.JavaScript.Generator.ORDER_EQUALITY,
    '===': Blocklify.JavaScript.Generator.ORDER_EQUALITY,
    '!==': Blocklify.JavaScript.Generator.ORDER_EQUALITY,
    '>': Blocklify.JavaScript.Generator.ORDER_RELATIONAL,
    '<': Blocklify.JavaScript.Generator.ORDER_RELATIONAL,
    '>=': Blocklify.JavaScript.Generator.ORDER_RELATIONAL,
    '<=': Blocklify.JavaScript.Generator.ORDER_RELATIONAL
  };
  var operator = block.getFieldValue('OPERATOR');
  var left = Blocklify.JavaScript.Generator.valueToCode(block, 'LEFT',
      OPERATORS[operator]);
  var right = Blocklify.JavaScript.Generator.valueToCode(block, 'RIGHT',
      OPERATORS[operator]);
  var code =  left + ' ' + operator + ' ' + right;
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_member_expression'] = function(block) {
  var members = [];
  for (var i = 0; i < block.memberCount; i++) {
    members[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'MEMBER' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = members.join('.');
  return [code, Blocklify.JavaScript.Generator.ORDER_MEMBER];
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};
