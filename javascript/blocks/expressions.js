//expressions

'use strict'

Blockly.Blocks['js_assignment_expression'] = {
  /**
   * Block for redering a assignment expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.interpolateMsg(
        'set %1 %2 %3',
        ['VAR', null],
        ['OPERATOR', new Blockly.FieldTextInput('=')],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Assignment expression.');
  }
};
Blockly.Blocks['js_update_expression_prefix'] = {
  /**
   * Block for redering a prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(230);
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
Blockly.Blocks['js_update_expression_noprefix'] = {
  /**
   * Block for redering a no prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(230);
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
Blockly.Blocks['js_binary_expression'] = {
  /**
   * Block for redering a binary expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(230);
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