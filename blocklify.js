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
 * @fileoverview Helper functions for generate parsers from any language to blocks.
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

goog.provide('Blocklify');

// Blockly core dependencies.
goog.require('Blocklify.JavaScript');

/**
 * Class for a code generator that translates the blocks into a language.
 * @param {string} name Language name of this parser.
 * @constructor
 */

Blockly.COLLAPSE_CHARS = 100;

Blocklify.Renderer = function(name) {
  this.name_ = name;
};

Blocklify.Renderer.prototype.parse = function(code, workspace, level) {
	var program = this.parser(code);
	this.render(program, null, workspace, level);
};

/**
 * Function to parse the code to object nodes.
 */
Blocklify.Renderer.prototype.parser = null;

/**
 * Function to render the nodes to blocks.
 */
Blocklify.Renderer.prototype.render = null;