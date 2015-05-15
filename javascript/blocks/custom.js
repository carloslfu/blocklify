//custom blocks - not yet implemented. experimenting with this, but this requires Blockly.FieldTextArea element (not available in blockly core).

'use strict'

Blockly.Blocks['js_blocklify'] = {
   /**
   * Block for adding in comments.
   * @this Blockly.Block
   */
  init: function() {
  
    this.setColour(10);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextArea(''), 'CODE')
        ;
	  this.setPreviousStatement(true);
    this.setNextStatement(true);
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
    this.setTooltip("Blocklify.");
  }
};