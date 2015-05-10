//expressions

'use strict'

Blockly.Blocks['js_if_statement'] = {
  /**
   * Block for if/elseif/else condition.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
    this.setColour(220);
    this.appendValueInput('IF0')
        .setCheck('Boolean')
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.appendStatementInput('DO0')
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.setMutator(new Blockly.Mutator(['js_elseif_statement',
                                         'js_else_statement']));
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      if (!thisBlock.elseifCount_ && !thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_1;
      } else if (!thisBlock.elseifCount_ && thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_2;
      } else if (thisBlock.elseifCount_ && !thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_3;
      } else if (thisBlock.elseifCount_ && thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_4;
      }
      return '';
    });
    this.elseifCount_ = 0;
    this.elseCount_ = 0;
  },
  /**
   * Create XML to represent the number of else-if and else inputs.
   * @return {Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    if (!this.elseifCount_ && !this.elseCount_) {
      return null;
    }
    var container = document.createElement('mutation');
    if (this.elseifCount_) {
      container.setAttribute('elseif', this.elseifCount_);
    }
    if (this.elseCount_) {
      container.setAttribute('else', 1);
    }
    return container;
  },
  /**
   * Parse XML to restore the else-if and else inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    this.elseifCount_ = parseInt(xmlElement.getAttribute('elseif'), 10);
    this.elseCount_ = parseInt(xmlElement.getAttribute('else'), 10);
    for (var i = 1; i <= this.elseifCount_; i++) {
      this.appendValueInput('IF' + i)
          .setCheck('Boolean')
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
      this.appendStatementInput('DO' + i)
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    }
    if (this.elseCount_) {
      this.appendStatementInput('ELSE')
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
    }
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function(workspace) {
    var containerBlock = Blockly.Block.obtain(workspace, 'js_if_if_statement');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 1; i <= this.elseifCount_; i++) {
      var elseifBlock = Blockly.Block.obtain(workspace, 'js_elseif_statement');
      elseifBlock.initSvg();
      connection.connect(elseifBlock.previousConnection);
      connection = elseifBlock.nextConnection;
    }
    if (this.elseCount_) {
      var elseBlock = Blockly.Block.obtain(workspace, 'js_else_statement');
      elseBlock.initSvg();
      connection.connect(elseBlock.previousConnection);
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function(containerBlock) {
    // Disconnect the else input blocks and remove the inputs.
    if (this.elseCount_) {
      this.removeInput('ELSE');
    }
    this.elseCount_ = 0;
    // Disconnect all the elseif input blocks and remove the inputs.
    for (var i = this.elseifCount_; i > 0; i--) {
      this.removeInput('IF' + i);
      this.removeInput('DO' + i);
    }
    this.elseifCount_ = 0;
    // Rebuild the block's optional inputs.
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'js_elseif_statement':
          this.elseifCount_++;
          var ifInput = this.appendValueInput('IF' + this.elseifCount_)
              .setCheck('Boolean')
              .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
          var doInput = this.appendStatementInput('DO' + this.elseifCount_);
          doInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
          // Reconnect any child blocks.
          if (clauseBlock.valueConnection_) {
            ifInput.connection.connect(clauseBlock.valueConnection_);
          }
          if (clauseBlock.statementConnection_) {
            doInput.connection.connect(clauseBlock.statementConnection_);
          }
          break;
        case 'js_else_statement':
          this.elseCount_++;
          var elseInput = this.appendStatementInput('ELSE');
          elseInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
          // Reconnect any child blocks.
          if (clauseBlock.statementConnection_) {
            elseInput.connection.connect(clauseBlock.statementConnection_);
          }
          break;
        default:
          throw 'Unknown block type.';
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  setCounts: function(elseifCount_, elseCount_) {
    // Disconnect the else input blocks and remove the inputs.
    if (this.elseCount_) {
      this.removeInput('ELSE');
    }
    this.elseCount_ = 0;
    // Disconnect all the elseif input blocks and remove the inputs.
    for (var i = this.elseifCount_; i > 0; i--) {
      this.removeInput('IF' + i);
      this.removeInput('DO' + i);
    }
    this.elseifCount_ = 0;
    // Rebuild the block's optional inputs.
    while (this.elseifCount_ < elseifCount_) {
      this.elseifCount_++;
      var ifInput = this.appendValueInput('IF' + this.elseifCount_)
          .setCheck('Boolean')
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
      var doInput = this.appendStatementInput('DO' + this.elseifCount_);
      doInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    }
    while (this.elseCount_ < elseCount_) {
      this.elseCount_++;
      var elseInput = this.appendStatementInput('ELSE');
      elseInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function(containerBlock) {
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 1;
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'js_elseif_statement':
          var inputIf = this.getInput('IF' + i);
          var inputDo = this.getInput('DO' + i);
          clauseBlock.valueConnection_ =
              inputIf && inputIf.connection.targetConnection;
          clauseBlock.statementConnection_ =
              inputDo && inputDo.connection.targetConnection;
          i++;
          break;
        case 'js_else_statement':
          var inputDo = this.getInput('ELSE');
          clauseBlock.statementConnection_ =
              inputDo && inputDo.connection.targetConnection;
          break;
        default:
          throw 'Unknown block type.';
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  }
};

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
