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

Blockly.inject(document.getElementById('blocklyDiv'),
        {toolbox: document.getElementById('toolbox'), media: "../../blockly/media/"});
var delete_all_blocks = function() {
	Blockly.getMainWorkspace().getAllBlocks().forEach(function (el){
		el.dispose(true, false);
	});
}
var parse_code = function () {
	delete_all_blocks();
	var javascript_code = document.getElementById('code').value;
	Blocklify.JavaScript.Parser.parse(javascript_code, Blockly.getMainWorkspace());
}
var parse_blocks = function () {
	var output = document.getElementById('code');
  	output.value = Blocklify.JavaScript.Generator.workspaceToCode();
}
//test cases
/*
document.onready=function (){
var a=1+gg;
alert(gg);
soyleyenda();
var a = function (){
       a=a()+1;
}
};
*/
