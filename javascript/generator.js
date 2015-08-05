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
 * @fileoverview Helper functions for generate Javascript for blocks.
 * A modification of javascript generator of blockly, originaly made by:
 * @author fraser@google.com (Neil Fraser)
 * Adapted to blockly by:
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

goog.provide('Blocklify.JavaScript.Generator');

// TODO: improve code generation, for atomic generation. This implies rewrite all blockly/core/generator.js class.
//       Now blocklify use the blockly code generation API, but improve this API making his own is nesesary.

/**
 * JavaScript code generator for Blocklify.
 * @type !Blockly.Generator
 */
Blocklify.JavaScript.Generator = new Blockly.Generator('JavaScript');

//not nesesary because is the same language, no name colision
//Blocklify.JavaScript.Generator.addReservedWords('');

/**
 * Order of operation ENUMs.
 * https://developer.mozilla.org/en/JavaScript/Reference/Operators/Operator_Precedence
 */
Blocklify.JavaScript.Generator.ORDER_ATOMIC = 0;         // 0 "" ...
Blocklify.JavaScript.Generator.ORDER_MEMBER = 1;         // . []
Blocklify.JavaScript.Generator.ORDER_NEW = 1;            // new
Blocklify.JavaScript.Generator.ORDER_FUNCTION_CALL = 2;  // ()
Blocklify.JavaScript.Generator.ORDER_INCREMENT = 3;      // ++
Blocklify.JavaScript.Generator.ORDER_DECREMENT = 3;      // --
Blocklify.JavaScript.Generator.ORDER_LOGICAL_NOT = 4;    // !
Blocklify.JavaScript.Generator.ORDER_BITWISE_NOT = 4;    // ~
Blocklify.JavaScript.Generator.ORDER_UNARY_PLUS = 4;     // +
Blocklify.JavaScript.Generator.ORDER_UNARY_NEGATION = 4; // -
Blocklify.JavaScript.Generator.ORDER_TYPEOF = 4;         // typeof
Blocklify.JavaScript.Generator.ORDER_VOID = 4;           // void
Blocklify.JavaScript.Generator.ORDER_DELETE = 4;         // delete
Blocklify.JavaScript.Generator.ORDER_MULTIPLICATION = 5; // *
Blocklify.JavaScript.Generator.ORDER_DIVISION = 5;       // /
Blocklify.JavaScript.Generator.ORDER_MODULUS = 5;        // %
Blocklify.JavaScript.Generator.ORDER_ADDITION = 6;       // +
Blocklify.JavaScript.Generator.ORDER_SUBTRACTION = 6;    // -
Blocklify.JavaScript.Generator.ORDER_BITWISE_SHIFT = 7;  // << >> >>>
Blocklify.JavaScript.Generator.ORDER_RELATIONAL = 8;     // < <= > >=
Blocklify.JavaScript.Generator.ORDER_IN = 8;             // in
Blocklify.JavaScript.Generator.ORDER_INSTANCEOF = 8;     // instanceof
Blocklify.JavaScript.Generator.ORDER_EQUALITY = 9;       // == != === !==
Blocklify.JavaScript.Generator.ORDER_BITWISE_AND = 10;   // &
Blocklify.JavaScript.Generator.ORDER_BITWISE_XOR = 11;   // ^
Blocklify.JavaScript.Generator.ORDER_BITWISE_OR = 12;    // |
Blocklify.JavaScript.Generator.ORDER_LOGICAL_AND = 13;   // &&
Blocklify.JavaScript.Generator.ORDER_LOGICAL_OR = 14;    // ||
Blocklify.JavaScript.Generator.ORDER_CONDITIONAL = 15;   // ?:
Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT = 16;    // = += -= *= /= %= <<= >>= ...
Blocklify.JavaScript.Generator.ORDER_COMMA = 17;         // ,
Blocklify.JavaScript.Generator.ORDER_NONE = 99;          // (...)

/**
 * Initialise the database of variable names.
 * @param {Blockly.Workspace=} opt_workspace Workspace to generate code from.
 *     Defaults to main workspace.
 */
Blocklify.JavaScript.Generator.init = function(opt_workspace) {
  return '';
};

/**
 * Prepend the generated code with the variable definitions.
 * @param {string} code Generated code.
 * @return {string} Completed code.
 */
Blocklify.JavaScript.Generator.finish = function(code) {
  return code;
};

/**
 * Naked values are top-level blocks with outputs that aren't plugged into
 * anything.  A trailing semicolon is needed to make this legal.
 * @param {string} line Line of generated code.
 * @return {string} Legal line of code.
 */
Blocklify.JavaScript.Generator.scrubNakedValue = function(line) {
  return line + ';\n';
};

/**
 * Encode a string as a properly escaped JavaScript string, complete with
 * quotes.
 * @param {string} string Text to encode.
 * @return {string} JavaScript string.
 * @private
 */
Blocklify.JavaScript.Generator.quote_ = function(string) {
  // TODO: This is a quick hack.  Replace with goog.string.quote
  string = string.replace(/\\/g, '\\\\')
                 .replace(/\n/g, '\\\n')
                 .replace(/'/g, '\\\'');
  return '\'' + string + '\'';
};

/**
 * Common tasks for generating JavaScript from blocks.
 * Handles comments for the specified block and any connected value blocks.
 * Calls any statements following this block.
 * @param {!Blockly.Block} block The current block.
 * @param {string} code The JavaScript code created for this block.
 * @return {string} JavaScript code with comments and subsequent blocks added.
 * @private
 */
Blocklify.JavaScript.Generator.scrub_ = function(block, code) {
  var commentCode = '';
  // Only collect comments for blocks that aren't inline.
  if (!block.outputConnection || !block.outputConnection.targetConnection) {
    // Collect comment for this block.
    var comment = block.getCommentText();
    if (comment) {
      commentCode += Blocklify.JavaScript.Generator.prefixLines(comment, '// ') + '\n';
    }
    // Collect comments for all value arguments.
    // Don't collect comments for nested statements.
    for (var x = 0; x < block.inputList.length; x++) {
      if (block.inputList[x].type == Blockly.INPUT_VALUE) {
        var childBlock = block.inputList[x].connection.targetBlock();
        if (childBlock) {
          var comment = Blocklify.JavaScript.Generator.allNestedComments(childBlock);
          if (comment) {
            commentCode += Blocklify.JavaScript.Generator.prefixLines(comment, '// ');
          }
        }
      }
    }
  }
  var nextBlock = block.nextConnection && block.nextConnection.targetBlock();
  var nextCode = Blocklify.JavaScript.Generator.blockToCode(nextBlock);
  return commentCode + code + nextCode;
};

/**
 * Generate code representing the sequence.  Indent the code.
 * @param {!Blockly.Block} block The block containing the input.
 * @param {string} name The name of the input.
 * @return {string} Generated code or '' if no blocks are connected.
 */
Blocklify.JavaScript.Generator.sequenceToCode = function(block, name) {
  var targetBlock = block.getInputTargetBlock(name);
  if (targetBlock == null) {
    return '';
  }
  var nextBlock = targetBlock;
  var code = '', blockCode, func = null, i = 0;
  do {
    func = this[nextBlock.type];
    if (!func) {
      // Search in external generators
      for (var i = 0; i < Blocklify.JavaScript.Generator.extrernalSources.length; i++) {
        func = Blocklify.JavaScript.Generator.extrernalSources[i][nextBlock.type];
        if (func) {
          break;
        }
      }
      if (!func) {
        throw 'Language "' + this.name_ + '" does not know how to generate code ' +
            'for block type "' + nextBlock.type + '".';
      }
    }
    blockCode = ((i !=0 )?' ,':'') + func.call(nextBlock, nextBlock);
    blockCode = blockCode.substring(0, blockCode.length - 2);
    code += blockCode;
    nextBlock = nextBlock.getNextBlock();
    i++;
  } while (nextBlock != null);
  return code;
};

/* external generators*/
Blocklify.JavaScript.Generator.extrernalSources = [];

/**
 * Generate code for the specified block (and attached blocks), allows external generators.
 * @param {Blockly.Block} block The block to generate code for.
 * @return {string|!Array} For statement blocks, the generated code.
 *     For value blocks, an array containing the generated code and an
 *     operator order value.  Returns '' if block is null.
 */
Blocklify.JavaScript.Generator.blockToCode = function(block) {
  if (!block) {
    return '';
  }
  if (block.disabled) {
    // Skip past this block if it is disabled.
    return this.blockToCode(block.getNextBlock());
  }

  var func = this[block.type];
  if (!func) {
    // Search in external generators
    for (var i = 0; i < Blocklify.JavaScript.Generator.extrernalSources.length; i++) {
      func = Blocklify.JavaScript.Generator.extrernalSources[i][block.type];
      if (func) {
        break;
      }
    }
    if (!func) {
      throw 'Language "' + this.name_ + '" does not know how to generate code ' +
          'for block type "' + block.type + '".';
    }
  }
  // First argument to func.call is the value of 'this' in the generator.
  // Prior to 24 September 2013 'this' was the only way to access the block.
  // The current prefered method of accessing the block is through the second
  // argument to func.call, which becomes the first parameter to the generator.
  var code = func.call(block, block);
  if (goog.isArray(code)) {
    // Value blocks return tuples of code and operator order.
    return [this.scrub_(block, code[0]), code[1]];
  } else if (goog.isString(code)) {
    if (this.STATEMENT_PREFIX) {
      code = this.STATEMENT_PREFIX.replace(/%1/g, '\'' + block.id + '\'') +
          code;
    }
    return this.scrub_(block, code);
  } else if (code === null) {
    // Block has handled code generation itself.
    return '';
  } else {
    throw 'Invalid code generated: ' + code;
  }
};