Blocklify.JavaScript.Generator['js_function_expression'] = function(block) {
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'STACK');
  if (Blocklify.JavaScript.Generator.STATEMENT_PREFIX) {
    branch = Blocklify.JavaScript.Generator.prefixLines(
        Blocklify.JavaScript.Generator.STATEMENT_PREFIX.replace(/%1/g,
        '\'' + block.id + '\''), Blocklify.JavaScript.Generator.INDENT) + branch;
  }
  var name = Blocklify.JavaScript.Generator.valueToCode(block, 'NAME',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var args = [];
  for (var i = 0; i < block.paramCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'PARAM' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = 'function ' + name + '(' + args.join(', ') + ') {\n' +
      branch + '}';
  //code = Blocklify.JavaScript.Generator.scrub_(block, code);
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_anonimous_function_expression'] = function(block) {
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'STACK');
  if (Blocklify.JavaScript.Generator.STATEMENT_PREFIX) {
    branch = Blocklify.JavaScript.Generator.prefixLines(
        Blocklify.JavaScript.Generator.STATEMENT_PREFIX.replace(/%1/g,
        '\'' + block.id + '\''), Blocklify.JavaScript.Generator.INDENT) + branch;
  }
  var args = [];
  for (var i = 0; i < block.paramCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'PARAM' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = 'function (' + args.join(', ') + ') {\n' +
      branch + '}';
  //code = Blocklify.JavaScript.Generator.scrub_(block, code);
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_call_expression'] = function(block) {
  var name = Blocklify.JavaScript.Generator.valueToCode(block, 'NAME',
    Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  if (Blocklify.JavaScript.Generator.STATEMENT_PREFIX) {
    branch = Blocklify.JavaScript.Generator.prefixLines(
        Blocklify.JavaScript.Generator.STATEMENT_PREFIX.replace(/%1/g,
        '\'' + block.id + '\''), Blocklify.JavaScript.Generator.INDENT) + branch;
  }
  var args = [];
  for (var i = 0; i < block.argCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = name + '(' + args.join(', ') + ')';
  //code = Blocklify.JavaScript.Generator.scrub_(block, code);
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
  } else {
    return code + ';\n';
  }
};