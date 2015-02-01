Blocklify.JavaScript.Generator['js_function_expression'] = function(block) {
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'STACK');
  if (Blocklify.JavaScript.Generator.STATEMENT_PREFIX) {
    branch = Blocklify.JavaScript.Generator.prefixLines(
        Blocklify.JavaScript.Generator.STATEMENT_PREFIX.replace(/%1/g,
        '\'' + block.id + '\''), Blocklify.JavaScript.Generator.INDENT) + branch;
  }
  var name = Blocklify.JavaScript.Generator.valueToCode(block, 'NAME',
      Blocklify.JavaScript.Generator.ORDER_NONE);
  var args = [];
  for (var i = 0; i < block.paramCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'PARAM' + i,
      Blocklify.JavaScript.Generator.ORDER_NONE);
  }
  var code = 'function ' + name + '(' + args.join(', ') + ') {\n' +
      branch + '}';
  code = Blocklify.JavaScript.Generator.scrub_(block, code);
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};

Blockly.Blocks['anonimous_function_expression'] = {
  /**
   * Block for redering an anonimous function expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.interpolateMsg(
        'function (%1)',
        ['PARAMS', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.appendStatementInput('STACK');
    this.setTooltip('Anonimous function expression.');
  }
};
Blockly.Blocks['call_expression'] = {
  /**
   * Block for redering a call expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    /*
    this.interpolateMsg(
        '%1 (%2)',
        ['NAME', null],
        ['ARGUMENT0', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);*/
    this.appendValueInput('NAME');
    this.appendValueInput('ARGUMENT0')
          .appendField("(");
    this.appendDummyInput('END')
          .appendField(")");
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['call_expression_argument']));
    this.argCount = 1;
    this.setTooltip('Call expression.');
  },
  mutationToDom: function() {
    var container = document.createElement('mutation');
    container.setAttribute('args', this.argCount);
    return container;
  },
  domToMutation: function(xmlElement) {
    for (var x = 0; x < this.argCount; x++) {
      this.removeInput('ARGUMENT' + x);
    }
    this.argCount = parseInt(xmlElement.getAttribute('args'), 10);
    for (var x = 0; x < this.argCount; x++) {
      var input = this.appendValueInput('ARGUMENT' + x);
      if (x == 0) {
        input.appendField("(");
      }
    }
  },
  decompose: function(workspace) {
    var containerBlock =
        Blockly.Block.obtain(workspace, 'call_expression_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var x = 0; x < this.argCount; x++) {
      var argBlock = Blockly.Block.obtain(workspace, 'call_expression_argument');
      argBlock.initSvg();
      connection.connect(argBlock.previousConnection);
      connection = argBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    // Disconnect all input blocks and remove all inputs.
    if (this.argCount == 0) {
      this.removeInput('EMPTY');
    } else {
      for (var x = this.argCount - 1; x >= 0; x--) {
        this.removeInput('ARGUMENT' + x);
      }
    }
    this.removeInput('END');
    this.argCount = 0;
    // Rebuild the block's inputs.
    var argBlock = containerBlock.getInputTargetBlock('STACK');
    while (argBlock) {
      var input = this.appendValueInput('ARGUMENT' + this.argCount);
      if (this.argCount == 0) {
        input.appendField("(");
      }
      // Reconnect any child blocks.
      if (argBlock.valueConnection_) {
        input.connection.connect(argBlock.valueConnection_);
      }
      this.argCount++;
      argBlock = argBlock.nextConnection &&
          argBlock.nextConnection.targetBlock();
    }
    if (this.argCount == 0) {
      this.appendDummyInput('EMPTY')
          .appendField("(");
    }
    this.appendDummyInput('END')
          .appendField(")");
  },
  saveConnections: function(containerBlock) {
    var argBlock = containerBlock.getInputTargetBlock('STACK');
    var x = 0;
    while (argBlock) {
      var input = this.getInput('ARGUMENT' + x);
      argBlock.valueConnection_ = input && input.connection.targetConnection;
      x++;
      argBlock = argBlock.nextConnection &&
          argBlock.nextConnection.targetBlock();
    }
  },
  //compose the block with a options ( ability to do mutations from code).
  composeTo: function(numargs) {
    // Disconnect all input blocks and remove all inputs.
    if (this.argCount == 0) {
      this.removeInput('EMPTY');
    } else {
      for (var x = this.argCount - 1; x >= 0; x--) {
        this.removeInput('ARGUMENT' + x);
      }
    }
    this.removeInput('END');
    this.argCount = 0;
    // Rebuild the block's inputs.
    for (var i = 0 ; i < numargs ; i++) {
      var input = this.appendValueInput('ARGUMENT' + this.argCount);
      if (this.argCount == 0) {
        input.appendField("(");
      }
      this.argCount++;
    }
    if (this.argCount == 0) {
      this.appendDummyInput('EMPTY')
          .appendField("(");
    }
    this.appendDummyInput('END')
          .appendField(")");
  },
};

Blockly.Blocks['call_expression_container'] = {
  /**
   * Mutator block for list container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("function");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder arguments of the function.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['call_expression_argument'] = {
  /**
   * Mutator block for adding arguments to a function.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("argument");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add an argument to a function.");
    this.contextMenu = false;
  }
};