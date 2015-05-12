//expressions

'use strict'

Blockly.Blocks['js_if_if_statement'] = {
  /**
   * Mutator block for if container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(220);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_IF_TITLE_IF);
    this.appendStatementInput('STACK');
    this.setTooltip(Blockly.Msg.CONTROLS_IF_IF_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_elseif_statement'] = {
  /**
   * Mutator bolck for else-if condition.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(220);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_ELSEIF_TITLE_ELSEIF);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.CONTROLS_IF_ELSEIF_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_else_statement'] = {
  /**
   * Mutator block for else condition.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(220);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_ELSE_TITLE_ELSE);
    this.setPreviousStatement(true);
    this.setTooltip(Blockly.Msg.CONTROLS_IF_ELSE_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_assignment_expression'] = {
  /**
   * Block for redering a assignment expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
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
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
  }
};
Blockly.Blocks['js_update_expression_noprefix'] = {
  /**
   * Block for redering a no prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(230);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.interpolateMsg(
        '%1 %2',
        ['ARGUMENT', null],
        ['OPERATOR', new Blockly.FieldTextInput('++')],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Update expression without prefix.');
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
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

//Member expressions
Blockly.Blocks['js_member_expression'] = {
  /**
   * Block for redering a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.setOutput(true);
    this.appendValueInput('MEMBER0');
    this.appendDummyInput('END'); //TODO: fix mutator for omiting it
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_member_expression_member']));
    this.memberCount = 1;
    this.setTooltip('Member expression.');
    var argMutator = {
      name: 'clone',
      target: 'MEMBER',
      mutatorContainer: 'js_member_expression_container',
      mutatorArgument: 'js_member_expression_member',
      elementCount: 'memberCount'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator]);
    this.setMembers = this.setElements;
  }
};

Blockly.Blocks['js_member_expression_container'] = {
  /**
   * Mutator block for function container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("member expression");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder members of the memeber expression.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_member_expression_member'] = {
  /**
   * Mutator block for adding members to a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("member");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add a member to a member expression.");
    this.contextMenu = false;
  }
};

//Arrays
Blockly.Blocks['js_array_expression'] = {
  /**
   * Block for redering a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(120);
    this.setOutput(true);
    this.appendValueInput('ELEMENT0')
        .appendField('[');
    this.appendDummyInput('END')
        .appendField(']');
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_array_expression_element']));
    this.elementCount = 1;
    this.setTooltip('Array expression.');
    var argMutator = {
      name: 'clone',
      target: 'ELEMENT',
      mutatorContainer: 'js_array_expression_container',
      mutatorArgument: 'js_array_expression_element',
      elementCount: 'elementCount',
      startText: '[',
      endText: ']'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator]);
  }
};

Blockly.Blocks['js_array_expression_container'] = {
  /**
   * Mutator block for function container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("array");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder elements of the array.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_array_expression_element'] = {
  /**
   * Mutator block for adding members to a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add a element to an array expression.");
    this.contextMenu = false;
  }
};
