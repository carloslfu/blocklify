// Example of importer for blockly core blocks. Importer API experiment - work in progress, importer will be a class.

// first import js block generators into blockly js generator context
for (el in Blocklify.JavaScript.Generator) {
  if (el.substring(0,3) == 'js_') {
    Blockly.JavaScript[el] = Blocklify.JavaScript.Generator[el];
  }
}

// now the block importer
Blockly.JavaScript.importer = function(node, parent, options) {
  // this is the importer for blockly block (pattern converter)
  //the return block
  var block = null, field;
  //none-estetic inline blocks
  var no_inline_blocks = [];
  switch (node.type) {
    case "Program":
      block = goog.dom.createDom('xml');
      Blocklify.JavaScript.importer.appendStatement(block, node.body, node, options);
      break;
    case "BlockStatement":
      block = Blocklify.JavaScript.importer.appendStatement(null, node.body, node, options);
      break;
    case "Literal":
      block = goog.dom.createDom('block');
      if (node.value == null) {
        block.setAttribute('type' ,'logic_null');
      } else {
        var nodeType = typeof(node.value);
        if (nodeType == "number") {
          block.setAttribute('type' ,'math_number');
          Blocklify.JavaScript.importer.appendField(block, 'NUM', node.value + '');
        } else if(nodeType == "string") {
          block.setAttribute('type' ,'text');
          Blocklify.JavaScript.importer.appendField(block, 'TEXT', node.value);
        } else if(nodeType == "boolean") {
          block.setAttribute('type' ,'logic_boolean');
          Blocklify.JavaScript.importer.appendField(block, 'BOOL', node.raw);
        }
      }
      break;
    case "IfStatement":
      block = Blocklify.JavaScript.importer.createBlock('controls_if');
      var tests = [], consequents = [], current_node = node.alternate, countElseIf = 0, countElse = 0;
      tests.push(Blocklify.JavaScript.importer.convert_atomic(node.test, node, options));
      Blocklify.JavaScript.importer.setOutput(tests[0], true);
      consequents.push(Blocklify.JavaScript.importer.convert_atomic(node.consequent, node, options));
      Blocklify.JavaScript.importer.setOutput(tests[0], true);
      while (current_node) {
        if (current_node.type == 'IfStatement') {
          countElseIf++;
          tests.push(Blocklify.JavaScript.importer.convert_atomic(current_node.test, current_node, options));
          Blocklify.JavaScript.importer.setOutput(tests[tests.length-1], true);
          consequents.push(Blocklify.JavaScript.importer.convert_atomic(current_node.consequent, current_node, options));
          current_node = current_node.alternate;
        } else {
          countElse = 1;
          var alternate = Blocklify.JavaScript.importer.convert_atomic(current_node.alternate || current_node, node, options);
          current_node = null;
        }
      };
      var mutation = goog.dom.createDom('mutation');
      block.appendChild(mutation);
      mutation.setAttribute('elseif', countElseIf + '');
      mutation.setAttribute('else', countElse + '');
      Blocklify.JavaScript.importer.appendValueInput(block, 'IF0', tests[0]);
      Blocklify.JavaScript.importer.appendValueInput(block, 'DO0', consequents[0]);
      for (var i = 1; i <= countElseIf; i++) {
        Blocklify.JavaScript.importer.appendValueInput(block, 'IF' + i, tests[i]);
        Blocklify.JavaScript.importer.appendValueInput(block, 'DO' + i, consequents[i]);
      }
      if (countElse == 1) {
        Blocklify.JavaScript.importer.appendValueInput(block, 'ELSE', alternate);
      }
      break;
    default:  // if not implemented block
      break;
  }
  return block;
};

// register the importer
Blocklify.JavaScript.importer.importers.push(Blockly.JavaScript.importer);
