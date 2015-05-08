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

/**
 * Name space for Blocklify JavaScript dependencies.
 */
goog.provide('Blocklify.JavaScript');

Blocklify.JavaScript.astParser = acorn;

Blocklify.JavaScript.toolbox =
  '<xml id="toolbox" style="display: none">' +
    '<category name="Variables">' +
  	 '<block type="js_variable_declaration_unary">' +
        '<value name="VAR">' +
          '<block type="js_identifier">' +
            '<field name="NAME"></field>' +
          '</block>' +
        '</value>' +
        '<value name="VALUE">' +
          '<block type="js_literal_number">' +
            '<field name="NUMBER"></field>' +
          '</block>' +
        '</value>' +
      '</block>' +
    '</category>' +
  	'<sep>pure</sep>' +
    '<category name="Data">' +
      '<block type="js_literal_number"></block>' +
      '<block type="js_literal_string"></block>' +
      '<block type="js_null_value"></block>' +
      '<block type="js_json_object"></block>' +
      '<block type="js_json_element"></block>' +
      '<block type="js_identifier"></block>' +
      '<block type="js_computed_member_expression"></block>' +
    '</category>' +
    '<category name="Variables">' +
      '<block type="js_variable_declaration_unary"></block>' +
      '<block type="js_variable_declarator"></block>' +
      '<block type="js_variable_declaration"></block>' +
    '</category>' +
    '<category name="Expressions">' +
      '<block type="js_if_statement"></block>' +
      '<block type="js_assignment_expression"></block>' +
      '<block type="js_update_expression_prefix"></block>' +
      '<block type="js_update_expression_noprefix"></block>' +
      '<block type="js_binary_expression"></block>' +
      '<block type="js_member_expression"></block>' +
      '<block type="js_array_expression"></block>' +
    '</category>' +
    '<category name="Functions">' +
      '<block type="js_function_expression"></block>' +
      '<block type="js_anonimous_function_expression"></block>' +
      '<block type="js_call_expression"></block>' +
    '</category>' +
    '<category name="Statements">' +
      '<block type="js_return_statement"></block>' +
    '</category>' +
    '<category name="Custom">' +
      '<block type="js_blocklify"></block>' +
    '</category>' +
  '</xml>';
