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
Blockly.Blocks['js_null_value'] = {
  init: function() {
    this.setColour(230);
    this.appendDummyInput()
        .appendField('null');
    this.setOutput(true);
    this.setTooltip("Null value.");
  }
};
Blockly.Blocks['js_undefined_value'] = {
  init: function() {
    this.setColour(230);
    this.appendDummyInput()
        .appendField('undefined');
    this.setOutput(true);
    this.setTooltip("Undefined value.");
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
    if (open == this.RTL) {
      var file = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAKCAYAAACALL/6AAAA0UlEQVQY023QP0oDURSF8e8MImhlUIiCjWKhrUUK3YCIVkq6bMAF2LkCa8ENWLoNS1sLEQKprMQ/GBDks3kDM+Oc8nfPfTxuANQTYBeYAvdJLL4FnAFfwF2ST9Rz27kp5YH/kwrYp50LdaXHAU4rYNYzWAdeenx7AbgF5sAhcARsAkkyVQ+ACbAKjIGqta4+l78udXxc/LiJG+qvet0pV+q7+tHE+iJzdbGz8FhmOzVcqj/qq7rcKI7Ut1Leq70C1oCrJMMk343HB8ADMEzyVOMff72l48gwfqkAAAAASUVORK5CYII=';
    } else {
      var file = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAKCAYAAACALL/6AAAAvklEQVQY022PoapCQRRF97lBVDRYhBcEQcP1BwS/QLAqr7xitZn0HzRr8Rts+htmQdCqSbQIwmMZPMIw3lVmZu0zG44UAFSBLdBVBDAFZqFo8eYKtANfBC7AE5h8ZNOHd1FrDnh4VgmDO3ADkujDHPgHfkLZ84bfaLjg/hD6RFLq9z6wBDr+rvuZB1bAEDABY76pA2mGHyWSjvqmIemc4WsCLKOp4nssIj8wD8qS/iSVJK3N7OTeJPV9n72ZbV7iDuSc2BaQBQAAAABJRU5ErkJggg==';
    }
    return new Blockly.FieldImage(file, 12, 12, '"');
  }
};
Blockly.Blocks['js_literal_bool'] = {
  /**
   * Block for boolean data type: true and false.
   * @this Blockly.Block
   */
  init: function() {
    var BOOLEANS =
        [['true', 'true'],
         ['false', 'false']];
    this.setColour(220);
    this.setOutput(true, 'Boolean');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(BOOLEANS), 'BOOL');
    this.setTooltip(Blockly.Msg.LOGIC_BOOLEAN_TOOLTIP);
  }
};
Blockly.Blocks['js_this_expression'] = {
  init: function() {
    this.setColour(120);
    this.appendDummyInput()
        .appendField('this');
    this.setOutput(true);
    this.setTooltip("This expression.");
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
          .setCheck('js_json_element');
    this.setTooltip('Object in JSON format.');
  }
};
Blockly.Blocks['js_json_element'] = {
  init: function() {
    this.setColour(260);
    this.setPreviousStatement(true, 'js_json_element');
    this.setNextStatement(true, 'js_json_element');
    this.interpolateMsg(
        ' %1 : %2',
        ['KEY', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setTooltip('Element of a object in JSON format.');
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
Blockly.Blocks['js_computed_member_expression'] = {
  init: function() {
    this.setColour(160);
    this.interpolateMsg(
        '[%1]',
        ['MEMBER', null],
        Blockly.ALIGN_RIGHT);
    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip("Computed member of member expression.");
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
        '%1 = %2',
        ['VAR', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Variable declarator.');
  }
};
Blockly.Blocks['js_variable_declaration_unary'] = {
  /**
   * Block for redering a variable declarator.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.interpolateMsg(
        'var %1 = %2',
        ['VAR', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Variable declarator unary.');
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