//statement blocks

'use strict';
Blockly.Blocks['js_return_statement'] = {
  init: function() {
    this.setColour(160);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendValueInput('VALUE')
      .appendField('return');
    this.setTooltip('Function returns the value of input.');
  }
};
Blockly.Blocks['js_notimplemented'] = {
  init: function() {
    this.setColour(160);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendDummyInput()
      .appendField('Not yet implemented :(');
    this.setTooltip('Function returns the value of input.');
  }
};