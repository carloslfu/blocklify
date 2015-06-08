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
  var el = document.getElementById(':1'),
  elClone = el.cloneNode(true);
  el.parentNode.replaceChild(elClone, el);
  elClone.children[0].setAttribute('class', 'categoryBlockly');
  el = document.getElementById(':d');
  elClone = el.cloneNode(true);
  el.parentNode.replaceChild(elClone, el);
  elClone.children[0].setAttribute('class', 'categoryJavaScript');

  // charges the example code
  document.getElementById('code').value = exampleCode;
};

var delete_all_blocks = function() {
  mainWorkspace.getAllBlocks().forEach(function (el) {
    el.dispose(true, false);
  });
};

var parse_code = function () {
  delete_all_blocks();
  var javascript_code = document.getElementById('code').value;
  var mode = document.getElementById('modeSelect').value;
  var xmlDom = Blocklify.JavaScript.importer.codeToDom(javascript_code, mode);
  Blockly.Xml.domToWorkspace(mainWorkspace, xmlDom);
};

var parse_blocks = function () {
  var output = document.getElementById('code');
  output.value = Blockly.JavaScript.workspaceToCode(mainWorkspace);
};

var exampleCode = 
  "var product = 1;\n" +
  "var factorial = 1;\n" +
  "var A = 10;\n" +
  "var B = 4;\n" +
  "\n" +
  "for (var count = 0; count < B; count++) {\n" +
  "  product = product * A;\n" +
  "}\n" +
  "if (B < 0) {\n" +
  "  factorial = 0;\n" +
  "} else {\n" +
  "  for (var i = 1; i <= A; i++) {\n" +
  "    factorial = factorial * i;\n" +
  "  }\n" +
  "}\n";
