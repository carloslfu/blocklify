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
//  - Convert this in an instatiable class, not singleton (Mixin with Blocklify.importer('JavaScript')).
//  - Support for: NewExpression, LogicalExpression, ThrowStatement, UnaryExpression, ForStatement (how is best?).

goog.provide('Blocklify.JavaScript.importer');

/**
 * JavaScript AST to blockls XML parser.
 * @type !Blockly.Generator
 */
Blocklify.JavaScript.importer = new Blocklify.importer('JavaScript');

Blocklify.JavaScript.importer.astParser = Blocklify.JavaScript.astParser;

//none-estetic inline blocks
Blocklify.JavaScript.importer.no_inline_atomic_blocks = ["FunctionExpression", "ObjectExpression"];

Blocklify.JavaScript.importer.convert = function(node, parent, level) {
  switch (level) {
    case 'atomic':
      return this.convert_atomic(node, parent, {});
    case 'pattern':
      return this.convert_pattern(node, parent, {patternEnabled: true});
    case 'mixed':
      return this.convert_pattern(node, parent, {patternEnabled: true, mixedEnabled: true});
  }
};
Blocklify.JavaScript.importer.notImplementedBlock = function(node) {
  var block = goog.dom.createDom('block');
  block.setAttribute('type', 'js_notimplemented');
  Blocklify.JavaScript.importer.appendField(block, 'TYPE', node.type);
  console.log("importer not yet implemented for node:");
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
Blocklify.JavaScript.importer.appendStatement = function(block, statements, parent, options) {
  var tempBlock, lastBlock, statementBlock, rootBlock;
  if (statements.length == 0) {
    return; // returns undefined
  }
  options = goog.cloneObject(options);
  options.statementIndex = 0;
  rootBlock = this.convert_atomic(statements[0], parent, options);
  lastBlock = rootBlock;
  for (var i = 1; i < statements.length; i++) {
    tempBlock = goog.dom.createDom('next');
    options = goog.cloneObject(options);
    options.statementIndex = i;
    statementBlock = this.convert_atomic(statements[i], parent, options);
    if (typeof(statementBlock) == 'object') {
      tempBlock.appendChild(statementBlock);
      if (typeof(lastBlock) == 'object') {
        lastBlock.appendChild(tempBlock);
        lastBlock = statementBlock;
      } else if (typeof(rootBlock) == 'object') {
        lastBlock = statementBlock;
      } else {
        rootBlock = statementBlock;
        lastBlock = statementBlock;
      }
    }
  };
  if (block == null) {
    return rootBlock;
  } else if (rootBlock == 'Ignore') {
    // Ignore rootBlock
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
Blocklify.JavaScript.importer.appendCloneMutation = function(block, name, elementName, elements, parent, options) {
  var no_inline_blocks = this.no_inline_atomic_blocks;
  var mutation = block.getElementsByTagName('mutation')[0]; // one mutation element per block
  if (mutation == undefined) {
    mutation = goog.dom.createDom('mutation');
    block.appendChild(mutation);
  }
  var inlineFlag = false;
  mutation.setAttribute(name, elements.length + '');
  for (var i = 0; i < elements.length; i++) {
    var elementBlock = this.convert_atomic(elements[i], parent, options);
    this.setOutput(elementBlock, true);
    this.appendValueInput(block, elementName + i, elementBlock);
    inlineFlag = inlineFlag || (no_inline_blocks.indexOf(elements[i].type) != -1);
  }
  if (inlineFlag) {
    block.setAttribute('inline', 'false');
  }
};

/**
 * Function to convert the nodes to xml blocks at atomic level.
 */
Blocklify.JavaScript.importer.convert_atomic = function(node, parent, options, patternNotImplemented) {
  //the return block
  var block = {}, field;
  if (!options) {
    options = {};
  }
  if (options.patternEnabled && options.patternEnabled == true
      && (patternNotImplemented == undefined || patternNotImplemented == false)) {
    block = this.convert_pattern(node, parent, options);
    if (block != null) {
      return block;
    }
    if (block == 'Ignore') {
      // this ignore the block
      return block;
    }
  }
  //none-estetic inline blocks
  var no_inline_blocks = this.no_inline_atomic_blocks;
  if (node == null) {
    block = goog.dom.createDom('block');
    block.setAttribute('type', 'js_null_value');
    return block;
  }
  switch (node.type) {
    case "Program":
      block = goog.dom.createDom('xml');
      this.appendStatement(block, node.body, node, options);
      break;
    case "BlockStatement":
      block = this.appendStatement(null, node.body, node, options);
      break;
    case "ExpressionStatement":
      block = this.convert_atomic(node.expression, node, options);
      break;
    case "Literal":
      block = goog.dom.createDom('block');
      if (node.value == null) {
        block.setAttribute('type' ,"js_null_value");
      } else {
        var nodeType = typeof(node.value);
        if (nodeType == "number") {
          block.setAttribute('type' ,'js_literal_number');
          this.appendField(block, 'NUMBER', node.value + '');
        } else if(nodeType == "string") {
          block.setAttribute('type' ,'js_literal_string');
          this.appendField(block, 'STRING', node.value);
        } else if(nodeType == "boolean") {
          block.setAttribute('type' ,'js_literal_bool');
          this.appendField(block, 'BOOL', node.raw);
        }
      }
      break;
    case "AssignmentExpression":
      block = this.createBlock('js_assignment_expression');
      var leftBlock = this.convert_atomic(node.left, node, options);
      var rightBlock = this.convert_atomic(node.right, node, options);
      //fix estetic, only literal has inline
      if (no_inline_blocks.indexOf(node.right.type) != -1) {
        block.setAttribute('inline', 'false');
      }
      this.setOutput(rightBlock, true); // force output
      this.appendValueInput(block, 'VAR', leftBlock);
      this.appendField(block, 'OPERATOR', node.operator);
      this.appendValueInput(block, 'VALUE', rightBlock);
      break;
    case "VariableDeclarator":
      block = this.createBlock('js_variable_declarator');
      var varBlock = this.convert_atomic(node.id, node, options);
      if (node.init == null) {
        node.init = {type:'Identifier', name: 'undefined'};
      }
      var initBlock = this.convert_atomic(node.init, node, options);
      //fix estetic, only literal has inline
      if (node.init) {
        if (no_inline_blocks.indexOf(node.init.type) != -1) {
          block.setAttribute('inline', 'false');
        }
      }
      this.setOutput(initBlock, true);
      this.appendValueInput(block, 'VAR', varBlock);
      this.appendValueInput(block, 'VALUE', initBlock);
      break;
    case "VariableDeclaration":
      if (node.declarations.length == 1) {
        block = this.createBlock('js_variable_declaration_unary');
        if (node.declarations[0].init == null) {
          node.declarations[0].init = {type:'Identifier', name: 'undefined'};
        }
        var initBlock = this.convert_atomic(node.declarations[0].init, node.declarations[0], options);
        var varBlock = this.convert_atomic(node.declarations[0].id, node.declarations[0], options);
        //fix estetic, only literal has inline
        if (node.declarations[0].init) { //TODO: make global variable for none-estetic inline blocks
          if (no_inline_blocks.indexOf(node.declarations[0].init.type) != -1) {
            block.setAttribute('inline', 'false');
          }
        }
        this.setOutput(initBlock, true);
        this.appendValueInput(block, 'VAR', varBlock);
        this.appendValueInput(block, 'VALUE', initBlock);
      } else {
        var tempBlock, lastBlock, statementBlock, rootBlock;
        rootBlock = this.convert_atomic(node.declarations[0], options);
        lastBlock = rootBlock;
        for (var i = 1; i < node.declarations.length; i++) {
          tempBlock = goog.dom.createDom('next');
          statementBlock = this.convert_atomic(node.declarations[i], options);
          tempBlock.appendChild(statementBlock);
          lastBlock.appendChild(tempBlock);
          lastBlock = statementBlock;
        };
        block = this.createBlock('js_variable_declaration');
        this.appendValueInput(block, 'DECLARATIONS', rootBlock);
      }
      break;
    case "CallExpression":
      block = this.createBlock('js_call_expression');
      var nameBlock = this.convert_atomic(node.callee, node);
      this.appendCloneMutation(block, 'arguments', 'ARGUMENT', node.arguments, node, options);
      this.appendValueInput(block, 'NAME', nameBlock);
      break;
    case "FunctionExpression":
      if (node.id != null) {
        block = this.createBlock('js_function_expression');
        var nameBlock = this.convert_atomic(node.id, node, options);
      } else {
        block = this.createBlock('js_anonimous_function_expression');
      }
      var stackBlock = this.convert_atomic(node.body, node, options);
      this.appendCloneMutation(block, 'params', 'PARAM', node.params, node, options);
      if (node.id != null) {
        this.appendValueInput(block, 'NAME', nameBlock);
      }
      this.appendValueInput(block, 'STACK', stackBlock);
      break;
    case "FunctionDeclaration":
      block = this.createBlock('js_function_expression');
      var nameBlock = this.convert_atomic(node.id, node, options);
      var stackBlock = this.convert_atomic(node.body, node, options);
      this.setOutput(block, false);
      this.appendCloneMutation(block, 'params', 'PARAM', node.params, node, options);
      this.appendValueInput(block, 'NAME', nameBlock);
      this.appendValueInput(block, 'STACK', stackBlock);
      break;
    case 'EmptyStatement':
      block = 'Ignore'; // Ignore EmptyStatement
      break;
    case 'Identifier':
      if(parent.type == 'MemberExpression' && parent.computed) {
        block = this.createBlock('js_computed_member_expression');
        var memberBlock = this.convert_atomic(node, node);
        this.appendValueInput(block, 'MEMBER', memberBlock);
      } else if (node.name == 'undefined') {
        block = this.createBlock('js_undefined_value');
      } else {
        block = this.createBlock('js_identifier');
        this.appendField(block, 'NAME', node.name);
      }
      break;
    case "MemberExpression":
      var current_node = node, count = 2, memberBlock, member, parentM = node;
      while (current_node.object.type == "MemberExpression") {
        count++;
        current_node = current_node.object;
      }
      block = this.createBlock('js_member_expression');
      var mutation = goog.dom.createDom('mutation');
      block.appendChild(mutation);
      mutation.setAttribute('members', count + '');
      for (var i = count-1, current_node = node; i >= 0; i--) {
        //condition for final node
        member = (i == 0)?current_node:current_node.property;
        memberBlock = this.convert_atomic(member, parentM);
        this.setOutput(memberBlock, true);
        this.appendValueInput(block, 'MEMBER' + i, memberBlock);
        current_node = current_node.object;
        parentM = current_node;
      };
      break;
    case "ReturnStatement":
      block = this.createBlock('js_return_statement');
      var argBlock = this.convert_atomic(node.argument, node);
      this.setOutput(argBlock, true);
      this.appendValueInput(block, 'VALUE', argBlock);
      break;
    case "UpdateExpression":
      if (node.prefix == true) {
        block = this.createBlock('js_update_expression_prefix');
      } else {
        block = this.createBlock('js_update_expression_noprefix');
      }
      var argBlock = this.convert_atomic(node.argument, node);
      this.appendField(block, 'OPERATOR', node.operator);
      this.appendValueInput(block, 'ARGUMENT', argBlock);
      break;
    case "BinaryExpression":
      block = this.createBlock('js_binary_expression');
      var leftBlock = this.convert_atomic(node.left, node);
      var rightBlock = this.convert_atomic(node.right, node);
      this.setOutput(rightBlock, true);
      this.setOutput(leftBlock, true);
      this.appendValueInput(block, 'LEFT', leftBlock);
      this.appendField(block, 'OPERATOR', node.operator);
      this.appendValueInput(block, 'RIGHT', rightBlock);
      break;
    case "ObjectExpression":
      block = this.createBlock('js_json_object');
      if (node.properties.length == 0) {
        return;
      }
      for (var i = 0; i < node.properties.length; i++) {
        node.properties[i].type = 'ObjectElement';
      };
      var stackBlock = this.appendStatement(null, node.properties, node, options);
      this.appendValueInput(block, 'ELEMENTS', stackBlock);
      break;
    case 'ObjectElement':
      block = this.createBlock('js_json_element');
      var key = this.convert_atomic(node.key, node, options);
      var value = this.convert_atomic(node.value, node, options);
      if (no_inline_blocks.indexOf(node.value.type) != -1) {
        block.setAttribute('inline', 'false');
      }
      this.setOutput(value, true);
      this.appendValueInput(block, 'KEY', key);
      this.appendValueInput(block, 'VALUE', value);
      break;
    case "IfStatement":
      block = this.createBlock('js_if_statement');
      var tests = [], consequents = [], current_node = node.alternate, countElseIf = 0, countElse = 0;
      tests.push(this.convert_atomic(node.test, node, options));
      consequents.push(this.convert_atomic(node.consequent, node, options));
      this.setOutput(tests[0], true);
      while (current_node) {
        if (current_node.type == 'IfStatement') {
          countElseIf++;
          tests.push(this.convert_atomic(current_node.test, current_node, options));
          this.setOutput(tests[tests.length-1], true);
          consequents.push(this.convert_atomic(current_node.consequent, current_node, options));
          current_node = current_node.alternate;
        } else {
          countElse = 1;
          var alternate = this.convert_atomic(current_node.alternate || current_node, node, options);
          current_node = null;
        }
      };
      var mutation = goog.dom.createDom('mutation');
      block.appendChild(mutation);
      mutation.setAttribute('elseif', countElseIf + '');
      mutation.setAttribute('else', countElse + '');
      this.appendValueInput(block, 'IF0', tests[0]);
      this.appendValueInput(block, 'DO0', consequents[0]);
      for (var i = 1; i <= countElseIf; i++) {
        this.appendValueInput(block, 'IF' + i, tests[i]);
        this.appendValueInput(block, 'DO' + i, consequents[i]);
      }
      if (countElse == 1) {
        this.appendValueInput(block, 'ELSE', alternate);
      }
      break;
    case "ThisExpression":
      block = this.createBlock('js_this_expression');
      break;
    case "ArrayExpression":
      block = this.createBlock('js_array_expression');
      this.appendCloneMutation(block, 'elements', 'ELEMENT', node.elements, node, options);
      break;
    
    default:  // if not implemented block
      block = this.notImplementedBlock(node);
  }
  return block;
};

// Importers
Blocklify.JavaScript.importer.importers = [];

/**
 * Function to convert the nodes to xml blocks at high level (code patterns matching)
 */
Blocklify.JavaScript.importer.convert_pattern = function(node, parent, options) {
  var len = this.importers.length, block = null;
  // search the pattern in importers
  for (var i = 0; i < len; i++) {
    block = this.importers[i](node, parent, options);
    if (block !== null) {
      break;
    }
  }
  if (block === null) { // undefined == null is true, but undefined means that it is a pass node (ignore this node)
    if (options.mixedEnabled != undefined && options.mixedEnabled == true) {
      // Last argument avoids infinite recursion in patternNotImplemented
      block = this.convert_atomic(node, parent, options, true);
    } else {
      block = this.notImplementedBlock(node);
    }
  }
  return block;
};