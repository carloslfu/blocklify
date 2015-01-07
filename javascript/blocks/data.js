//data objects

'use strict'

Blockly.Blocks['js_literal_number'] = {
  init: function() {
    this.setColour(230);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput('0',
        Blockly.FieldTextInput.numberValidator), 'NUMBER');
    this.setOutput(true, 'Number');
    this.setTooltip("Number.");
  }
};
Blockly.Blocks['js_literal_string'] = {
  init: function() {
    this.setColour(160);
    this.appendDummyInput()
        .appendField(this.newQuote_(true))
        .appendField(new Blockly.FieldTextInput(''), 'STRING')
        .appendField(this.newQuote_(false));
    this.setOutput(true, 'String');
    this.setTooltip("String.");
  },
  newQuote_: function(open) {
    if (open == Blockly.RTL) {
      var file = 'quote1.png';
    } else {
      var file = 'quote0.png';
    }
    return new Blockly.FieldImage(Blockly.pathToMedia + file, 12, 12, '"');
  }
};
//object in JSON format
Blockly.Blocks['js_json_object'] = {
  init: function() {
    this.setColour(260);
    this.setOutput(true);
    this.appendDummyInput()
          .appendField('object');
    this.appendStatementInput('ELEMENTS')
          .setCheck('JSON_element')
          .appendField('elements');
    this.setTooltip('Object in JSON format.');
  }
};
Blockly.Blocks['js_json_element'] = {
  init: function() {
    this.setColour(260);
    this.setPreviousStatement(true, 'JSON_element');
    this.setNextStatement(true, 'JSON_element');
    this.interpolateMsg(
        ' %1 : %2',
        ['NAME', new Blockly.FieldTextInput('property')],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setInputsInline(false);
    this.setTooltip('Element of object in JSON format.');
  }
};
Blockly.Blocks['js_identifier'] = {
  init: function() {
    this.setColour(120);
    this.setOutput(true);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(''), 'NAME');
    this.setTooltip('Identifier.');
  }
};
Blockly.Blocks['js_identifier_member_expression'] = {
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
Blockly.Blocks['js_literal_member_expression'] = {
  init: function() {
    this.setColour(160);
    this.interpolateMsg(
        '[%1].%2',
        ['NAME', new Blockly.FieldTextInput('')],
        ['NEXT', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setOutput(true);
    this.setInputsInline(false);
    this.setTooltip("Literal string of member expression.");
  }
};
Blockly.Blocks['js_variable_declarator'] = {
  /**
   * Block for redering a variable declarator.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true, 'Declarator');
    this.setNextStatement(true, 'Declarator');
    this.interpolateMsg(
        'set %1 = %2',
        ['VAR', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Variable declarator.');
  }
};
Blockly.Blocks['js_variable_declaration'] = {
  /**
   * Block for redering a variable declaration.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.appendDummyInput()
            .appendField('variable declaration');
    this.appendStatementInput('DECLARATIONS')
            .setCheck('Declarator');
    this.setTooltip('Variable declaration.');
  }
};