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

// Global TODOs:
// - Use separate folder for ES5 standard.
// - Start implementation of ES6 blocks (javascript folder should contain common files,common folders, ES5 and ES6 folders).
// - Improve creation of importers, we could have templates of code and map those templates to blocks (Experimental).

/**
 * @fileoverview Helper functions for generate parsers from any language to blocks (Dont use renderer - outdated).
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

goog.provide('Blocklify');

/**
 * Class for a code generator that translates the blocks into a language.
 * @param {string} name Language name of this parser.
 * @constructor
 */

Blockly.COLLAPSE_CHARS = 100;

Blocklify.importer = function(name) {
  this.name_ = name;
};

Blocklify.importer.prototype.codeToDom = function(code, level) {
	var program = this.astParser.parse(code);
	return this.convert(program, null, level);
};