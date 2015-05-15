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
 * @fileoverview playground for blocklify.
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

var mainWorkspace;

var onload = function() {
  var toolbox_div = document.createElement('div');
  //Loads toolbox for JavaScript
  toolbox_div.innerHTML = Blocklify.JavaScript.toolbox;
  document.body.appendChild(toolbox_div);
  mainWorkspace = Blockly.inject(document.getElementById('blocklyDiv'),
          {toolbox: document.getElementById('javascript_toolbox'), media: "../../blockly/media/"});
}

var delete_all_blocks = function() {
	mainWorkspace.getAllBlocks().forEach(function (el) {
		el.dispose(true, false);
	});
};

var parse_code = function () {
	delete_all_blocks();
	var javascript_code = document.getElementById('code').value;
	var xmlDom = Blocklify.JavaScript.importer.codeToDom(javascript_code, 'atomic');
	Blockly.Xml.domToWorkspace(mainWorkspace, xmlDom);
};

var parse_blocks = function () {
	var output = document.getElementById('code');
  	output.value = Blocklify.JavaScript.Generator.workspaceToCode(mainWorkspace);
};
