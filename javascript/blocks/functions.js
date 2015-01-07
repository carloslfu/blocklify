//function blocks
//TODO: implement mutators for usability

'use strict'

goog.provide('Blocklify.JavaScript.Blocks.functions');

goog.require('Blocklify.JavaScript.Blocks.mutators');


Blockly.Blocks['js_function_expression'] = {
  /**
   * Block for redering a function expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
          .appendField("function");
    this.appendValueInput('NAME');
    this.appendValueInput('PARAM0')
          .appendField("(");
    this.appendDummyInput('END')
          .appendField(")");
    this.appendStatementInput('STACK');
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_function_expression_param']));
    this.paramCount = 1;
    this.setTooltip('Function expression.');
    var argMutator = {
      name: 'clone',
      target: 'PARAM',
      mutatorContainer: 'js_function_expression_container',
      mutatorArgument: 'js_function_expression_param',
      elementCount: 'paramCount'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator, {name: 'switch'}]);
    this.setParams = this.setElements;
    this.setOutput_(true);
    var removeStack = function(block) {
      var stackBlock = this.getInputTargetBlock('STACK');
      var connection = null;
      if (stackBlock) {
        connection = this.getInputTargetBlock('STACK').previousConnection;
      }
      this.removeInput('STACK');
      return connection;
    }
    var addStack = function(connection) {
      var input = this.appendStatementInput('STACK');
      if (connection) {
        connection.connect(input.connection);
      }
    }
    var blockDomToMutation = this.domToMutation;
    this.domToMutation = function(xmlElement) {
      var connection = removeStack.call(this);
      blockDomToMutation.call(this, xmlElement);
      addStack.call(this,connection);
    };
    var blockSetParams = this.setParams;
    this.setParams = function(numparams) {
      var connection = removeStack.call(this);
      blockSetParams.call(this, numparams);
      addStack.call(this,connection);
    };
    var blockCompose = this.compose;
    this.compose = function(containerBlock) {
      var connection = removeStack.call(this);
      blockCompose.call(this, containerBlock);
      addStack.call(this,connection);
    };
  }
};

Blockly.Blocks['js_anonimous_function_expression'] = {
  /**
   * Block for redering a function expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
          .appendField("function");
    this.appendValueInput('PARAM0')
          .appendField("(");
    this.appendDummyInput('END')
          .appendField(")");
    this.appendStatementInput('STACK');
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_function_expression_param']));
    this.paramCount = 1;
    this.setTooltip('Function expression.');
    var argMutator = {
      name: 'clone',
      target: 'PARAM',
      mutatorContainer: 'js_function_expression_container',
      mutatorArgument: 'js_function_expression_param',
      elementCount: 'paramCount'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator, {name: 'switch'}]);
    this.setParams = this.setElements;
    this.setOutput_(true);
    var removeStack = function(block) {
      var stackBlock = this.getInputTargetBlock('STACK');
      var connection = null;
      if (stackBlock) {
        connection = this.getInputTargetBlock('STACK').previousConnection;
      }
      this.removeInput('STACK');
      return connection;
    }
    var addStack = function(connection) {
      var input = this.appendStatementInput('STACK');
      if (connection) {
        connection.connect(input.connection);
      }
    }
    var blockDomToMutation = this.domToMutation;
    this.domToMutation = function(xmlElement) {
      var connection = removeStack.call(this);
      blockDomToMutation.call(this, xmlElement);
      addStack.call(this,connection);
    };
    var blockSetParams = this.setParams;
    this.setParams = function(numparams) {
      var connection = removeStack.call(this);
      blockSetParams.call(this, numparams);
      addStack.call(this,connection);
    };
    var blockCompose = this.compose;
    this.compose = function(containerBlock) {
      var connection = removeStack.call(this);
      blockCompose.call(this, containerBlock);
      addStack.call(this,connection);
    };
  }
};

Blockly.Blocks['js_function_expression_container'] = {
  /**
   * Mutator block for list container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
        .appendField("function");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder arguments of the function.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_function_expression_param'] = {
  /**
   * Mutator block for adding arguments to a function.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
        .appendField("argument");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add an argument to a function.");
    this.contextMenu = false;
  }
};


Blockly.Blocks['js_call_expression'] = {
  /**
   * Block for redering a call expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendValueInput('NAME');
    this.appendValueInput('ARGUMENT0')
          .appendField("(");
    this.appendDummyInput('END')
          .appendField(")");
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_call_expression_argument']));
    this.argCount = 1;
    this.setTooltip('Call expression.');
    var argMutator = {
      name: 'clone',
      target: 'ARGUMENT',
      mutatorContainer: 'js_call_expression_container',
      mutatorArgument: 'js_call_expression_argument',
      elementCount: 'argCount'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator, {name: 'switch'}]);
    this.setArguments = this.setElements;
    this.setOutput_(false);
  }
};

Blockly.Blocks['js_call_expression_container'] = {
  /**
   * Mutator block for function container.
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

Blockly.Blocks['js_call_expression_argument'] = {
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