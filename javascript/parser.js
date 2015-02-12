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
 * @fileoverview Helper functions for parse from Javascript to Blockly blocks.
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

goog.provide('Blocklify.JavaScript.Parser');

/**
 * JavaScript code renderer.
 * @type !Blockly.Generator
 */
Blocklify.JavaScript.Parser = new Blocklify.Renderer('JavaScript');

/**
 * Function to parse the code to object nodes.
 */
Blocklify.JavaScript.Parser.parser = acorn.parse;

/**
 * Function to force output to a block.
 */
Blocklify.JavaScript.Parser.force_output = function (block) {
	//force output
	if (!block.outputConnection) {
		//if has a mutator output
		if (block.setOutput_) {
			block.setOutput_(true);
		} else {
			block.setPreviousStatement(false);
			block.setNextStatement(false);
			block.setOutput(true);
		}
	}
}

/**
 * Function to render the nodes to blocks.
 */
Blocklify.JavaScript.Parser.render = function (node, parent, workspace) {
	//the return block
	var block = {};
	//warn for incompatibility of blockly with JS language or not implemented feature
	function notimplementedblockmsg (node) {
		block = Blockly.Block.obtain(workspace ,"js_notimplemented");
		block.initSvg();
		block.render();
		console.log("not yet implemented node:");
		console.log(node);
	}
  if (node == null) {
    block = Blockly.Block.obtain(workspace ,"js_undefined_value");
    block.initSvg();
    block.render();
    return block;
  }
	switch (node.type) {
		case "Program": case "BlockStatement":
			var blocks = [], index = 0, tempBlock;
			node.body.forEach(function (element) {
				tempBlock = Blocklify.JavaScript.Parser.render(element, node, workspace);
				//ignore EmptyStatement
				if (tempBlock != "EmptyStatement") {
					blocks[index] = tempBlock;
					//connect the block to the previous block
					if (index != 0) {
						blocks[index].previousConnection.connect(blocks[index-1].nextConnection);
					}
					index++;
				}
			});
			if (node.body.length != 0) {
				block.previousConnection = blocks[0].previousConnection;
				block.nextConnection = blocks[blocks.length-1].nextConnection;
			} else {
				block = null;
			}
			break;
		case "ExpressionStatement":
			block = Blocklify.JavaScript.Parser.render(node.expression, node, workspace);
			break;
		case "Literal":
			if (node.value == null) {
				block = Blockly.Block.obtain(workspace ,"js_null_value");
			} else {
				if (typeof(node.value) == "number") {
					block = Blockly.Block.obtain(workspace ,"js_literal_number");
					block.setFieldValue('' + node.value, 'NUMBER');
				} else if(typeof(node.value) == "string") {
					block = Blockly.Block.obtain(workspace ,"js_literal_string");
					block.setFieldValue(node.value, 'STRING');
				}
			}
			block.initSvg();
			block.render();
			break;
		case "AssignmentExpression":
			block = Blockly.Block.obtain(workspace ,"js_assignment_expression");
			var leftBlock = Blocklify.JavaScript.Parser.render(node.left, node, workspace);
			var rightBlock = Blocklify.JavaScript.Parser.render(node.right, node, workspace);
			//fix estetic, only literal has inline
			if (node.right.type == "FunctionExpression") {
				block.setInputsInline(false);
			}
			block.setFieldValue(node.operator, 'OPERATOR');
			//force output
			Blocklify.JavaScript.Parser.force_output(rightBlock);
			block.initSvg();
			block.getInput('VAR').connection.connect(leftBlock.outputConnection);
			block.getInput('VALUE').connection.connect(rightBlock.outputConnection);
			block.render();
			break;
		case "VariableDeclarator"://TODO: do the variable declarator block
			block = Blockly.Block.obtain(workspace ,"js_variable_declarator");
			var initBlock = Blocklify.JavaScript.Parser.render(node.init, node, workspace);
			var varBlock = Blocklify.JavaScript.Parser.render(node.id, node, workspace);
			//fix estetic, only literal has inline
		      if (node.init) { //TODO: make global variable for none-estetic inline blocks
		  			if (node.init.type == "FunctionExpression" || node.init.type == "ObjectExpression" ) {
		  				block.setInputsInline(false);
		  			}
		      }
			//force output
			Blocklify.JavaScript.Parser.force_output(initBlock);
			block.initSvg();
			block.getInput('VAR').connection.connect(varBlock.outputConnection);
			block.getInput('VALUE').connection.connect(initBlock.outputConnection);
			block.render();
			break;
		case "VariableDeclaration":
			if (node.declarations.length == 1) {
				block = Blockly.Block.obtain(workspace ,"js_variable_declaration_unary");
				var initBlock = Blocklify.JavaScript.Parser.render(node.declarations[0].init, node.declarations[0], workspace);
				var varBlock = Blocklify.JavaScript.Parser.render(node.declarations[0].id, node.declarations[0], workspace);
				//fix estetic, only literal has inline
			      if (node.declarations[0].init) { //TODO: make global variable for none-estetic inline blocks
			  			if (node.declarations[0].init.type == "FunctionExpression" || node.declarations[0].init.type == "ObjectExpression" ) {
			  				block.setInputsInline(false);
			  			}
			      }
				//force output
				Blocklify.JavaScript.Parser.force_output(initBlock);
				block.initSvg();
				block.getInput('VAR').connection.connect(varBlock.outputConnection);
				block.getInput('VALUE').connection.connect(initBlock.outputConnection);
			} else {
				var blocks = [];
				node.declarations.forEach(function (element, index) {
					blocks[index] = Blocklify.JavaScript.Parser.render(element, node, workspace);
					//connect the block to the previous block
					if (index != 0) {
						blocks[index].previousConnection.connect(blocks[index-1].nextConnection);
					}
				});
				block = Blockly.Block.obtain(workspace ,"js_variable_declaration");
				block.initSvg();
				block.getInput('DECLARATIONS').connection.connect(blocks[0].previousConnection);
			}
			block.render();
			break;
		case "CallExpression":
			block = Blockly.Block.obtain(workspace ,"js_call_expression");
			block.initSvg();
			block.render();
			var nameBlock = Blocklify.JavaScript.Parser.render(node.callee, node, workspace);
			var inlineFlag = false;
			block.setArguments(node.arguments.length);
			node.arguments.forEach(function (element, index){
				var argBlock = Blocklify.JavaScript.Parser.render(element, node, workspace);
				Blocklify.JavaScript.Parser.force_output(argBlock);
				block.getInput('ARGUMENT' + index).connection.connect(argBlock.outputConnection);
				inlineFlag = inlineFlag || (element.type == 'FunctionExpression');
			});
			if (inlineFlag) {
				block.setInputsInline(false);
			}
			block.getInput('NAME').connection.connect(nameBlock.outputConnection);
			break;
		case "FunctionExpression":
			if (node.id != null) {
				block = Blockly.Block.obtain(workspace ,"js_function_expression");
				var nameBlock = Blocklify.JavaScript.Parser.render(node.id, node, workspace);
			} else {
				block = Blockly.Block.obtain(workspace ,"js_anonimous_function_expression");
			}
			var stackBlock = Blocklify.JavaScript.Parser.render(node.body, node, workspace);
			var inlineFlag = false;
			block.initSvg();
			block.render();
			block.setParams(node.params.length);
			node.params.forEach(function (element, index){
				var paramBlock = Blocklify.JavaScript.Parser.render(element, node, workspace);
				Blocklify.JavaScript.Parser.force_output(paramBlock);
				block.getInput('PARAM' + index).connection.connect(paramBlock.outputConnection);
				inlineFlag = inlineFlag || (element.type == 'FunctionExpression');
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
			block = Blockly.Block.obtain(workspace ,"js_function_expression");
			var nameBlock = Blocklify.JavaScript.Parser.render(node.id, node, workspace);
			var stackBlock = Blocklify.JavaScript.Parser.render(node.body, node, workspace);
			var inlineFlag = false;
			block.initSvg();
			block.render();
      		block.setOutput_(false);
			block.setParams(node.params.length);
			node.params.forEach(function (element, index){
				var paramBlock = Blocklify.JavaScript.Parser.render(element, node, workspace);
				Blocklify.JavaScript.Parser.force_output(paramBlock);
				block.getInput('PARAM' + index).connection.connect(paramBlock.outputConnection);
				inlineFlag = inlineFlag || (element.type == 'FunctionExpression');
			});
			if (inlineFlag) {
				block.setInputsInline(false);
			}
			block.getInput('NAME').connection.connect(nameBlock.outputConnection);
			if (stackBlock) {
				block.getInput('STACK').connection.connect(stackBlock.previousConnection);
			}
			break;
		case "EmptyStatement":
			block = "EmptyStatement";
			break;
		case "Identifier":
			if(parent.type == "MemberExpression" && parent.computed) {
				block = Blockly.Block.obtain(workspace ,"js_computed_member_expression");
				var memberBlock = Blocklify.JavaScript.Parser.render(node, node, workspace);
				block.getInput('MEMBER').connection.connect(memberBlock.outputConnection);
			} else if (node.name == 'undefined') {
				block = Blockly.Block.obtain(workspace ,"js_undefined_value");
			} else {
				block = Blockly.Block.obtain(workspace ,"js_identifier");
				block.setFieldValue(node.name, 'NAME');
			}
			block.initSvg();
			block.render();
			break;
		case "MemberExpression":
			var current_node = node, count = 2, memberBlock, member, parentM = node;
			while (current_node.object.type != "Identifier") {
				count++;
				current_node = current_node.object;
			}
			block = Blockly.Block.obtain(workspace ,"js_member_expression");
			block.setMembers(count);
			for (var i = count-1, current_node = node; i >= 0; i--) {
				//condition for final node
				member = (i == 0)?current_node:current_node.property;
				memberBlock = Blocklify.JavaScript.Parser.render(member, parentM, workspace);
				block.getInput('MEMBER' + i).connection.connect(memberBlock.outputConnection);
				current_node = current_node.object;
				parentM = current_node;
			};
			block.initSvg();
			block.render();
			break;
		case "ReturnStatement":
			block = Blockly.Block.obtain(workspace ,"js_return_statement");
			var argBlock = Blocklify.JavaScript.Parser.render(node.argument, node, workspace);
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
			var argBlock = Blocklify.JavaScript.Parser.render(node.argument, node, workspace);
			block.setFieldValue(node.operator, 'OPERATOR');
			block.initSvg();
			block.getInput('ARGUMENT').connection.connect(argBlock.outputConnection);
			block.render();
			break;
		case "BinaryExpression":
			block = Blockly.Block.obtain(workspace ,"js_binary_expression");
			var leftBlock = Blocklify.JavaScript.Parser.render(node.left, node, workspace);
			var rightBlock = Blocklify.JavaScript.Parser.render(node.right, node, workspace);
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
				blocks[index].initSvg();
				blocks[index].render();
				var key = Blocklify.JavaScript.Parser.render(element.key, node, workspace);
				var value = Blocklify.JavaScript.Parser.render(element.value, node, workspace);
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
			block.getInput('ELEMENTS').connection.connect(blocks[0].previousConnection);
			block.render();
			break;
			// if not implemented block
			default:
				notimplementedblockmsg(node);
	}
	return block;
}