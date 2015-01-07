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
Blockly.Blocks['update_expression_prefix'] = {
  /**
   * Block for redering a prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.interpolateMsg(
        '%1 %2',
        ['OPERATOR', new Blockly.FieldTextInput('++')],
        ['ARGUMENT', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Update expression with prefix.');
  }
};
Blockly.Blocks['update_expression_noprefix'] = {
  /**
   * Block for redering a no prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.interpolateMsg(
        '%1 %2',
        ['ARGUMENT', null],
        ['OPERATOR', new Blockly.FieldTextInput('++')],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Update expression without prefix.');
  }
};
Blockly.Blocks['binary_expression'] = {
  /**
   * Block for redering a binary expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.setOutput(true);
    this.interpolateMsg(
        '%1 %2 %3',
        ['LEFT', null],
        ['OPERATOR', new Blockly.FieldTextInput('+')],
        ['RIGHT', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Binary expression.');
  }
};