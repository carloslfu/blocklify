// Example of importer for blockly core blocks. Importer API experiment - work in progress, importer will be a class.

// List of blockly blocks, info about this importer implementation and the case in which implements.
/*
  * Logic
    - controls_if               // IMPLEMENTED -> "IfStatement"
    - logic_compare             // IMPLEMENTED -> "BinaryExpression"
    - logic_operation           // IMPLEMENTED -> "LogicalExpression"
    - logic_negate              // IMPLEMENTED -> "UnaryExpression"
    - logic_boolean             // IMPLEMENTED -> "Literal"
    - logic_null                // IMPLEMENTED -> "Literal"
    - logic_ternary             // IMPLEMENTED -> "ConditionalExpression"
  * Loops
    - controls_repeat_ext       // IMPLEMENTED -> "ForStatement" -> var handling: if initializer name starts with 'count' this block is rendered
    - controls_whileUntil       // IMPLEMENTED -> "WhileStatement"
    - controls_for              // IMPLEMENTED -> "ForStatement"
    - controls_forEach          // IMPLEMENTED -> "ForInStatement"
    - controls_flow_statements  // ...
  * Math
    - math_number               // IMPLEMENTED -> "Literal"
    - math_arithmetic           // IMPLEMENTED -> "BinaryExpression"
    - math_single
    - math_trig
    - math_constant
    - math_number_property
    - math_change
    - math_round
    - math_on_list
    - math_modulo
    - math_constrain
    - math_random_int
    - math_random_float
  * Text
    - text                      // IMPLEMENTED -> "Literal"
    - text_join
    - text_append
    - text_length
    - text_isEmpty
    - text_indexOf
    - text_charAt
    - text_getSubstring
    - text_changeCase
    - text_trim
    - text_print
    - text_prompt_ext
  * Lists
    - lists_create_empty
    - lists_create_with        // IMPLEMENTED -> "ArrayExpression"
    - lists_repeat
    - lists_length
    - lists_isEmpty
    - lists_indexOf
    - lists_getIndex
    - lists_setIndex
    - lists_getSublist
    - lists_split
  * Colour
    - colour_picker
    - colour_random
    - colour_rgb
    - colour_blend
  * Variables
    - variables_set           // IMPLEMENTED -> "VariabeDeclaration", "AssignmentExpression" could not generate the same code
                              // because in Blockly core not are a variable multiple initialization block.
                              // (not multiple - partially)
    - variables_get
  * Functions
*/


// first import js block generators into blockly js generator context
for (var el in Blocklify.JavaScript.Generator) {
  if (el.substring(0,3) == 'js_') {
    Blockly.JavaScript[el] = Blocklify.JavaScript.Generator[el];
  }
}

// now the block importer
Blockly.JavaScript.importer = function(node, parent, options) {
  // this is the importer for blockly block (pattern converter)
  //the returned block
  var block = null, field;
  //none-estetic inline blocks
  var no_inline_blocks = [];
  switch (node.type) {
    case "Program":
      block = goog.dom.createDom('xml');
      this.appendStatement(block, node.body, node, options);
      break;
    case "BlockStatement":
      block = this.appendStatement(null, node.body, node, options);
      break;
    case "ExpressionStatement":
      block = this.convert_atomic(node.expression, node, options);
      break;
    case "Literal":    // logic_null, math_number, text, logic_boolean
      block = goog.dom.createDom('block');
      if (node.value == null) {
        block.setAttribute('type' ,'logic_null');
      } else {
        var nodeType = typeof(node.value);
        if (nodeType == "number") {
          block.setAttribute('type' ,'math_number');
          this.appendField(block, 'NUM', node.value + '');
        } else if(nodeType == "string") {
          block.setAttribute('type' ,'text');
          this.appendField(block, 'TEXT', node.value);
        } else if(nodeType == "boolean") {
          block.setAttribute('type' ,'logic_boolean');
          this.appendField(block, 'BOOL', node.raw);
        }
      }
      break;
    case "IfStatement":    // controls_if
      block = this.createBlock('controls_if');
      var tests = [], consequents = [], current_node = node.alternate, countElseIf = 0, countElse = 0;
      tests.push(this.convert_atomic(node.test, node, options));
      this.setOutput(tests[0], true);
      consequents.push(this.convert_atomic(node.consequent, node, options));
      this.setOutput(tests[0], true);
      while (current_node) {
        if (current_node.type == 'IfStatement') {
          countElseIf++;
          tests.push(this.convert_atomic(current_node.test, current_node, options));
          this.setOutput(tests[tests.length-1], true);
          consequents.push(this.convert_atomic(current_node.consequent, current_node, options));
          current_node = current_node.alternate;
        } else {
          countElse = 1;
          var alternate = this.convert_atomic(current_node.alternate || current_node, node, options);
          current_node = null;
        }
      };
      var mutation = goog.dom.createDom('mutation');
      block.appendChild(mutation);
      mutation.setAttribute('elseif', countElseIf + '');
      mutation.setAttribute('else', countElse + '');
      this.appendValueInput(block, 'IF0', tests[0]);
      this.appendValueInput(block, 'DO0', consequents[0]);
      for (var i = 1; i <= countElseIf; i++) {
        this.appendValueInput(block, 'IF' + i, tests[i]);
        this.appendValueInput(block, 'DO' + i, consequents[i]);
      }
      if (countElse == 1) {
        this.appendValueInput(block, 'ELSE', alternate);
      }
      break;
    case "ArrayExpression":
      block = this.createBlock('lists_create_with');
      this.appendCloneMutation(block, 'items', 'ADD', node.elements, node, options);
      break;
    case "WhileStatement":    // controls_whileUntil
      block = this.createBlock('controls_whileUntil');
      if (node.test.type == 'UnaryExpression' && node.test.operator == '!') {
        mode = 'UNTIL';
        procesedTest = node.test.argument;
      } else {
        mode = 'WHILE';
        procesedTest = node.test;
      }
      this.appendField(block, 'MODE', mode);
      var test = this.convert_atomic(procesedTest, node, options);
      var body = this.convert_atomic(node.body, node, options);
      this.appendValueInput(block, 'BOOL', test);
      this.appendValueInput(block, 'DO', body);
      break;
    case "BinaryExpression": case "LogicalExpression":
      // math_arithmetic, logic_compare, logic_operation
      if (['+', '-', '*', '/', '==', '!=',
             '<', '>', '<=', '>=', '&&', '||'].indexOf(node.operator) != -1) { // Blockly-JavaScript acepted operators

        var A = this.convert_atomic(node.left, node, options);
        var B = this.convert_atomic(node.right, node, options);

        if (['+', '-', '*', '/'].indexOf(node.operator) != -1) { // math_arithmetic
          var operators = {'+': 'ADD', '-': 'MINUS', '*': 'MULTIPLY', '/': 'DIVIDE'};
          block = this.createBlock('math_arithmetic');
        } else if (['==', '!=', '<', '>', '<=', '>='].indexOf(node.operator) != -1) { // logic_compare
          var operators = {'==': 'EQ', '!=': 'NEQ',
                           '<': 'LT', '>': 'GT',
                           '<=': 'LTE', '>=': 'GTE'};
          block = this.createBlock('logic_compare');
        } else if (['&&', '||'].indexOf(node.operator) != -1) { // logic_operation
          var operators = {'&&': 'AND', '||': 'OR'};
          block = this.createBlock('logic_operation');
        }
        this.appendField(block, 'OP', operators[node.operator]);
        this.appendValueInput(block, 'A', A);
        this.appendValueInput(block, 'B', B);
        break;
      }
    case "UnaryExpression":    // logic_negate
      if (node.operator == '!') {
        block = this.createBlock('logic_negate');
        var argument = this.convert_atomic(node.argument, node, options);
        this.appendValueInput(block, 'BOOL', argument);
        break;
      }
    case "ConditionalExpression":    // logic_ternary
      block = this.createBlock('logic_ternary');
      var test = this.convert_atomic(node.test, node, options);
      var consequent = this.convert_atomic(node.consequent, node, options);
      var alternate = this.convert_atomic(node.alternate, node, options);
      this.appendValueInput(block, 'IF', test);
      this.appendValueInput(block, 'THEN', consequent);
      this.appendValueInput(block, 'ELSE', alternate);
      break;
    case "ForStatement":    // controls_repeat_ext, controls_for
      var blockType;
      // All conditions for pattern recognizing
      // controls_repeat_ext
      // -- initializer conditions
      var flag = (node.init.type == 'VariableDeclaration' && node.init.declarations.length == 1)
              && (node.init.declarations[0].init.type == 'Literal')
              && (node.init.declarations[0].id.name.substr(0,5) == 'count') && (node.init.declarations[0].init.value == 0);
      // -- test conditions
      flag = flag && (node.test.type == 'BinaryExpression' && node.test.left.type == 'Identifier'
                      && node.test.operator == '<'
                      && node.test.left.name == node.init.declarations[0].id.name);
      // -- update conditions
      flag = flag && (node.update.type == 'UpdateExpression' && node.update.operator == '++'
                      && node.update.argument.type == 'Identifier' && node.test.left.name == node.update.argument.name);
      // TODO: search in the body for uses of 'count' (advanced feature - AST node search), now any for with 'count' initializer and acomplish
      //       with the pattern will be converted in this block and may be some variable conflicts with Blockly core blocks
      if (flag) {
        blockType = 'controls_repeat_ext';
      } else {
        // controls_for
        // -- initializer conditions
        flag = (node.init.type == 'AssignmentExpression')
                && (node.init.left.name == node.test.left.name)
                && (node.init.left.type == 'Identifier') && (node.init.right.type == 'Literal');
        // -- update conditions
        var byValue;
        var flag1 = flag && (node.update.type == 'UpdateExpression' && node.update.operator == '++'
                      && node.update.argument.type == 'Identifier' && node.test.left.name == node.update.argument.name);
        if (flag1) {
          byValue = '1';
        }
        var flag2 = (node.update.type == 'AssignmentExpression' && node.update.operator == '+='
                      && node.update.left.type == 'Identifier' && node.test.left.name == node.update.left.name);
        flag2 = flag2 && (node.update.right.type == 'Literal');
        if (flag2) {
          byValue = node.update.right.raw;
        }
        flag = flag && (flag1 || flag2);
        if (flag) {  // controls_for
          blockType = 'controls_for';
        }
      }
      
      if (blockType == 'controls_repeat_ext') {
        block = this.createBlock('controls_repeat_ext');
        var times = this.convert_atomic(node.test.right, node, options);
        var body = this.convert_atomic(node.body, node, options);
        this.appendValueInput(block, 'TIMES', times);
        this.appendValueInput(block, 'DO', body);
        break;
      } else if (blockType == 'controls_for') {
        block = this.createBlock('controls_for');
        this.appendField(block, 'VAR', node.test.left.name);
        var from = this.convert_atomic(node.init.right, node, options);
        var to = this.convert_atomic(node.test.right, node, options);
        var by = this.createBlock('math_number');
        this.appendField(by, 'NUM', byValue);
        var body = this.convert_atomic(node.body, node, options);
        this.appendValueInput(block, 'FROM', from);
        this.appendValueInput(block, 'TO', to);
        this.appendValueInput(block, 'BY', by);
        this.appendValueInput(block, 'DO', body);
        break;
      }
    case "ForInStatement":    // controls_forEach
      var flag = true; // TODO: validations for this pattern ...
      if (flag) {
        block = this.createBlock('controls_forEach');
        // cut the first statement: 'i = i_list[i_index];'
        node.body.body = node.body.body.slice(1);
        var varName = node.left.declarations[0].id.name.substr(0, node.left.declarations[0].id.name.length - 6);
        var list = this.convert_atomic(node.right, node, options);
        var body = this.convert_atomic(node.body, node, options);
        this.appendField(block, 'VAR', varName);
        this.appendValueInput(block, 'LIST', list);
        this.appendValueInput(block, 'DO', body);
        break;
      }
    case "VariableDeclaration":   // variables_set
      if (parent.type == 'Program' || parent.type == 'BlockStatement') {
        if (node.declarations.length == 1) {
          if (node.declarations[0].init == null) {
            block = 'Ignore'; // Ignore declarations like 'var i;' beause Blockly handle this itself
            break;
          } else if (parent.body[options.statementIndex + 1]
                     && parent.body[options.statementIndex + 1].type == 'ForInStatement'
                     && parent.body[options.statementIndex + 1].right.type == 'Identifier'
                     && node.declarations[0].id.name == parent.body[options.statementIndex + 1].right.name) {
            parent.body[options.statementIndex + 1].right = node.declarations[0].init;
            block = 'Ignore'; // Ignore declarations like 'var i;' beause Blockly handle this itself
            break;
          } else { // variables_set
            block = this.createBlock('variables_set');
            this.appendField(block, 'VAR', node.declarations[0].id.name);
            var value = this.convert_atomic(node.declarations[0].init, node, options);
            this.appendValueInput(block, 'VALUE', value);
            break;
          }
        }
      }
    case "AssignmentExpression":    // variables_set
      if (node.left.type == 'Identifier' && node.operator == '=') {
        block = this.createBlock('variables_set');
        this.appendField(block, 'VAR', node.left.name);
        var value = this.convert_atomic(node.right, node, options);
        this.appendValueInput(block, 'VALUE', value);
        break;
      }
      
    default:  // if not implemented block
      break;
  }
  return block;
};

// register the importer
Blocklify.JavaScript.importer.importers.push(Blockly.JavaScript.importer);
