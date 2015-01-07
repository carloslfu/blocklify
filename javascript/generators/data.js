//data objects

Blocklify.JavaScript.Generator['js_literal_number'] = function(block) {
  var code = parseFloat(block.getFieldValue('NUMBER'));
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_literal_string'] = function(block) {
  var code = Blocklify.JavaScript.Generator.quote_(block.getFieldValue('STRING'));
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
//object in JSON format
Blockly.Blocks['json_object'] = {
  init: function() {
    this.setColour(260);
    this.setOutput(true);
    this.appendDummyInput()
          .appendField('object');
    this.appendStatementInput('ELEMENTS')
          .appendField('elements');
    this.setTooltip('Object in JSON format.');
  }
};
Blockly.Blocks['json_element'] = {
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.interpolateMsg(
        ' %1 : %2',
        ['NAME', new Blockly.FieldTextInput('property')],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setInputsInline(false);
    this.setTooltip('Element of object in JSON format.');
  }
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