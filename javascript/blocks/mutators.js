//mutator templates for blocks

'use strict'

goog.provide('Blocklify.JavaScript.Blocks.mutators');


Blocklify.JavaScript.Blocks.mutators['clone'] = function (block, options){
  var xmlAttrName = options.target.toLowerCase() + 's';
  var elementCount = options.elementCount;

  var blockMutationToDom = block.mutationToDom;
  block.mutationToDom = function() {
    if (blockMutationToDom) {
      var container = blockMutationToDom.call(this);
    } else {
      var container = document.createElement('mutation');
    }
    container.setAttribute(xmlAttrName, this[elementCount]);
    return container;
  };
  var blockDomToMutation = block.domToMutation;
  block.domToMutation = function(xmlElement) {
    if (blockDomToMutation) {
      blockDomToMutation.call(this, xmlElement);
    }
    if (this[elementCount] == 0) {
      this.removeInput('START');
    }
    for (var x = 0; x < this[elementCount]; x++) {
      this.removeInput(options.target + x);
    }
    this.removeInput('END');
    this[elementCount] = parseInt(xmlElement.getAttribute(xmlAttrName), 10);
    if (this[elementCount] == 0) {
      this.appendDummyInput('START').appendField("(");
    } else {
      for (var x = 0; x < this[elementCount]; x++) {
        var input = this.appendValueInput(options.target + x);
        if (x == 0) {
          input.appendField("(")
        }
      }
    }
    this.appendDummyInput('END')
          .appendField(")");
  };
  var blockDecompose = block.decompose;
  block.decompose = function(workspace) {
    if (blockDecompose) {
      blockDecompose.call(this, workspace);
    }
    var containerBlock =
        Blockly.Block.obtain(workspace, options.mutatorContainer);
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var x = 0; x < this[elementCount]; x++) {
      var argBlock = Blockly.Block.obtain(workspace, options.mutatorArgument);
      argBlock.initSvg();
      connection.connect(argBlock.previousConnection);
      connection = argBlock.nextConnection;
    }
    return containerBlock;
  };
  var blockCompose = block.compose;
  block.compose = function(containerBlock) {
    if (blockCompose) {
      blockCompose.call(this, containerBlock);
    }
    // Disconnect all input blocks and remove all inputs.
    if (this[elementCount] == 0) {
      this.removeInput('START');
    }
    for (var x = this[elementCount] - 1; x >= 0; x--) {
      this.removeInput(options.target + x);
    }
    this.removeInput('END');
    this[elementCount] = 0;
    // Rebuild the block's inputs.
    var argBlock = containerBlock.getInputTargetBlock('STACK');
    while (argBlock) {
      var input = this.appendValueInput(options.target + this[elementCount]);
      if (this[elementCount] == 0) {
        input.appendField("(");
      }
      // Reconnect any child blocks.
      if (argBlock.valueConnection_) {
        input.connection.connect(argBlock.valueConnection_);
      }
      this[elementCount]++;
      argBlock = argBlock.nextConnection &&
          argBlock.nextConnection.targetBlock();
    }
    if (this[elementCount] == 0) {
      this.appendDummyInput('START').appendField("(");
    }
    this.appendDummyInput('END')
          .appendField(")");
  };
  block.saveConnections = function(containerBlock) {
    var argBlock = containerBlock.getInputTargetBlock('STACK');
    var x = 0;
    while (argBlock) {
      var input = this.getInput(options.target + x);
      argBlock.valueConnection_ = input && input.connection.targetConnection;
      x++;
      argBlock = argBlock.nextConnection &&
          argBlock.nextConnection.targetBlock();
    }
  };
  //compose the block with a options ( ability to do mutations from code).
  block.setElements = function(numels) {
    // Disconnect all input blocks and remove all inputs.
    if (this[elementCount] == 0) {
      this.removeInput('START');
    }
    for (var x = this[elementCount] - 1; x >= 0; x--) {
      this.removeInput(options.target + x);
    }
    this.removeInput('END');
    this[elementCount] = numels;
    if (numels == 0) {
      this.appendDummyInput('START').appendField("(");
    } else {
      // Rebuild the block's inputs.
      for (var i = 0 ; i < numels ; i++) {
        var input = this.appendValueInput(options.target + i);
        if (i == 0) {
          input.appendField("(");
        }
      }
    }
    this.appendDummyInput('END')
          .appendField(")");
  };
};


////
Blocklify.JavaScript.Blocks.mutators['switch'] = function (block, options){
  var elementCount = options.elementCount;

  var blockMutationToDom = block.mutationToDom;
  block.mutationToDom = function() {
    if (blockMutationToDom) {
      var container = blockMutationToDom.call(this);
    } else {
      var container = document.createElement('mutation');
    }
    if (this.hasOutput_) {
      container.setAttribute('output', 'true');
    } else {
      container.setAttribute('output', 'false');
    }
    return container;
  };
  var blockDomToMutation = block.domToMutation;
  block.domToMutation = function(xmlElement) {
    if (blockDomToMutation) {
      blockDomToMutation.call(this, xmlElement);
    }
    this.setOutput_(xmlElement.getAttribute('output') !== 'false');
  };

  block.setOutput_ = function(hasOutput) {
    if (this.hasOutput_ == hasOutput) {
      return;
    }
    this.unplug(true, false);
    if (hasOutput) {
      this.setPreviousStatement(false);
      this.setNextStatement(false);
      this.setOutput(true);
    } else {
      this.setOutput(false);
      this.setPreviousStatement(true);
      this.setNextStatement(true);
    }
    this.hasOutput_ = hasOutput;
  };
  var blockCustomContextMenu = block.customContextMenu;
  block.customContextMenu = function(options) {
    if (blockCustomContextMenu) {
      blockCustomContextMenu.call(this, options);
    }
    var option = {enabled: true};
    if (this.hasOutput_) {
      option.text = 'Remove Output';
    } else {
      option.text = 'Add Output';
    }
    var callbackFactory = function(block){
      return function() {
        block.setOutput_(!block.hasOutput_);
      };
    }
    option.callback = callbackFactory(this);
    options.push(option);
  };
};