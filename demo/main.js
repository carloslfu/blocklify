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
 * @fileoverview demo for blocklify.
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

var mainWorkspace;

var onload = function () {
	var blockly_div = document.getElementById('blocklyDiv');
	var toolbox_div = document.createElement('div');
	//Loads toolbox for JavaScript
	toolbox_div.innerHTML = Blocklify.JavaScript.toolbox;
	document.body.appendChild(toolbox_div);
	mainWorkspace = Blockly.inject(blockly_div,
	        {toolbox: document.getElementById('javascript_toolbox'), media: "../blockly/media/"});
	setTimeout(function (){
		//expect for rendering
		blockly_div.style.display = "none";
	},100);
};
var toggle = function () {
	var toggle_btn = document.getElementById('toggle');
	var blockly_div = document.getElementById('blocklyDiv');
	var code = document.getElementById('code');

	if (blockly_div.style.display == "none") {
		code.style.display = "none";
		setTimeout(function (){
			//expect for rendering
			blockly_div.style.display = "block";
			toggle_btn.innerHTML = "Show code";
			parse_code();
		},100);
	} else {
		Blockly.hideChaff();
		setTimeout(function (){
			//expect for rendering
			blockly_div.style.display = "none";
			code.style.display = "block";
			toggle_btn.innerHTML = "Show blocks";
			parse_blocks();
		},100);
	}
};

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
