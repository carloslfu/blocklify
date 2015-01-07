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
		block = Blockly.Block.obtain(workspace ,"text_print");
		var block_text = Blockly.Block.obtain(workspace ,"text");
		block_text.setFieldValue("not yet implemented :(", 'TEXT');
		block.initSvg();
		block.render();
		block_text.initSvg();
		block_text.render();
		block.getInput('TEXT').connection.connect(block_text.outputConnection);
		console.log("not yet implemented node:");
		console.log(node);
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
			if (parent.type == "MemberExpression") {
				block = Blockly.Block.obtain(workspace ,"js_literal_member_expression");
				block.setFieldValue(node.value, 'NAME');
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
			if (node.init.type == "FunctionExpression") {
				block.setInputsInline(false);
			}
			//force output
			Blocklify.JavaScript.Parser.force_output(initBlock);
			block.initSvg();
			block.getInput('VAR').connection.connect(varBlock.outputConnection);
			block.getInput('VALUE').connection.connect(initBlock.outputConnection);
			block.render();
			break;
		case "VariableDeclaration"://TODO: do the variable declaration block
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
			block.render();
			break;
		case "CallExpression":
			block = Blockly.Block.obtain(workspace ,"js_call_expression");
			block.initSvg();
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
			block.render();
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
			block.render();
			break;
		case "EmptyStatement":
			block = "EmptyStatement";
			break;
		case "Identifier":
			if (parent.type == "MemberExpression") {
				block = Blockly.Block.obtain(workspace ,"js_identifier_member_expression");
			} else {
				block = Blockly.Block.obtain(workspace ,"js_identifier");
			}
			block.setFieldValue(node.name, 'NAME');
			block.initSvg();
			block.render();
			break;
		case "MemberExpression":
			//just a '.' concatenator, its a most elegant form to render that
			var object = Blocklify.JavaScript.Parser.render(node.object, node, workspace);
			var property = Blocklify.JavaScript.Parser.render(node.property, parent, workspace);
			if (object.type == "js_identifier_member_expression" || 
				object.type == "js_literal_member_expression") {
				object.getInput('NEXT').connection.connect(property.outputConnection);
			} else {
				object.nextOutputConnection.connect(property.outputConnection);
			}
			if (property.type == "js_identifier_member_expression" ||
				property.type == "js_literal_member_expression") {
				block.nextOutputConnection = property.getInput('NEXT').connection;
			}
			block.outputConnection = object.outputConnection;
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
		// if not implemented block
		default:
			notimplementedblockmsg(node);
	}
	return block;
}