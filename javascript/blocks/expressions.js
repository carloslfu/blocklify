//expressions

'use strict'

Blockly.Blocks['js_assignment_expression'] = {
  /**
   * Block for redering a assignment expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['=', '='],
      ['+=', '+='],
      ['-=', '-='],
      ['*=', '*='],
      ['/=', '/='],
      ['%=', '%='],
      ['&=', '&='],
      ['^=', '^='],
      ['|=', '|='],
      ['>>=', '>>='],
      ['<<=', '<<='],
      ['>>>=', '>>>=']
    ];
    this.jsonInit({
      "id": "js_assignment_expression",
      "message0": "set %1 %2 %3",
      "args0": [
        {
          "type": "input_value",
          "name": "VAR"
        },
        {
          "type": "field_dropdown",
          "name": "OPERATOR",
          "options": OPERATORS
        },
        {
          "type": "input_value",
          "name": "VALUE",
          "align": "RIGHT"
        }
      ],
      "colour": 330,
      "previousStatement": "Statement",
      "nextStatement": "Statement",
      "inputsInline": true,
      "tooltip": "Assignment expression."
    });
  }
};

Blockly.Blocks['js_update_expression_prefix'] = {
  /**
   * Block for redering a prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['++', '++'],
      ['--', '--']
    ];
    this.jsonInit({
      "id": "js_update_expression_prefix",
      "message0": "%1 %2",
      "args0": [
        {
          "type": "field_dropdown",
          "name": "OPERATOR",
          "options": OPERATORS
        },
        {
          "type": "input_value",
          "name": "ARGUMENT",
          "align": "RIGHT"
        }
      ],
      "colour": 230,
      "previousStatement": null,
      "nextStatement": null,
      "inputsInline": true,
      "tooltip": "Update expression with prefix."
    });
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
  }
};

Blockly.Blocks['js_update_expression_noprefix'] = {
  /**
   * Block for redering a no prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['++', '++'],
      ['--', '--']
    ];
    this.jsonInit({
      "id": "js_update_expression_noprefix",
      "message0": "%1 %2",
      "args0": [
        {
          "type": "input_value",
          "name": "ARGUMENT"
        },
        {
          "type": "field_dropdown",
          "name": "OPERATOR",
          "options": OPERATORS,
          "align": "RIGHT"
        }
      ],
      "colour": 230,
      "previousStatement": "Statement",
      "nextStatement": "Statement",
      "inputsInline": true,
      "tooltip": "Update expression without prefix."
    });
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
  }
};

// TODO: sepearate this block in three blocks: js_binary_expression_logical, js_binary_expression_aritmetic and
//       js_binary_expression_bitwise beacause the dropdown is so large
Blockly.Blocks['js_binary_expression'] = {
  /**
   * Block for redering a binary expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['+', '+'],
      ['-', '-'],
      ['*', '*'],
      ['/', '/'],
      ['%', '%'],
      ['==', '=='],
      ['!=', '!='],
      ['>', '>'],
      ['<', '<'],
      ['>=', '>='],
      ['<=', '<='],
      ['===', '==='],
      ['!==', '!=='],
      ['&', '&'],
      ['^', '^'],
      ['|', '|'],
      ['>>', '>>'],
      ['<<', '<<'],
      ['>>>', '>>>']
    ];
    this.jsonInit({
      "id": "js_binary_expression",
      "message0": "%1 %2 %3",
      "args0": [
        {
          "type": "input_value",
          "name": "LEFT"
        },
        {
          "type": "field_dropdown",
          "name": "OPERATOR",
          "options": OPERATORS
        },
        {
          "type": "input_value",
          "name": "RIGHT",
          "align": "RIGHT"
        }
      ],
      "colour": 230,
      "output": null,
      "inputsInline": true,
      "tooltip": "Binary expression."
    });
  }
};

Blockly.Blocks['js_logical_expression'] = {
  /**
   * Block for redering a logical expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['&&', '&&'],
      ['||', '||']
    ];
    this.jsonInit({
      "id": "js_logical_expression",
      "message0": "%1 %2 %3",
      "args0": [
        {
          "type": "input_value",
          "name": "LEFT"
        },
        {
          "type": "field_dropdown",
          "name": "OPERATOR",
          "options": OPERATORS
        },
        {
          "type": "input_value",
          "name": "RIGHT",
          "align": "RIGHT"
        }
      ],
      "colour": 220,
      "output": null,
      "inputsInline": true,
      "tooltip": "Logical expression."
    });
  }
};

// Unary expressions
Blockly.Blocks['js_unary_expression'] = {
  /**
   * Block for redering a binary expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['+', '+'],
      ['-', '-']
    ];
    this.setColour(230);
    this.setOutput(true);
    this.appendValueInput('ARGUMENT')
      .appendField(new Blockly.FieldDropdown(OPERATORS), 'OPERATOR')
      .setAlign(Blockly.ALIGN_RIGHT);
    this.setTooltip('Unary expression.');
  }
};

// Member expressions
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
   * Mutator block for array container.
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
    this.setTooltip("Add an element to an array expression.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_new_expression'] = {
  /**
   * Block for redering a prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.setOutput(true);
    this.appendValueInput('CLASS')
        .appendField('new ');
    this.appendValueInput('ARGUMENT0')
        .appendField('(');
    this.appendDummyInput('END')
        .appendField(')');
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_new_expression_element']));
    this.setTooltip('New expression.');
    this.argumentCount = 1;
    var argMutator = {
      name: 'clone',
      target: 'ARGUMENT',
      mutatorContainer: 'js_new_expression_container',
      mutatorArgument: 'js_new_expression_element',
      elementCount: 'argumentCount',
      startText: '(',
      endText: ')'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator]);
  }
};

Blockly.Blocks['js_new_expression_container'] = {
  /**
   * Mutator block for new-expression container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("constructor");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder elements of the new-expression.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_new_expression_element'] = {
  /**
   * Mutator block for adding arguments to a new-expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("argument");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add a argument to a new-expression.");
    this.contextMenu = false;
  }
};
