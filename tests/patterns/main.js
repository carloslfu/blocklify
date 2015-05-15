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
  Blocklify.JavaScript.Generator.extrernalSources.push(Blockly.JavaScript); // external generators
  var toolbox = document.getElementById('blockly_toolbox');
  //Loads JavaScript toolbox
  var javascript_toolbox = Blockly.Xml.textToDom(Blocklify.JavaScript.toolbox);
  //Merge into blockly toolbox
  toolbox.innerHTML += '<sep></sep>';
  toolbox.innerHTML += '<sep></sep>';
  toolbox.innerHTML += '<category name="JavaScript"></category>';
  toolbox.innerHTML += '<sep></sep>';
  var num_els = javascript_toolbox.children.length;
  for (var i = 0; i < num_els; i++) {
    toolbox.appendChild(javascript_toolbox.children[0]);
  }
  //toolbox.innerHTML += javascript_toolbox; // TODO: report bug, innerHTML with sep element doesn't work properly
  mainWorkspace = Blockly.inject(document.getElementById('blocklyDiv'),
          {toolbox: toolbox, media: "../../blockly/media/"});
};

var delete_all_blocks = function() {
	mainWorkspace.getAllBlocks().forEach(function (el) {
		el.dispose(true, false);
	});
};

var parse_code = function () {
	delete_all_blocks();
	var javascript_code = document.getElementById('code').value;
	var xmlDom = Blocklify.JavaScript.importer.codeToDom(javascript_code, 'pattern');
	Blockly.Xml.domToWorkspace(mainWorkspace, xmlDom);
};

var parse_blocks = function () {
	var output = document.getElementById('code');
  	output.value = Blocklify.JavaScript.Generator.workspaceToCode(mainWorkspace);
};
