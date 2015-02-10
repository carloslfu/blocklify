Blocklify.JavaScript.Generator['js_function_expression'] = function(block) {
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'STACK');
  var name = Blocklify.JavaScript.Generator.valueToCode(block, 'NAME',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var args = [];
  for (var i = 0; i < block.paramCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'PARAM' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = 'function ' + name + '(' + args.join(', ') + ') {\n' +
      branch + '}';
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_anonimous_function_expression'] = function(block) {
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'STACK');
  var args = [];
  for (var i = 0; i < block.paramCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'PARAM' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = 'function (' + args.join(', ') + ') {\n' +
      branch + '}';
  return [code, Blocklify.JavaScript.Generator.ORDER_TYPEOF];
};

Blocklify.JavaScript.Generator['js_call_expression'] = function(block) {
  var name = Blocklify.JavaScript.Generator.valueToCode(block, 'NAME',
    Blocklify.JavaScript.Generator.ORDER_FUNCTION_CALL);
  var args = [];
  for (var i = 0; i < block.argCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = name + '(' + args.join(', ') + ')';
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
  } else {
    return code + ';\n';
  }
};