//data objects

Blocklify.JavaScript.Generator['js_literal_number'] = function(block) {
  var code = parseFloat(block.getFieldValue('NUMBER'));
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_literal_string'] = function(block) {
  var code = Blocklify.JavaScript.Generator.quote_(block.getFieldValue('STRING'));
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_null_value'] = function(block) {
  return ['null', Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_undefined_value'] = function(block) {
  return ['undefined', Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_json_object'] = function(block) {
  var elements = Blocklify.JavaScript.Generator.statementToCode(block, 'ELEMENTS');
  var code = ' {\n' +
      elements + '}';
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_json_element'] = function(block) {
  var key = Blocklify.JavaScript.Generator.valueToCode(block, 'KEY',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var code =  key + ' : ' + value + ',\n';
  return code;
};
Blocklify.JavaScript.Generator['js_identifier'] = function(block) {
  var name = block.getFieldValue('NAME');
  var code = name;
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blockly.Blocks['identifier_member_expression'] = {
  init: function() {
    this.setColour(330);
    this.setOutput(true);
    this.interpolateMsg(
        '%1.%2',
        ['NAME', new Blockly.FieldTextInput('')],
        ['NEXT', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setInputsInline(false);
    this.setTooltip('Identifier of member expression.');
  }
};
Blockly.Blocks['variable_declarator'] = {
  /**
   * Block for redering a variable declarator.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.interpolateMsg(
        'set %1 = %2',
        ['VAR', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Variable declarator.');
  }
};
Blocklify.JavaScript.Generator['js_variable_declaration_unary'] = function(block) {
  var operator = block.getFieldValue('OPERATOR');
  var variable = Blocklify.JavaScript.Generator.valueToCode(block, 'VAR',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var code =  'var ' + variable + ' = ' + value;
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};
Blockly.Blocks['variable_declaration'] = {
  /**
   * Block for redering a variable declaration.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendDummyInput()
            .appendField('variable declaration');
    this.appendStatementInput('DECLARATIONS');
    this.setTooltip('Variable declaration.');
  }
};