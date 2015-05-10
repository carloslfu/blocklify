/**
 * @license
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Helper functions for parse from Javascript to xml Blockly blocks.
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

// TODOs:
//  - Support for: UnaryExpression, NewExpression, LogicalExpression, ThrowStatement

goog.provide('Blocklify.JavaScript.importer');

/**
 * JavaScript AST to blockls XML parser.
 * @type !Blockly.Generator
 */
Blocklify.JavaScript.importer = new Blocklify.importer('JavaScript');

Blocklify.JavaScript.importer.astParser = Blocklify.JavaScript.astParser;


Blocklify.JavaScript.importer.no_inline_atomic_blocks = ["FunctionExpression", "ObjectExpression"];

Blocklify.JavaScript.importer.convert = function(node, parent, level) {
  switch (level) {
    case 'atomic':
      return Blocklify.JavaScript.importer.convert_atomic(node, parent);
    case 'pattern':
      return Blocklify.JavaScript.importer.convert_pattern(node, parent);
  }
};
Blocklify.JavaScript.importer.notimplementedblockmsg = function(node) {
  var block = goog.dom.createDom('block');
  block.setAttribute('type', 'js_notimplemented');
  console.log("not yet implemented node:");
  console.log(node);
  return block;
};
Blocklify.JavaScript.importer.createBlock = function(type) {
  var block = goog.dom.createDom('block');
  block.setAttribute('type', type);
  return block;
};
Blocklify.JavaScript.importer.appendField = function(block, name, value) {
  var field = goog.dom.createDom('field', null, value);
  field.setAttribute('name', name);
  block.appendChild(field);
};
Blocklify.JavaScript.importer.appendValueInput = function(block, name, blockValue) {
  var field = goog.dom.createDom('value', null, blockValue);
  field.setAttribute('name', name);
  block.appendChild(field);
};
Blocklify.JavaScript.importer.appendStatement = function(block, statements, parent) {
  var tempBlock, lastBlock, statementBlock, rootBlock;
  if (statements.length == 0) {
    return;
  }
  rootBlock = Blocklify.JavaScript.importer.convert_atomic(statements[0], parent);
  lastBlock = rootBlock;
  for (var i = 1; i < statements.length; i++) {
    tempBlock = goog.dom.createDom('next');
    statementBlock = Blocklify.JavaScript.importer.convert_atomic(statements[i], parent);
    if (typeof(statementBlock) == 'object') {
      tempBlock.appendChild(statementBlock);
      lastBlock.appendChild(tempBlock);
      lastBlock = statementBlock;
    }
  };
  if (block == null) {
    return rootBlock;
  } else {
    block.appendChild(rootBlock);
  }
};
Blocklify.JavaScript.importer.setOutput = function(block, bool) {
  var mutation = block.getElementsByTagName('mutation')[0]; // one mutation element per block
  if (mutation == undefined) {
    mutation = goog.dom.createDom('mutation');
    block.appendChild(mutation);
  }
  mutation.setAttribute('output', bool + '');
};
Blocklify.JavaScript.importer.appendCloneMutation = function(block, name, elementName, elements, parent) {
  var mutation = block.getElementsByTagName('mutation')[0]; // one mutation element per block
  if (mutation == undefined) {
    mutation = goog.dom.createDom('mutation');
    block.appendChild(mutation);
  }
  var inlineFlag = false;
  mutation.setAttribute(name, elements.length + '');
  for (var i = 0; i < elements.length; i++) {
    var elementBlock = Blocklify.JavaScript.importer.convert_atomic(elements[i], parent);
    Blocklify.JavaScript.importer.setOutput(elementBlock, true);
    Blocklify.JavaScript.importer.appendValueInput(block, elementName + i, elementBlock);
  }
};

/**
 * Function to convert the nodes to xml blocks at atomic level.
 */
Blocklify.JavaScript.importer.convert_atomic = function(node, parent) {
  //the return block
  var block = {}, field;
  //none-estetic inline blocks
  var no_inline_blocks = Blocklify.JavaScript.importer.no_inline_atomic_blocks;
  //warn for incompatibility of blockly with JS language or not implemented feature
  if (node == null) {
    block = goog.dom.createDom('block');
    block.setAttribute('type', 'js_null_value');
    return block;
  }
  switch (node.type) {
    case "Program":
      block = goog.dom.createDom('xml');
      Blocklify.JavaScript.importer.appendStatement(block, node.body, node);
      break;
    case "BlockStatement":
      block = Blocklify.JavaScript.importer.appendStatement(null, node.body, node);
      break;
    case "ExpressionStatement":
      block = Blocklify.JavaScript.importer.convert_atomic(node.expression, node);
      break;
    case "Literal":
      block = goog.dom.createDom('block');
      if (node.value == null) {
        block.setAttribute('type' ,"js_null_value");
      } else {
        var nodeType = typeof(node.value);
        if (nodeType == "number") {
          block.setAttribute('type' ,'js_literal_number');
          Blocklify.JavaScript.importer.appendField(block, 'NUMBER', node.value + '');
        } else if(nodeType == "string") {
          block.setAttribute('type' ,'js_literal_string');
          Blocklify.JavaScript.importer.appendField(block, 'STRING', node.value);
        } else if(nodeType == "boolean") {
          block.setAttribute('type' ,'js_literal_bool');
          Blocklify.JavaScript.importer.appendField(block, 'BOOL', node.raw);
        }
      }
      break;
    case "AssignmentExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_assignment_expression');
      var leftBlock = Blocklify.JavaScript.importer.convert_atomic(node.left, node);
      var rightBlock = Blocklify.JavaScript.importer.convert_atomic(node.right, node);
      //fix estetic, only literal has inline
      if (no_inline_blocks.indexOf(node.right.type) != -1) {
        block.setAttribute('inline', 'false');
      }
      //force output
      leftBlock.setAttribute('output', 'true');
      rightBlock.setAttribute('output', 'true');
      Blocklify.JavaScript.importer.appendValueInput(block, 'VAR', leftBlock);
      Blocklify.JavaScript.importer.appendField(block, 'OPERATOR', node.operator);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', rightBlock);
      break;
    case "VariableDeclarator":
      block = Blocklify.JavaScript.importer.createBlock('js_variable_declarator');
      var varBlock = Blocklify.JavaScript.importer.convert_atomic(node.id, node);
      if (node.init == null) {
        node.init = {type:'Identifier', name: 'undefined'};
      }
      var initBlock = Blocklify.JavaScript.importer.convert_atomic(node.init, node);
      //fix estetic, only literal has inline
      if (node.init) {
        if (no_inline_blocks.indexOf(node.init.type) != -1) {
          block.setAttribute('inline', 'false');
        }
      }
      varBlock.setAttribute('output', 'true');
      initBlock.setAttribute('output', 'true');
      Blocklify.JavaScript.importer.appendValueInput(block, 'VAR', varBlock);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', initBlock);
      break;
    case "VariableDeclaration":
      if (node.declarations.length == 1) {
        block = Blocklify.JavaScript.importer.createBlock('js_variable_declaration_unary');
        if (node.declarations[0].init == null) {
          node.declarations[0].init = {type:'Identifier', name: 'undefined'};
        }
        var initBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[0].init, node.declarations[0]);
        var varBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[0].id, node.declarations[0]);
        //fix estetic, only literal has inline
        if (node.declarations[0].init) { //TODO: make global variable for none-estetic inline blocks
          if (no_inline_blocks.indexOf(node.declarations[0].init.type) != -1) {
            block.setAttribute('inline', 'false');
          }
        }
        varBlock.setAttribute('output', 'true');
        initBlock.setAttribute('output', 'true');
        Blocklify.JavaScript.importer.appendValueInput(block, 'VAR', varBlock);
        Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', initBlock);
      } else {
        var tempBlock, lastBlock, statementBlock, rootBlock;
        rootBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[0]);
        lastBlock = rootBlock;
        for (var i = 1; i < node.declarations.length; i++) {
          tempBlock = goog.dom.createDom('next');
          statementBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[i]);
          tempBlock.appendChild(statementBlock);
          lastBlock.appendChild(tempBlock);
          lastBlock = statementBlock;
        };
        block = Blocklify.JavaScript.importer.createBlock('js_variable_declaration');
        Blocklify.JavaScript.importer.appendValueInput(block, 'DECLARATIONS', rootBlock);
      }
      break;
    case "CallExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_call_expression');
      var nameBlock = Blocklify.JavaScript.importer.convert_atomic(node.callee, node, workspace);
      var inlineFlag = false;
      block.setArguments(node.arguments.length);
      node.arguments.forEach(function (element, index){
        var argBlock = Blocklify.JavaScript.Parser.render_atomic(element, node, workspace);
        Blocklify.JavaScript.Parser.force_output(argBlock);
        block.getInput('ARGUMENT' + index).connection.connect(argBlock.outputConnection);
        inlineFlag = inlineFlag || (no_inline_blocks.indexOf(element.type) != -1);
      });
      if (inlineFlag) {
        block.setInputsInline(false);
      }
      block.getInput('NAME').connection.connect(nameBlock.outputConnection);
      break;
    case "FunctionExpression":
      if (node.id != null) {
        block = Blockly.Block.obtain(workspace ,"js_function_expression");
        var nameBlock = Blocklify.JavaScript.importer.convert_atomic(node.id, node, workspace);
      } else {
        block = Blockly.Block.obtain(workspace ,"js_anonimous_function_expression");
      }
      var stackBlock = Blocklify.JavaScript.importer.convert_atomic(node.body, node, workspace);
      var inlineFlag = false;
      block.initSvg();
      block.render();
      block.setParams(node.params.length);
      node.params.forEach(function (element, index){
        var paramBlock = Blocklify.JavaScript.importer.convert_atomic(element, node);
        Blocklify.JavaScript.Parser.force_output(paramBlock);
        block.getInput('PARAM' + index).connection.connect(paramBlock.outputConnection);
        inlineFlag = inlineFlag || (no_inline_blocks.indexOf(element.type) != -1);
      });
      if (inlineFlag) {
        block.setInputsInline(false);
      }
      if (node.id != null) {
        block.getInput('NAME').connection.connect(nameBlock.outputConnection);
      }
      if (stackBlock) {
        block.getInput('STACK').connection.connect(stackBlock.previousConnection);
      }
      break;
    case "FunctionDeclaration":
      block = Blocklify.JavaScript.importer.createBlock('js_function_expression');
      var nameBlock = Blocklify.JavaScript.importer.convert_atomic(node.id, node);
      var stackBlock = Blocklify.JavaScript.importer.convert_atomic(node.body, node);
      Blocklify.JavaScript.importer.setOutput(block, false);
      Blocklify.JavaScript.importer.appendCloneMutation(block, 'params', 'PARAM', node.params, node);
      Blocklify.JavaScript.importer.appendValueInput(block, 'NAME', nameBlock);
      Blocklify.JavaScript.importer.appendValueInput(block, 'STACK', stackBlock);
      break;
    case 'EmptyStatement':
      block = 'Ignore'; // Ignore EmptyStatement
      break;
    case 'Identifier':
      if(parent.type == 'MemberExpression' && parent.computed) {
        block = Blocklify.JavaScript.importer.createBlock('js_computed_member_expression');
        var memberBlock = Blocklify.JavaScript.Parser.render_atomic(node, node, workspace);
        block.getInput('MEMBER').connection.connect(memberBlock.outputConnection);
      } else if (node.name == 'undefined') {
        block = Blocklify.JavaScript.importer.createBlock('js_undefined_value');
      } else {
        block = Blocklify.JavaScript.importer.createBlock('js_identifier');
        Blocklify.JavaScript.importer.appendField(block, 'NAME', node.name);
      }
      break;
    case "MemberExpression":
      var current_node = node, count = 2, memberBlock, member, parentM = node;
      while (current_node.object.type == "MemberExpression") {
        count++;
        current_node = current_node.object;
      }
      block = Blockly.Block.obtain(workspace ,"js_member_expression");
      block.setMembers(count);
      for (var i = count-1, current_node = node; i >= 0; i--) {
        //condition for final node
        member = (i == 0)?current_node:current_node.property;
        memberBlock = Blocklify.JavaScript.Parser.render_atomic(member, parentM, workspace);
        Blocklify.JavaScript.Parser.force_output(memberBlock);
        block.getInput('MEMBER' + i).connection.connect(memberBlock.outputConnection);
        current_node = current_node.object;
        parentM = current_node;
      };
      block.initSvg();
      block.render();
      break;
    case "ReturnStatement":
      block = Blocklify.JavaScript.importer.createBlock('js_return_statement');
      var argBlock = Blocklify.JavaScript.Parser.render_atomic(node.argument, node, workspace);
      Blocklify.JavaScript.Parser.force_output(argBlock);
      block.initSvg();
      block.getInput('VALUE').connection.connect(argBlock.outputConnection);
      block.render();
      break;
    case "UpdateExpression":
      if (node.prefix == true) {
        block = Blockly.Block.obtain(workspace ,"js_update_expression_prefix");
      } else {
        block = Blockly.Block.obtain(workspace ,"js_update_expression_noprefix");
      }
      var argBlock = Blocklify.JavaScript.Parser.render_atomic(node.argument, node, workspace);
      block.setFieldValue(node.operator, 'OPERATOR');
      block.initSvg();
      block.getInput('ARGUMENT').connection.connect(argBlock.outputConnection);
      block.render();
      break;
    case "BinaryExpression":
      block = Blockly.Block.obtain(workspace ,"js_binary_expression");
      var leftBlock = Blocklify.JavaScript.Parser.render_atomic(node.left, node, workspace);
      var rightBlock = Blocklify.JavaScript.Parser.render_atomic(node.right, node, workspace);
      Blocklify.JavaScript.Parser.force_output(rightBlock);
      Blocklify.JavaScript.Parser.force_output(leftBlock);
      block.setFieldValue(node.operator, 'OPERATOR');
      block.initSvg();
      block.getInput('LEFT').connection.connect(leftBlock.outputConnection);
      block.getInput('RIGHT').connection.connect(rightBlock.outputConnection);
      block.render();
      break;
      case "ObjectExpression":
      var blocks = [];
      node.properties.forEach(function (element, index) {
        blocks[index] = Blockly.Block.obtain(workspace ,"js_json_element");
        if (no_inline_blocks.indexOf(element.value.type) != -1) {
            blocks[index].setInputsInline(false);
          }
        blocks[index].initSvg();
        blocks[index].render();
        var key = Blocklify.JavaScript.Parser.render_atomic(element.key, node, workspace);
        var value = Blocklify.JavaScript.Parser.render_atomic(element.value, node, workspace);
        Blocklify.JavaScript.Parser.force_output(key);
        Blocklify.JavaScript.Parser.force_output(value);
        blocks[index].getInput('KEY').connection.connect(key.outputConnection);
        blocks[index].getInput('VALUE').connection.connect(value.outputConnection);
        //connect the block to the previous block
        if (index != 0) {
          blocks[index].previousConnection.connect(blocks[index-1].nextConnection);
        }
      });
      block = Blockly.Block.obtain(workspace ,"js_json_object");
      block.initSvg();
      if (blocks.length > 0) {
        block.getInput('ELEMENTS').connection.connect(blocks[0].previousConnection);
      }
      block.render();
      break;
    case "IfStatement":
      block = Blockly.Block.obtain(workspace ,"js_if_statement");
      var tests = [], consequents = [], current_node = node.alternate, countElseIf = 0, countElse = 0;
      tests.push(Blocklify.JavaScript.Parser.render_atomic(node.test, node, workspace));
      consequents.push(Blocklify.JavaScript.Parser.render_atomic(node.consequent, node, workspace));
      Blocklify.JavaScript.Parser.force_output(tests[0]);
      while (current_node) {
        if (current_node.type == 'IfStatement') {
          countElseIf++;
          tests.push(Blocklify.JavaScript.Parser.render_atomic(current_node.test, current_node, workspace));
          Blocklify.JavaScript.Parser.force_output(tests[tests.length-1]);
          consequents.push(Blocklify.JavaScript.Parser.render_atomic(current_node.consequent, current_node, workspace));
          current_node = current_node.alternate;
        } else {
          countElse = 1;
          var alternate = Blocklify.JavaScript.Parser.render_atomic(current_node.alternate || current_node, node, workspace);
          current_node = null;
        }
      };
      block.setCounts(countElseIf, countElse);
      block.getInput('IF0').connection.connect(tests[0].outputConnection);
      block.getInput('DO0').connection.connect(consequents[0].previousConnection);
      for (var i = 1; i <= countElseIf; i++) {
        block.getInput('IF' + i).connection.connect(tests[i].outputConnection);
        block.getInput('DO' + i).connection.connect(consequents[i].previousConnection);
      }
      if (countElse == 1) {
        block.getInput('ELSE').connection.connect(alternate.previousConnection);
      }
      block.initSvg();
      block.render();
      break;
    case "ThisExpression":
      block = Blockly.Block.obtain(workspace ,"js_this_expression");
      block.initSvg();
      block.render();
      break;
    case "ArrayExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_array_expression');
      Blocklify.JavaScript.importer.appendCloneMutation(block, 'elements', 'ELEMENT', node.elements, node);
      break;
    
    default:  // if not implemented block
      block = Blocklify.JavaScript.importer.notimplementedblockmsg(node);
  }
  return block;
};
/**
 * Function to convert the nodes to xml blocks at high level (code patterns matching).
 */
Blocklify.JavaScript.importer.convert_pattern = function(node, parent) {
  var block = goog.dom.createDom('xml');
  block.appendChild(Blocklify.JavaScript.importer.notimplementedblockmsg(node));
  return block;
};