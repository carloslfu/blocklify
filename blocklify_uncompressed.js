// Acorn is a tiny, fast JavaScript parser written in JavaScript.
//
// Acorn was written by Marijn Haverbeke and released under an MIT
// license. The Unicode regexps (for identifiers and whitespace) were
// taken from [Esprima](http://esprima.org) by Ariya Hidayat.
//
// Git repositories for Acorn are available at
//
//     http://marijnhaverbeke.nl/git/acorn
//     https://github.com/marijnh/acorn.git
//
// Please use the [github bug tracker][ghbt] to report issues.
//
// [ghbt]: https://github.com/marijnh/acorn/issues
//
// This file defines the main parser interface. The library also comes
// with a [error-tolerant parser][dammit] and an
// [abstract syntax tree walker][walk], defined in other files.
//
// [dammit]: acorn_loose.js
// [walk]: util/walk.js

(function(root, mod) {
  if (typeof exports == "object" && typeof module == "object") return mod(exports); // CommonJS
  if (typeof define == "function" && define.amd) return define(["exports"], mod); // AMD
  mod(root.acorn || (root.acorn = {})); // Plain browser env
})(this, function(exports) {
  "use strict";

  exports.version = "0.4.1";

  // The main exported interface (under `self.acorn` when in the
  // browser) is a `parse` function that takes a code string and
  // returns an abstract syntax tree as specified by [Mozilla parser
  // API][api], with the caveat that the SpiderMonkey-specific syntax
  // (`let`, `yield`, inline XML, etc) is not recognized.
  //
  // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

  var options, input, inputLen, sourceFile;

  exports.parse = function(inpt, opts) {
    input = String(inpt); inputLen = input.length;
    setOptions(opts);
    initTokenState();
    return parseTopLevel(options.program);
  };

  // A second optional argument can be given to further configure
  // the parser process. These options are recognized:

  var defaultOptions = exports.defaultOptions = {
    // `ecmaVersion` indicates the ECMAScript version to parse. Must
    // be either 3 or 5. This
    // influences support for strict mode, the set of reserved words, and
    // support for getters and setter.
    ecmaVersion: 5,
    // Turn on `strictSemicolons` to prevent the parser from doing
    // automatic semicolon insertion.
    strictSemicolons: false,
    // When `allowTrailingCommas` is false, the parser will not allow
    // trailing commas in array and object literals.
    allowTrailingCommas: true,
    // By default, reserved words are not enforced. Enable
    // `forbidReserved` to enforce them.
    forbidReserved: false,
    // When `locations` is on, `loc` properties holding objects with
    // `start` and `end` properties in `{line, column}` form (with
    // line being 1-based and column 0-based) will be attached to the
    // nodes.
    locations: false,
    // A function can be passed as `onComment` option, which will
    // cause Acorn to call that function with `(block, text, start,
    // end)` parameters whenever a comment is skipped. `block` is a
    // boolean indicating whether this is a block (`/* */`) comment,
    // `text` is the content of the comment, and `start` and `end` are
    // character offsets that denote the start and end of the comment.
    // When the `locations` option is on, two more parameters are
    // passed, the full `{line, column}` locations of the start and
    // end of the comments.
    onComment: null,
    // Nodes have their start and end characters offsets recorded in
    // `start` and `end` properties (directly on the node, rather than
    // the `loc` object, which holds line/column data. To also add a
    // [semi-standardized][range] `range` property holding a `[start,
    // end]` array with the same numbers, set the `ranges` option to
    // `true`.
    //
    // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
    ranges: false,
    // It is possible to parse multiple files into a single AST by
    // passing the tree produced by parsing the first file as
    // `program` option in subsequent parses. This will add the
    // toplevel forms of the parsed file to the `Program` (top) node
    // of an existing parse tree.
    program: null,
    // When `location` is on, you can pass this to record the source
    // file in every node's `loc` object.
    sourceFile: null,
    // This value, if given, is stored in every node, whether
    // `location` is on or off.
    directSourceFile: null
  };

  function setOptions(opts) {
    options = opts || {};
    for (var opt in defaultOptions) if (!Object.prototype.hasOwnProperty.call(options, opt))
      options[opt] = defaultOptions[opt];
    sourceFile = options.sourceFile || null;
  }

  // The `getLineInfo` function is mostly useful when the
  // `locations` option is off (for performance reasons) and you
  // want to find the line/column position for a given character
  // offset. `input` should be the code string that the offset refers
  // into.

  var getLineInfo = exports.getLineInfo = function(input, offset) {
    for (var line = 1, cur = 0;;) {
      lineBreak.lastIndex = cur;
      var match = lineBreak.exec(input);
      if (match && match.index < offset) {
        ++line;
        cur = match.index + match[0].length;
      } else break;
    }
    return {line: line, column: offset - cur};
  };

  // Acorn is organized as a tokenizer and a recursive-descent parser.
  // The `tokenize` export provides an interface to the tokenizer.
  // Because the tokenizer is optimized for being efficiently used by
  // the Acorn parser itself, this interface is somewhat crude and not
  // very modular. Performing another parse or call to `tokenize` will
  // reset the internal state, and invalidate existing tokenizers.

  exports.tokenize = function(inpt, opts) {
    input = String(inpt); inputLen = input.length;
    setOptions(opts);
    initTokenState();

    var t = {};
    function getToken(forceRegexp) {
      readToken(forceRegexp);
      t.start = tokStart; t.end = tokEnd;
      t.startLoc = tokStartLoc; t.endLoc = tokEndLoc;
      t.type = tokType; t.value = tokVal;
      return t;
    }
    getToken.jumpTo = function(pos, reAllowed) {
      tokPos = pos;
      if (options.locations) {
        tokCurLine = 1;
        tokLineStart = lineBreak.lastIndex = 0;
        var match;
        while ((match = lineBreak.exec(input)) && match.index < pos) {
          ++tokCurLine;
          tokLineStart = match.index + match[0].length;
        }
      }
      tokRegexpAllowed = reAllowed;
      skipSpace();
    };
    return getToken;
  };

  // State is kept in (closure-)global variables. We already saw the
  // `options`, `input`, and `inputLen` variables above.

  // The current position of the tokenizer in the input.

  var tokPos;

  // The start and end offsets of the current token.

  var tokStart, tokEnd;

  // When `options.locations` is true, these hold objects
  // containing the tokens start and end line/column pairs.

  var tokStartLoc, tokEndLoc;

  // The type and value of the current token. Token types are objects,
  // named by variables against which they can be compared, and
  // holding properties that describe them (indicating, for example,
  // the precedence of an infix operator, and the original name of a
  // keyword token). The kind of value that's held in `tokVal` depends
  // on the type of the token. For literals, it is the literal value,
  // for operators, the operator name, and so on.

  var tokType, tokVal;

  // Interal state for the tokenizer. To distinguish between division
  // operators and regular expressions, it remembers whether the last
  // token was one that is allowed to be followed by an expression.
  // (If it is, a slash is probably a regexp, if it isn't it's a
  // division operator. See the `parseStatement` function for a
  // caveat.)

  var tokRegexpAllowed;

  // When `options.locations` is true, these are used to keep
  // track of the current line, and know when a new line has been
  // entered.

  var tokCurLine, tokLineStart;

  // These store the position of the previous token, which is useful
  // when finishing a node and assigning its `end` position.

  var lastStart, lastEnd, lastEndLoc;

  // This is the parser's state. `inFunction` is used to reject
  // `return` statements outside of functions, `labels` to verify that
  // `break` and `continue` have somewhere to jump to, and `strict`
  // indicates whether strict mode is on.

  var inFunction, labels, strict;

  // This function is used to raise exceptions on parse errors. It
  // takes an offset integer (into the current `input`) to indicate
  // the location of the error, attaches the position to the end
  // of the error message, and then raises a `SyntaxError` with that
  // message.

  function raise(pos, message) {
    var loc = getLineInfo(input, pos);
    message += " (" + loc.line + ":" + loc.column + ")";
    var err = new SyntaxError(message);
    err.pos = pos; err.loc = loc; err.raisedAt = tokPos;
    throw err;
  }

  // Reused empty array added for node fields that are always empty.

  var empty = [];

  // ## Token types

  // The assignment of fine-grained, information-carrying type objects
  // allows the tokenizer to store the information it has about a
  // token in a way that is very cheap for the parser to look up.

  // All token type variables start with an underscore, to make them
  // easy to recognize.

  // These are the general types. The `type` property is only used to
  // make them recognizeable when debugging.

  var _num = {type: "num"}, _regexp = {type: "regexp"}, _string = {type: "string"};
  var _name = {type: "name"}, _eof = {type: "eof"};

  // Keyword tokens. The `keyword` property (also used in keyword-like
  // operators) indicates that the token originated from an
  // identifier-like word, which is used when parsing property names.
  //
  // The `beforeExpr` property is used to disambiguate between regular
  // expressions and divisions. It is set on all token types that can
  // be followed by an expression (thus, a slash after them would be a
  // regular expression).
  //
  // `isLoop` marks a keyword as starting a loop, which is important
  // to know when parsing a label, in order to allow or disallow
  // continue jumps to that label.

  var _break = {keyword: "break"}, _case = {keyword: "case", beforeExpr: true}, _catch = {keyword: "catch"};
  var _continue = {keyword: "continue"}, _debugger = {keyword: "debugger"}, _default = {keyword: "default"};
  var _do = {keyword: "do", isLoop: true}, _else = {keyword: "else", beforeExpr: true};
  var _finally = {keyword: "finally"}, _for = {keyword: "for", isLoop: true}, _function = {keyword: "function"};
  var _if = {keyword: "if"}, _return = {keyword: "return", beforeExpr: true}, _switch = {keyword: "switch"};
  var _throw = {keyword: "throw", beforeExpr: true}, _try = {keyword: "try"}, _var = {keyword: "var"};
  var _while = {keyword: "while", isLoop: true}, _with = {keyword: "with"}, _new = {keyword: "new", beforeExpr: true};
  var _this = {keyword: "this"};

  // The keywords that denote values.

  var _null = {keyword: "null", atomValue: null}, _true = {keyword: "true", atomValue: true};
  var _false = {keyword: "false", atomValue: false};

  // Some keywords are treated as regular operators. `in` sometimes
  // (when parsing `for`) needs to be tested against specifically, so
  // we assign a variable name to it for quick comparing.

  var _in = {keyword: "in", binop: 7, beforeExpr: true};

  // Map keyword names to token types.

  var keywordTypes = {"break": _break, "case": _case, "catch": _catch,
                      "continue": _continue, "debugger": _debugger, "default": _default,
                      "do": _do, "else": _else, "finally": _finally, "for": _for,
                      "function": _function, "if": _if, "return": _return, "switch": _switch,
                      "throw": _throw, "try": _try, "var": _var, "while": _while, "with": _with,
                      "null": _null, "true": _true, "false": _false, "new": _new, "in": _in,
                      "instanceof": {keyword: "instanceof", binop: 7, beforeExpr: true}, "this": _this,
                      "typeof": {keyword: "typeof", prefix: true, beforeExpr: true},
                      "void": {keyword: "void", prefix: true, beforeExpr: true},
                      "delete": {keyword: "delete", prefix: true, beforeExpr: true}};

  // Punctuation token types. Again, the `type` property is purely for debugging.

  var _bracketL = {type: "[", beforeExpr: true}, _bracketR = {type: "]"}, _braceL = {type: "{", beforeExpr: true};
  var _braceR = {type: "}"}, _parenL = {type: "(", beforeExpr: true}, _parenR = {type: ")"};
  var _comma = {type: ",", beforeExpr: true}, _semi = {type: ";", beforeExpr: true};
  var _colon = {type: ":", beforeExpr: true}, _dot = {type: "."}, _question = {type: "?", beforeExpr: true};

  // Operators. These carry several kinds of properties to help the
  // parser use them properly (the presence of these properties is
  // what categorizes them as operators).
  //
  // `binop`, when present, specifies that this operator is a binary
  // operator, and will refer to its precedence.
  //
  // `prefix` and `postfix` mark the operator as a prefix or postfix
  // unary operator. `isUpdate` specifies that the node produced by
  // the operator should be of type UpdateExpression rather than
  // simply UnaryExpression (`++` and `--`).
  //
  // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
  // binary operators with a very low precedence, that should result
  // in AssignmentExpression nodes.

  var _slash = {binop: 10, beforeExpr: true}, _eq = {isAssign: true, beforeExpr: true};
  var _assign = {isAssign: true, beforeExpr: true};
  var _incDec = {postfix: true, prefix: true, isUpdate: true}, _prefix = {prefix: true, beforeExpr: true};
  var _logicalOR = {binop: 1, beforeExpr: true};
  var _logicalAND = {binop: 2, beforeExpr: true};
  var _bitwiseOR = {binop: 3, beforeExpr: true};
  var _bitwiseXOR = {binop: 4, beforeExpr: true};
  var _bitwiseAND = {binop: 5, beforeExpr: true};
  var _equality = {binop: 6, beforeExpr: true};
  var _relational = {binop: 7, beforeExpr: true};
  var _bitShift = {binop: 8, beforeExpr: true};
  var _plusMin = {binop: 9, prefix: true, beforeExpr: true};
  var _multiplyModulo = {binop: 10, beforeExpr: true};

  // Provide access to the token types for external users of the
  // tokenizer.

  exports.tokTypes = {bracketL: _bracketL, bracketR: _bracketR, braceL: _braceL, braceR: _braceR,
                      parenL: _parenL, parenR: _parenR, comma: _comma, semi: _semi, colon: _colon,
                      dot: _dot, question: _question, slash: _slash, eq: _eq, name: _name, eof: _eof,
                      num: _num, regexp: _regexp, string: _string};
  for (var kw in keywordTypes) exports.tokTypes["_" + kw] = keywordTypes[kw];

  // This is a trick taken from Esprima. It turns out that, on
  // non-Chrome browsers, to check whether a string is in a set, a
  // predicate containing a big ugly `switch` statement is faster than
  // a regular expression, and on Chrome the two are about on par.
  // This function uses `eval` (non-lexical) to produce such a
  // predicate from a space-separated string of words.
  //
  // It starts by sorting the words by length.

  function makePredicate(words) {
    words = words.split(" ");
    var f = "", cats = [];
    out: for (var i = 0; i < words.length; ++i) {
      for (var j = 0; j < cats.length; ++j)
        if (cats[j][0].length == words[i].length) {
          cats[j].push(words[i]);
          continue out;
        }
      cats.push([words[i]]);
    }
    function compareTo(arr) {
      if (arr.length == 1) return f += "return str === " + JSON.stringify(arr[0]) + ";";
      f += "switch(str){";
      for (var i = 0; i < arr.length; ++i) f += "case " + JSON.stringify(arr[i]) + ":";
      f += "return true}return false;";
    }

    // When there are more than three length categories, an outer
    // switch first dispatches on the lengths, to save on comparisons.

    if (cats.length > 3) {
      cats.sort(function(a, b) {return b.length - a.length;});
      f += "switch(str.length){";
      for (var i = 0; i < cats.length; ++i) {
        var cat = cats[i];
        f += "case " + cat[0].length + ":";
        compareTo(cat);
      }
      f += "}";

    // Otherwise, simply generate a flat `switch` statement.

    } else {
      compareTo(words);
    }
    return new Function("str", f);
  }

  // The ECMAScript 3 reserved word list.

  var isReservedWord3 = makePredicate("abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile");

  // ECMAScript 5 reserved words.

  var isReservedWord5 = makePredicate("class enum extends super const export import");

  // The additional reserved words in strict mode.

  var isStrictReservedWord = makePredicate("implements interface let package private protected public static yield");

  // The forbidden variable names in strict mode.

  var isStrictBadIdWord = makePredicate("eval arguments");

  // And the keywords.

  var isKeyword = makePredicate("break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this");

  // ## Character categories

  // Big ugly regular expressions that match characters in the
  // whitespace, identifier, and identifier-start categories. These
  // are only applied when a character is found to actually have a
  // code point above 128.

  var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
  var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
  var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
  var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
  var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

  // Whether a single character denotes a newline.

  var newline = /[\n\r\u2028\u2029]/;

  // Matches a whole line break (where CRLF is considered a single
  // line break). Used to count lines.

  var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

  // Test whether a given character code starts an identifier.

  var isIdentifierStart = exports.isIdentifierStart = function(code) {
    if (code < 65) return code === 36;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123)return true;
    return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
  };

  // Test whether a given character is part of an identifier.

  var isIdentifierChar = exports.isIdentifierChar = function(code) {
    if (code < 48) return code === 36;
    if (code < 58) return true;
    if (code < 65) return false;
    if (code < 91) return true;
    if (code < 97) return code === 95;
    if (code < 123)return true;
    return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
  };

  // ## Tokenizer

  // These are used when `options.locations` is on, for the
  // `tokStartLoc` and `tokEndLoc` properties.

  function line_loc_t() {
    this.line = tokCurLine;
    this.column = tokPos - tokLineStart;
  }

  // Reset the token state. Used at the start of a parse.

  function initTokenState() {
    tokCurLine = 1;
    tokPos = tokLineStart = 0;
    tokRegexpAllowed = true;
    skipSpace();
  }

  // Called at the end of every token. Sets `tokEnd`, `tokVal`, and
  // `tokRegexpAllowed`, and skips the space after the token, so that
  // the next one's `tokStart` will point at the right position.

  function finishToken(type, val) {
    tokEnd = tokPos;
    if (options.locations) tokEndLoc = new line_loc_t;
    tokType = type;
    skipSpace();
    tokVal = val;
    tokRegexpAllowed = type.beforeExpr;
  }

  function skipBlockComment() {
    var startLoc = options.onComment && options.locations && new line_loc_t;
    var start = tokPos, end = input.indexOf("*/", tokPos += 2);
    if (end === -1) raise(tokPos - 2, "Unterminated comment");
    tokPos = end + 2;
    if (options.locations) {
      lineBreak.lastIndex = start;
      var match;
      while ((match = lineBreak.exec(input)) && match.index < tokPos) {
        ++tokCurLine;
        tokLineStart = match.index + match[0].length;
      }
    }
    if (options.onComment)
      options.onComment(true, input.slice(start + 2, end), start, tokPos,
                        startLoc, options.locations && new line_loc_t);
  }

  function skipLineComment() {
    var start = tokPos;
    var startLoc = options.onComment && options.locations && new line_loc_t;
    var ch = input.charCodeAt(tokPos+=2);
    while (tokPos < inputLen && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) {
      ++tokPos;
      ch = input.charCodeAt(tokPos);
    }
    if (options.onComment)
      options.onComment(false, input.slice(start + 2, tokPos), start, tokPos,
                        startLoc, options.locations && new line_loc_t);
  }

  // Called at the start of the parse and after every token. Skips
  // whitespace and comments, and.

  function skipSpace() {
    while (tokPos < inputLen) {
      var ch = input.charCodeAt(tokPos);
      if (ch === 32) { // ' '
        ++tokPos;
      } else if (ch === 13) {
        ++tokPos;
        var next = input.charCodeAt(tokPos);
        if (next === 10) {
          ++tokPos;
        }
        if (options.locations) {
          ++tokCurLine;
          tokLineStart = tokPos;
        }
      } else if (ch === 10 || ch === 8232 || ch === 8233) {
        ++tokPos;
        if (options.locations) {
          ++tokCurLine;
          tokLineStart = tokPos;
        }
      } else if (ch > 8 && ch < 14) {
        ++tokPos;
      } else if (ch === 47) { // '/'
        var next = input.charCodeAt(tokPos + 1);
        if (next === 42) { // '*'
          skipBlockComment();
        } else if (next === 47) { // '/'
          skipLineComment();
        } else break;
      } else if (ch === 160) { // '\xa0'
        ++tokPos;
      } else if (ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
        ++tokPos;
      } else {
        break;
      }
    }
  }

  // ### Token reading

  // This is the function that is called to fetch the next token. It
  // is somewhat obscure, because it works in character codes rather
  // than characters, and because operator parsing has been inlined
  // into it.
  //
  // All in the name of speed.
  //
  // The `forceRegexp` parameter is used in the one case where the
  // `tokRegexpAllowed` trick does not work. See `parseStatement`.

  function readToken_dot() {
    var next = input.charCodeAt(tokPos + 1);
    if (next >= 48 && next <= 57) return readNumber(true);
    ++tokPos;
    return finishToken(_dot);
  }

  function readToken_slash() { // '/'
    var next = input.charCodeAt(tokPos + 1);
    if (tokRegexpAllowed) {++tokPos; return readRegexp();}
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_slash, 1);
  }

  function readToken_mult_modulo() { // '%*'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_multiplyModulo, 1);
  }

  function readToken_pipe_amp(code) { // '|&'
    var next = input.charCodeAt(tokPos + 1);
    if (next === code) return finishOp(code === 124 ? _logicalOR : _logicalAND, 2);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(code === 124 ? _bitwiseOR : _bitwiseAND, 1);
  }

  function readToken_caret() { // '^'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_bitwiseXOR, 1);
  }

  function readToken_plus_min(code) { // '+-'
    var next = input.charCodeAt(tokPos + 1);
    if (next === code) {
      if (next == 45 && input.charCodeAt(tokPos + 2) == 62 &&
          newline.test(input.slice(lastEnd, tokPos))) {
        // A `-->` line comment
        tokPos += 3;
        skipLineComment();
        skipSpace();
        return readToken();
      }
      return finishOp(_incDec, 2);
    }
    if (next === 61) return finishOp(_assign, 2);
    return finishOp(_plusMin, 1);
  }

  function readToken_lt_gt(code) { // '<>'
    var next = input.charCodeAt(tokPos + 1);
    var size = 1;
    if (next === code) {
      size = code === 62 && input.charCodeAt(tokPos + 2) === 62 ? 3 : 2;
      if (input.charCodeAt(tokPos + size) === 61) return finishOp(_assign, size + 1);
      return finishOp(_bitShift, size);
    }
    if (next == 33 && code == 60 && input.charCodeAt(tokPos + 2) == 45 &&
        input.charCodeAt(tokPos + 3) == 45) {
      // `<!--`, an XML-style comment that should be interpreted as a line comment
      tokPos += 4;
      skipLineComment();
      skipSpace();
      return readToken();
    }
    if (next === 61)
      size = input.charCodeAt(tokPos + 2) === 61 ? 3 : 2;
    return finishOp(_relational, size);
  }

  function readToken_eq_excl(code) { // '=!'
    var next = input.charCodeAt(tokPos + 1);
    if (next === 61) return finishOp(_equality, input.charCodeAt(tokPos + 2) === 61 ? 3 : 2);
    return finishOp(code === 61 ? _eq : _prefix, 1);
  }

  function getTokenFromCode(code) {
    switch(code) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit.
    case 46: // '.'
      return readToken_dot();

      // Punctuation tokens.
    case 40: ++tokPos; return finishToken(_parenL);
    case 41: ++tokPos; return finishToken(_parenR);
    case 59: ++tokPos; return finishToken(_semi);
    case 44: ++tokPos; return finishToken(_comma);
    case 91: ++tokPos; return finishToken(_bracketL);
    case 93: ++tokPos; return finishToken(_bracketR);
    case 123: ++tokPos; return finishToken(_braceL);
    case 125: ++tokPos; return finishToken(_braceR);
    case 58: ++tokPos; return finishToken(_colon);
    case 63: ++tokPos; return finishToken(_question);

      // '0x' is a hexadecimal number.
    case 48: // '0'
      var next = input.charCodeAt(tokPos + 1);
      if (next === 120 || next === 88) return readHexNumber();
      // Anything else beginning with a digit is an integer, octal
      // number, or float.
    case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
      return readNumber(false);

      // Quotes produce strings.
    case 34: case 39: // '"', "'"
      return readString(code);

    // Operators are parsed inline in tiny state machines. '=' (61) is
    // often referred to. `finishOp` simply skips the amount of
    // characters it is given as second argument, and returns a token
    // of the type given by its first argument.

    case 47: // '/'
      return readToken_slash(code);

    case 37: case 42: // '%*'
      return readToken_mult_modulo();

    case 124: case 38: // '|&'
      return readToken_pipe_amp(code);

    case 94: // '^'
      return readToken_caret();

    case 43: case 45: // '+-'
      return readToken_plus_min(code);

    case 60: case 62: // '<>'
      return readToken_lt_gt(code);

    case 61: case 33: // '=!'
      return readToken_eq_excl(code);

    case 126: // '~'
      return finishOp(_prefix, 1);
    }

    return false;
  }

  function readToken(forceRegexp) {
    if (!forceRegexp) tokStart = tokPos;
    else tokPos = tokStart + 1;
    if (options.locations) tokStartLoc = new line_loc_t;
    if (forceRegexp) return readRegexp();
    if (tokPos >= inputLen) return finishToken(_eof);

    var code = input.charCodeAt(tokPos);
    // Identifier or keyword. '\uXXXX' sequences are allowed in
    // identifiers, so '\' also dispatches to that.
    if (isIdentifierStart(code) || code === 92 /* '\' */) return readWord();

    var tok = getTokenFromCode(code);

    if (tok === false) {
      // If we are here, we either found a non-ASCII identifier
      // character, or something that's entirely disallowed.
      var ch = String.fromCharCode(code);
      if (ch === "\\" || nonASCIIidentifierStart.test(ch)) return readWord();
      raise(tokPos, "Unexpected character '" + ch + "'");
    }
    return tok;
  }

  function finishOp(type, size) {
    var str = input.slice(tokPos, tokPos + size);
    tokPos += size;
    finishToken(type, str);
  }

  // Parse a regular expression. Some context-awareness is necessary,
  // since a '/' inside a '[]' set does not end the expression.

  function readRegexp() {
    var content = "", escaped, inClass, start = tokPos;
    for (;;) {
      if (tokPos >= inputLen) raise(start, "Unterminated regular expression");
      var ch = input.charAt(tokPos);
      if (newline.test(ch)) raise(start, "Unterminated regular expression");
      if (!escaped) {
        if (ch === "[") inClass = true;
        else if (ch === "]" && inClass) inClass = false;
        else if (ch === "/" && !inClass) break;
        escaped = ch === "\\";
      } else escaped = false;
      ++tokPos;
    }
    var content = input.slice(start, tokPos);
    ++tokPos;
    // Need to use `readWord1` because '\uXXXX' sequences are allowed
    // here (don't ask).
    var mods = readWord1();
    if (mods && !/^[gmsiy]*$/.test(mods)) raise(start, "Invalid regexp flag");
    return finishToken(_regexp, new RegExp(content, mods));
  }

  // Read an integer in the given radix. Return null if zero digits
  // were read, the integer value otherwise. When `len` is given, this
  // will return `null` unless the integer has exactly `len` digits.

  function readInt(radix, len) {
    var start = tokPos, total = 0;
    for (var i = 0, e = len == null ? Infinity : len; i < e; ++i) {
      var code = input.charCodeAt(tokPos), val;
      if (code >= 97) val = code - 97 + 10; // a
      else if (code >= 65) val = code - 65 + 10; // A
      else if (code >= 48 && code <= 57) val = code - 48; // 0-9
      else val = Infinity;
      if (val >= radix) break;
      ++tokPos;
      total = total * radix + val;
    }
    if (tokPos === start || len != null && tokPos - start !== len) return null;

    return total;
  }

  function readHexNumber() {
    tokPos += 2; // 0x
    var val = readInt(16);
    if (val == null) raise(tokStart + 2, "Expected hexadecimal number");
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");
    return finishToken(_num, val);
  }

  // Read an integer, octal integer, or floating-point number.

  function readNumber(startsWithDot) {
    var start = tokPos, isFloat = false, octal = input.charCodeAt(tokPos) === 48;
    if (!startsWithDot && readInt(10) === null) raise(start, "Invalid number");
    if (input.charCodeAt(tokPos) === 46) {
      ++tokPos;
      readInt(10);
      isFloat = true;
    }
    var next = input.charCodeAt(tokPos);
    if (next === 69 || next === 101) { // 'eE'
      next = input.charCodeAt(++tokPos);
      if (next === 43 || next === 45) ++tokPos; // '+-'
      if (readInt(10) === null) raise(start, "Invalid number");
      isFloat = true;
    }
    if (isIdentifierStart(input.charCodeAt(tokPos))) raise(tokPos, "Identifier directly after number");

    var str = input.slice(start, tokPos), val;
    if (isFloat) val = parseFloat(str);
    else if (!octal || str.length === 1) val = parseInt(str, 10);
    else if (/[89]/.test(str) || strict) raise(start, "Invalid number");
    else val = parseInt(str, 8);
    return finishToken(_num, val);
  }

  // Read a string value, interpreting backslash-escapes.

  function readString(quote) {
    tokPos++;
    var out = "";
    for (;;) {
      if (tokPos >= inputLen) raise(tokStart, "Unterminated string constant");
      var ch = input.charCodeAt(tokPos);
      if (ch === quote) {
        ++tokPos;
        return finishToken(_string, out);
      }
      if (ch === 92) { // '\'
        ch = input.charCodeAt(++tokPos);
        var octal = /^[0-7]+/.exec(input.slice(tokPos, tokPos + 3));
        if (octal) octal = octal[0];
        while (octal && parseInt(octal, 8) > 255) octal = octal.slice(0, -1);
        if (octal === "0") octal = null;
        ++tokPos;
        if (octal) {
          if (strict) raise(tokPos - 2, "Octal literal in strict mode");
          out += String.fromCharCode(parseInt(octal, 8));
          tokPos += octal.length - 1;
        } else {
          switch (ch) {
          case 110: out += "\n"; break; // 'n' -> '\n'
          case 114: out += "\r"; break; // 'r' -> '\r'
          case 120: out += String.fromCharCode(readHexChar(2)); break; // 'x'
          case 117: out += String.fromCharCode(readHexChar(4)); break; // 'u'
          case 85: out += String.fromCharCode(readHexChar(8)); break; // 'U'
          case 116: out += "\t"; break; // 't' -> '\t'
          case 98: out += "\b"; break; // 'b' -> '\b'
          case 118: out += "\u000b"; break; // 'v' -> '\u000b'
          case 102: out += "\f"; break; // 'f' -> '\f'
          case 48: out += "\0"; break; // 0 -> '\0'
          case 13: if (input.charCodeAt(tokPos) === 10) ++tokPos; // '\r\n'
          case 10: // ' \n'
            if (options.locations) { tokLineStart = tokPos; ++tokCurLine; }
            break;
          default: out += String.fromCharCode(ch); break;
          }
        }
      } else {
        if (ch === 13 || ch === 10 || ch === 8232 || ch === 8233) raise(tokStart, "Unterminated string constant");
        out += String.fromCharCode(ch); // '\'
        ++tokPos;
      }
    }
  }

  // Used to read character escape sequences ('\x', '\u', '\U').

  function readHexChar(len) {
    var n = readInt(16, len);
    if (n === null) raise(tokStart, "Bad character escape sequence");
    return n;
  }

  // Used to signal to callers of `readWord1` whether the word
  // contained any escape sequences. This is needed because words with
  // escape sequences must not be interpreted as keywords.

  var containsEsc;

  // Read an identifier, and return it as a string. Sets `containsEsc`
  // to whether the word contained a '\u' escape.
  //
  // Only builds up the word character-by-character when it actually
  // containeds an escape, as a micro-optimization.

  function readWord1() {
    containsEsc = false;
    var word, first = true, start = tokPos;
    for (;;) {
      var ch = input.charCodeAt(tokPos);
      if (isIdentifierChar(ch)) {
        if (containsEsc) word += input.charAt(tokPos);
        ++tokPos;
      } else if (ch === 92) { // "\"
        if (!containsEsc) word = input.slice(start, tokPos);
        containsEsc = true;
        if (input.charCodeAt(++tokPos) != 117) // "u"
          raise(tokPos, "Expecting Unicode escape sequence \\uXXXX");
        ++tokPos;
        var esc = readHexChar(4);
        var escStr = String.fromCharCode(esc);
        if (!escStr) raise(tokPos - 1, "Invalid Unicode escape");
        if (!(first ? isIdentifierStart(esc) : isIdentifierChar(esc)))
          raise(tokPos - 4, "Invalid Unicode escape");
        word += escStr;
      } else {
        break;
      }
      first = false;
    }
    return containsEsc ? word : input.slice(start, tokPos);
  }

  // Read an identifier or keyword token. Will check for reserved
  // words when necessary.

  function readWord() {
    var word = readWord1();
    var type = _name;
    if (!containsEsc) {
      if (isKeyword(word)) type = keywordTypes[word];
      else if (options.forbidReserved &&
               (options.ecmaVersion === 3 ? isReservedWord3 : isReservedWord5)(word) ||
               strict && isStrictReservedWord(word))
        raise(tokStart, "The keyword '" + word + "' is reserved");
    }
    return finishToken(type, word);
  }

  // ## Parser

  // A recursive descent parser operates by defining functions for all
  // syntactic elements, and recursively calling those, each function
  // advancing the input stream and returning an AST node. Precedence
  // of constructs (for example, the fact that `!x[1]` means `!(x[1])`
  // instead of `(!x)[1]` is handled by the fact that the parser
  // function that parses unary prefix operators is called first, and
  // in turn calls the function that parses `[]` subscripts — that
  // way, it'll receive the node for `x[1]` already parsed, and wraps
  // *that* in the unary operator node.
  //
  // Acorn uses an [operator precedence parser][opp] to handle binary
  // operator precedence, because it is much more compact than using
  // the technique outlined above, which uses different, nesting
  // functions to specify precedence, for all of the ten binary
  // precedence levels that JavaScript defines.
  //
  // [opp]: http://en.wikipedia.org/wiki/Operator-precedence_parser

  // ### Parser utilities

  // Continue to the next token.

  function next() {
    lastStart = tokStart;
    lastEnd = tokEnd;
    lastEndLoc = tokEndLoc;
    readToken();
  }

  // Enter strict mode. Re-reads the next token to please pedantic
  // tests ("use strict"; 010; -- should fail).

  function setStrict(strct) {
    strict = strct;
    tokPos = lastEnd;
    if (options.locations) {
      while (tokPos < tokLineStart) {
        tokLineStart = input.lastIndexOf("\n", tokLineStart - 2) + 1;
        --tokCurLine;
      }
    }
    skipSpace();
    readToken();
  }

  // Start an AST node, attaching a start offset.

  function node_t() {
    this.type = null;
    this.start = tokStart;
    this.end = null;
  }

  function node_loc_t() {
    this.start = tokStartLoc;
    this.end = null;
    if (sourceFile !== null) this.source = sourceFile;
  }

  function startNode() {
    var node = new node_t();
    if (options.locations)
      node.loc = new node_loc_t();
    if (options.directSourceFile)
      node.sourceFile = options.directSourceFile;
    if (options.ranges)
      node.range = [tokStart, 0];
    return node;
  }

  // Start a node whose start offset information should be based on
  // the start of another node. For example, a binary operator node is
  // only started after its left-hand side has already been parsed.

  function startNodeFrom(other) {
    var node = new node_t();
    node.start = other.start;
    if (options.locations) {
      node.loc = new node_loc_t();
      node.loc.start = other.loc.start;
    }
    if (options.ranges)
      node.range = [other.range[0], 0];

    return node;
  }

  // Finish an AST node, adding `type` and `end` properties.

  function finishNode(node, type) {
    node.type = type;
    node.end = lastEnd;
    if (options.locations)
      node.loc.end = lastEndLoc;
    if (options.ranges)
      node.range[1] = lastEnd;
    return node;
  }

  // Test whether a statement node is the string literal `"use strict"`.

  function isUseStrict(stmt) {
    return options.ecmaVersion >= 5 && stmt.type === "ExpressionStatement" &&
      stmt.expression.type === "Literal" && stmt.expression.value === "use strict";
  }

  // Predicate that tests whether the next token is of the given
  // type, and if yes, consumes it as a side effect.

  function eat(type) {
    if (tokType === type) {
      next();
      return true;
    }
  }

  // Test whether a semicolon can be inserted at the current position.

  function canInsertSemicolon() {
    return !options.strictSemicolons &&
      (tokType === _eof || tokType === _braceR || newline.test(input.slice(lastEnd, tokStart)));
  }

  // Consume a semicolon, or, failing that, see if we are allowed to
  // pretend that there is a semicolon at this position.

  function semicolon() {
    if (!eat(_semi) && !canInsertSemicolon()) unexpected();
  }

  // Expect a token of a given type. If found, consume it, otherwise,
  // raise an unexpected token error.

  function expect(type) {
    if (tokType === type) next();
    else unexpected();
  }

  // Raise an unexpected token error.

  function unexpected() {
    raise(tokStart, "Unexpected token");
  }

  // Verify that a node is an lval — something that can be assigned
  // to.

  function checkLVal(expr) {
    if (expr.type !== "Identifier" && expr.type !== "MemberExpression")
      raise(expr.start, "Assigning to rvalue");
    if (strict && expr.type === "Identifier" && isStrictBadIdWord(expr.name))
      raise(expr.start, "Assigning to " + expr.name + " in strict mode");
  }

  // ### Statement parsing

  // Parse a program. Initializes the parser, reads any number of
  // statements, and wraps them in a Program node.  Optionally takes a
  // `program` argument.  If present, the statements will be appended
  // to its body instead of creating a new node.

  function parseTopLevel(program) {
    lastStart = lastEnd = tokPos;
    if (options.locations) lastEndLoc = new line_loc_t;
    inFunction = strict = null;
    labels = [];
    readToken();

    var node = program || startNode(), first = true;
    if (!program) node.body = [];
    while (tokType !== _eof) {
      var stmt = parseStatement();
      node.body.push(stmt);
      if (first && isUseStrict(stmt)) setStrict(true);
      first = false;
    }
    return finishNode(node, "Program");
  }

  var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

  // Parse a single statement.
  //
  // If expecting a statement and finding a slash operator, parse a
  // regular expression literal. This is to handle cases like
  // `if (foo) /blah/.exec(foo);`, where looking at the previous token
  // does not help.

  function parseStatement() {
    if (tokType === _slash || tokType === _assign && tokVal == "/=")
      readToken(true);

    var starttype = tokType, node = startNode();

    // Most types of statements are recognized by the keyword they
    // start with. Many are trivial to parse, some require a bit of
    // complexity.

    switch (starttype) {
    case _break: case _continue:
      next();
      var isBreak = starttype === _break;
      if (eat(_semi) || canInsertSemicolon()) node.label = null;
      else if (tokType !== _name) unexpected();
      else {
        node.label = parseIdent();
        semicolon();
      }

      // Verify that there is an actual destination to break or
      // continue to.
      for (var i = 0; i < labels.length; ++i) {
        var lab = labels[i];
        if (node.label == null || lab.name === node.label.name) {
          if (lab.kind != null && (isBreak || lab.kind === "loop")) break;
          if (node.label && isBreak) break;
        }
      }
      if (i === labels.length) raise(node.start, "Unsyntactic " + starttype.keyword);
      return finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement");

    case _debugger:
      next();
      semicolon();
      return finishNode(node, "DebuggerStatement");

    case _do:
      next();
      labels.push(loopLabel);
      node.body = parseStatement();
      labels.pop();
      expect(_while);
      node.test = parseParenExpression();
      semicolon();
      return finishNode(node, "DoWhileStatement");

      // Disambiguating between a `for` and a `for`/`in` loop is
      // non-trivial. Basically, we have to parse the init `var`
      // statement or expression, disallowing the `in` operator (see
      // the second parameter to `parseExpression`), and then check
      // whether the next token is `in`. When there is no init part
      // (semicolon immediately after the opening parenthesis), it is
      // a regular `for` loop.

    case _for:
      next();
      labels.push(loopLabel);
      expect(_parenL);
      if (tokType === _semi) return parseFor(node, null);
      if (tokType === _var) {
        var init = startNode();
        next();
        parseVar(init, true);
        finishNode(init, "VariableDeclaration");
        if (init.declarations.length === 1 && eat(_in))
          return parseForIn(node, init);
        return parseFor(node, init);
      }
      var init = parseExpression(false, true);
      if (eat(_in)) {checkLVal(init); return parseForIn(node, init);}
      return parseFor(node, init);

    case _function:
      next();
      return parseFunction(node, true);

    case _if:
      next();
      node.test = parseParenExpression();
      node.consequent = parseStatement();
      node.alternate = eat(_else) ? parseStatement() : null;
      return finishNode(node, "IfStatement");

    case _return:
      if (!inFunction) raise(tokStart, "'return' outside of function");
      next();

      // In `return` (and `break`/`continue`), the keywords with
      // optional arguments, we eagerly look for a semicolon or the
      // possibility to insert one.

      if (eat(_semi) || canInsertSemicolon()) node.argument = null;
      else { node.argument = parseExpression(); semicolon(); }
      return finishNode(node, "ReturnStatement");

    case _switch:
      next();
      node.discriminant = parseParenExpression();
      node.cases = [];
      expect(_braceL);
      labels.push(switchLabel);

      // Statements under must be grouped (by label) in SwitchCase
      // nodes. `cur` is used to keep the node that we are currently
      // adding statements to.

      for (var cur, sawDefault; tokType != _braceR;) {
        if (tokType === _case || tokType === _default) {
          var isCase = tokType === _case;
          if (cur) finishNode(cur, "SwitchCase");
          node.cases.push(cur = startNode());
          cur.consequent = [];
          next();
          if (isCase) cur.test = parseExpression();
          else {
            if (sawDefault) raise(lastStart, "Multiple default clauses"); sawDefault = true;
            cur.test = null;
          }
          expect(_colon);
        } else {
          if (!cur) unexpected();
          cur.consequent.push(parseStatement());
        }
      }
      if (cur) finishNode(cur, "SwitchCase");
      next(); // Closing brace
      labels.pop();
      return finishNode(node, "SwitchStatement");

    case _throw:
      next();
      if (newline.test(input.slice(lastEnd, tokStart)))
        raise(lastEnd, "Illegal newline after throw");
      node.argument = parseExpression();
      semicolon();
      return finishNode(node, "ThrowStatement");

    case _try:
      next();
      node.block = parseBlock();
      node.handler = null;
      if (tokType === _catch) {
        var clause = startNode();
        next();
        expect(_parenL);
        clause.param = parseIdent();
        if (strict && isStrictBadIdWord(clause.param.name))
          raise(clause.param.start, "Binding " + clause.param.name + " in strict mode");
        expect(_parenR);
        clause.guard = null;
        clause.body = parseBlock();
        node.handler = finishNode(clause, "CatchClause");
      }
      node.guardedHandlers = empty;
      node.finalizer = eat(_finally) ? parseBlock() : null;
      if (!node.handler && !node.finalizer)
        raise(node.start, "Missing catch or finally clause");
      return finishNode(node, "TryStatement");

    case _var:
      next();
      parseVar(node);
      semicolon();
      return finishNode(node, "VariableDeclaration");

    case _while:
      next();
      node.test = parseParenExpression();
      labels.push(loopLabel);
      node.body = parseStatement();
      labels.pop();
      return finishNode(node, "WhileStatement");

    case _with:
      if (strict) raise(tokStart, "'with' in strict mode");
      next();
      node.object = parseParenExpression();
      node.body = parseStatement();
      return finishNode(node, "WithStatement");

    case _braceL:
      return parseBlock();

    case _semi:
      next();
      return finishNode(node, "EmptyStatement");

      // If the statement does not start with a statement keyword or a
      // brace, it's an ExpressionStatement or LabeledStatement. We
      // simply start parsing an expression, and afterwards, if the
      // next token is a colon and the expression was a simple
      // Identifier node, we switch to interpreting it as a label.

    default:
      var maybeName = tokVal, expr = parseExpression();
      if (starttype === _name && expr.type === "Identifier" && eat(_colon)) {
        for (var i = 0; i < labels.length; ++i)
          if (labels[i].name === maybeName) raise(expr.start, "Label '" + maybeName + "' is already declared");
        var kind = tokType.isLoop ? "loop" : tokType === _switch ? "switch" : null;
        labels.push({name: maybeName, kind: kind});
        node.body = parseStatement();
        labels.pop();
        node.label = expr;
        return finishNode(node, "LabeledStatement");
      } else {
        node.expression = expr;
        semicolon();
        return finishNode(node, "ExpressionStatement");
      }
    }
  }

  // Used for constructs like `switch` and `if` that insist on
  // parentheses around their expression.

  function parseParenExpression() {
    expect(_parenL);
    var val = parseExpression();
    expect(_parenR);
    return val;
  }

  // Parse a semicolon-enclosed block of statements, handling `"use
  // strict"` declarations when `allowStrict` is true (used for
  // function bodies).

  function parseBlock(allowStrict) {
    var node = startNode(), first = true, strict = false, oldStrict;
    node.body = [];
    expect(_braceL);
    while (!eat(_braceR)) {
      var stmt = parseStatement();
      node.body.push(stmt);
      if (first && allowStrict && isUseStrict(stmt)) {
        oldStrict = strict;
        setStrict(strict = true);
      }
      first = false;
    }
    if (strict && !oldStrict) setStrict(false);
    return finishNode(node, "BlockStatement");
  }

  // Parse a regular `for` loop. The disambiguation code in
  // `parseStatement` will already have parsed the init statement or
  // expression.

  function parseFor(node, init) {
    node.init = init;
    expect(_semi);
    node.test = tokType === _semi ? null : parseExpression();
    expect(_semi);
    node.update = tokType === _parenR ? null : parseExpression();
    expect(_parenR);
    node.body = parseStatement();
    labels.pop();
    return finishNode(node, "ForStatement");
  }

  // Parse a `for`/`in` loop.

  function parseForIn(node, init) {
    node.left = init;
    node.right = parseExpression();
    expect(_parenR);
    node.body = parseStatement();
    labels.pop();
    return finishNode(node, "ForInStatement");
  }

  // Parse a list of variable declarations.

  function parseVar(node, noIn) {
    node.declarations = [];
    node.kind = "var";
    for (;;) {
      var decl = startNode();
      decl.id = parseIdent();
      if (strict && isStrictBadIdWord(decl.id.name))
        raise(decl.id.start, "Binding " + decl.id.name + " in strict mode");
      decl.init = eat(_eq) ? parseExpression(true, noIn) : null;
      node.declarations.push(finishNode(decl, "VariableDeclarator"));
      if (!eat(_comma)) break;
    }
    return node;
  }

  // ### Expression parsing

  // These nest, from the most general expression type at the top to
  // 'atomic', nondivisible expression types at the bottom. Most of
  // the functions will simply let the function(s) below them parse,
  // and, *if* the syntactic construct they handle is present, wrap
  // the AST node that the inner parser gave them in another node.

  // Parse a full expression. The arguments are used to forbid comma
  // sequences (in argument lists, array literals, or object literals)
  // or the `in` operator (in for loops initalization expressions).

  function parseExpression(noComma, noIn) {
    var expr = parseMaybeAssign(noIn);
    if (!noComma && tokType === _comma) {
      var node = startNodeFrom(expr);
      node.expressions = [expr];
      while (eat(_comma)) node.expressions.push(parseMaybeAssign(noIn));
      return finishNode(node, "SequenceExpression");
    }
    return expr;
  }

  // Parse an assignment expression. This includes applications of
  // operators like `+=`.

  function parseMaybeAssign(noIn) {
    var left = parseMaybeConditional(noIn);
    if (tokType.isAssign) {
      var node = startNodeFrom(left);
      node.operator = tokVal;
      node.left = left;
      next();
      node.right = parseMaybeAssign(noIn);
      checkLVal(left);
      return finishNode(node, "AssignmentExpression");
    }
    return left;
  }

  // Parse a ternary conditional (`?:`) operator.

  function parseMaybeConditional(noIn) {
    var expr = parseExprOps(noIn);
    if (eat(_question)) {
      var node = startNodeFrom(expr);
      node.test = expr;
      node.consequent = parseExpression(true);
      expect(_colon);
      node.alternate = parseExpression(true, noIn);
      return finishNode(node, "ConditionalExpression");
    }
    return expr;
  }

  // Start the precedence parser.

  function parseExprOps(noIn) {
    return parseExprOp(parseMaybeUnary(), -1, noIn);
  }

  // Parse binary operators with the operator precedence parsing
  // algorithm. `left` is the left-hand side of the operator.
  // `minPrec` provides context that allows the function to stop and
  // defer further parser to one of its callers when it encounters an
  // operator that has a lower precedence than the set it is parsing.

  function parseExprOp(left, minPrec, noIn) {
    var prec = tokType.binop;
    if (prec != null && (!noIn || tokType !== _in)) {
      if (prec > minPrec) {
        var node = startNodeFrom(left);
        node.left = left;
        node.operator = tokVal;
        var op = tokType;
        next();
        node.right = parseExprOp(parseMaybeUnary(), prec, noIn);
        var exprNode = finishNode(node, (op === _logicalOR || op === _logicalAND) ? "LogicalExpression" : "BinaryExpression");
        return parseExprOp(exprNode, minPrec, noIn);
      }
    }
    return left;
  }

  // Parse unary operators, both prefix and postfix.

  function parseMaybeUnary() {
    if (tokType.prefix) {
      var node = startNode(), update = tokType.isUpdate;
      node.operator = tokVal;
      node.prefix = true;
      tokRegexpAllowed = true;
      next();
      node.argument = parseMaybeUnary();
      if (update) checkLVal(node.argument);
      else if (strict && node.operator === "delete" &&
               node.argument.type === "Identifier")
        raise(node.start, "Deleting local variable in strict mode");
      return finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
    }
    var expr = parseExprSubscripts();
    while (tokType.postfix && !canInsertSemicolon()) {
      var node = startNodeFrom(expr);
      node.operator = tokVal;
      node.prefix = false;
      node.argument = expr;
      checkLVal(expr);
      next();
      expr = finishNode(node, "UpdateExpression");
    }
    return expr;
  }

  // Parse call, dot, and `[]`-subscript expressions.

  function parseExprSubscripts() {
    return parseSubscripts(parseExprAtom());
  }

  function parseSubscripts(base, noCalls) {
    if (eat(_dot)) {
      var node = startNodeFrom(base);
      node.object = base;
      node.property = parseIdent(true);
      node.computed = false;
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (eat(_bracketL)) {
      var node = startNodeFrom(base);
      node.object = base;
      node.property = parseExpression();
      node.computed = true;
      expect(_bracketR);
      return parseSubscripts(finishNode(node, "MemberExpression"), noCalls);
    } else if (!noCalls && eat(_parenL)) {
      var node = startNodeFrom(base);
      node.callee = base;
      node.arguments = parseExprList(_parenR, false);
      return parseSubscripts(finishNode(node, "CallExpression"), noCalls);
    } else return base;
  }

  // Parse an atomic expression — either a single token that is an
  // expression, an expression started by a keyword like `function` or
  // `new`, or an expression wrapped in punctuation like `()`, `[]`,
  // or `{}`.

  function parseExprAtom() {
    switch (tokType) {
    case _this:
      var node = startNode();
      next();
      return finishNode(node, "ThisExpression");
    case _name:
      return parseIdent();
    case _num: case _string: case _regexp:
      var node = startNode();
      node.value = tokVal;
      node.raw = input.slice(tokStart, tokEnd);
      next();
      return finishNode(node, "Literal");

    case _null: case _true: case _false:
      var node = startNode();
      node.value = tokType.atomValue;
      node.raw = tokType.keyword;
      next();
      return finishNode(node, "Literal");

    case _parenL:
      var tokStartLoc1 = tokStartLoc, tokStart1 = tokStart;
      next();
      var val = parseExpression();
      val.start = tokStart1;
      val.end = tokEnd;
      if (options.locations) {
        val.loc.start = tokStartLoc1;
        val.loc.end = tokEndLoc;
      }
      if (options.ranges)
        val.range = [tokStart1, tokEnd];
      expect(_parenR);
      return val;

    case _bracketL:
      var node = startNode();
      next();
      node.elements = parseExprList(_bracketR, true, true);
      return finishNode(node, "ArrayExpression");

    case _braceL:
      return parseObj();

    case _function:
      var node = startNode();
      next();
      return parseFunction(node, false);

    case _new:
      return parseNew();

    default:
      unexpected();
    }
  }

  // New's precedence is slightly tricky. It must allow its argument
  // to be a `[]` or dot subscript expression, but not a call — at
  // least, not without wrapping it in parentheses. Thus, it uses the

  function parseNew() {
    var node = startNode();
    next();
    node.callee = parseSubscripts(parseExprAtom(), true);
    if (eat(_parenL)) node.arguments = parseExprList(_parenR, false);
    else node.arguments = empty;
    return finishNode(node, "NewExpression");
  }

  // Parse an object literal.

  function parseObj() {
    var node = startNode(), first = true, sawGetSet = false;
    node.properties = [];
    next();
    while (!eat(_braceR)) {
      if (!first) {
        expect(_comma);
        if (options.allowTrailingCommas && eat(_braceR)) break;
      } else first = false;

      var prop = {key: parsePropertyName()}, isGetSet = false, kind;
      if (eat(_colon)) {
        prop.value = parseExpression(true);
        kind = prop.kind = "init";
      } else if (options.ecmaVersion >= 5 && prop.key.type === "Identifier" &&
                 (prop.key.name === "get" || prop.key.name === "set")) {
        isGetSet = sawGetSet = true;
        kind = prop.kind = prop.key.name;
        prop.key = parsePropertyName();
        if (tokType !== _parenL) unexpected();
        prop.value = parseFunction(startNode(), false);
      } else unexpected();

      // getters and setters are not allowed to clash — either with
      // each other or with an init property — and in strict mode,
      // init properties are also not allowed to be repeated.

      if (prop.key.type === "Identifier" && (strict || sawGetSet)) {
        for (var i = 0; i < node.properties.length; ++i) {
          var other = node.properties[i];
          if (other.key.name === prop.key.name) {
            var conflict = kind == other.kind || isGetSet && other.kind === "init" ||
              kind === "init" && (other.kind === "get" || other.kind === "set");
            if (conflict && !strict && kind === "init" && other.kind === "init") conflict = false;
            if (conflict) raise(prop.key.start, "Redefinition of property");
          }
        }
      }
      node.properties.push(prop);
    }
    return finishNode(node, "ObjectExpression");
  }

  function parsePropertyName() {
    if (tokType === _num || tokType === _string) return parseExprAtom();
    return parseIdent(true);
  }

  // Parse a function declaration or literal (depending on the
  // `isStatement` parameter).

  function parseFunction(node, isStatement) {
    if (tokType === _name) node.id = parseIdent();
    else if (isStatement) unexpected();
    else node.id = null;
    node.params = [];
    var first = true;
    expect(_parenL);
    while (!eat(_parenR)) {
      if (!first) expect(_comma); else first = false;
      node.params.push(parseIdent());
    }

    // Start a new scope with regard to labels and the `inFunction`
    // flag (restore them to their old value afterwards).
    var oldInFunc = inFunction, oldLabels = labels;
    inFunction = true; labels = [];
    node.body = parseBlock(true);
    inFunction = oldInFunc; labels = oldLabels;

    // If this is a strict mode function, verify that argument names
    // are not repeated, and it does not try to bind the words `eval`
    // or `arguments`.
    if (strict || node.body.body.length && isUseStrict(node.body.body[0])) {
      for (var i = node.id ? -1 : 0; i < node.params.length; ++i) {
        var id = i < 0 ? node.id : node.params[i];
        if (isStrictReservedWord(id.name) || isStrictBadIdWord(id.name))
          raise(id.start, "Defining '" + id.name + "' in strict mode");
        if (i >= 0) for (var j = 0; j < i; ++j) if (id.name === node.params[j].name)
          raise(id.start, "Argument name clash in strict mode");
      }
    }

    return finishNode(node, isStatement ? "FunctionDeclaration" : "FunctionExpression");
  }

  // Parses a comma-separated list of expressions, and returns them as
  // an array. `close` is the token type that ends the list, and
  // `allowEmpty` can be turned on to allow subsequent commas with
  // nothing in between them to be parsed as `null` (which is needed
  // for array literals).

  function parseExprList(close, allowTrailingComma, allowEmpty) {
    var elts = [], first = true;
    while (!eat(close)) {
      if (!first) {
        expect(_comma);
        if (allowTrailingComma && options.allowTrailingCommas && eat(close)) break;
      } else first = false;

      if (allowEmpty && tokType === _comma) elts.push(null);
      else elts.push(parseExpression(true));
    }
    return elts;
  }

  // Parse the next token as an identifier. If `liberal` is true (used
  // when parsing properties), it will also convert keywords into
  // identifiers.

  function parseIdent(liberal) {
    var node = startNode();
    node.name = tokType === _name ? tokVal : (liberal && !options.forbidReserved && tokType.keyword) || unexpected();
    tokRegexpAllowed = false;
    next();
    return finishNode(node, "Identifier");
  }

});

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
  '<xml id="javascript_toolbox" style="display: none">' + // COMBINED BLOCKS
    '<category name="Variables">' +
      '<block type="js_variable_declaration_unary">' +
        '<value name="VAR">' +
          '<block type="js_identifier">' +
            '<field name="NAME">i</field>' +
          '</block>' +
        '</value>' +
        '<value name="VALUE">' +
          '<block type="js_literal_number">' +
            '<field name="NUMBER">0</field>' +
          '</block>' +
        '</value>' +
      '</block>' +
      '<block type="js_variable_declaration">' +
        '<value name="DECLARATIONS">' +
          '<block type="js_variable_declarator">' +
            '<value name="VAR">' +
              '<block type="js_identifier">' +
                '<field name="NAME">i</field>' +
              '</block>' +
            '</value>' +
            '<value name="VALUE">' +
              '<block type="js_literal_number">' +
                '<field name="NUMBER">0</field>' +
              '</block>' +
            '</value>' +
          '</block>' +
        '</value>' +
      '</block>' +
    '</category>' +
    '<category name="Expressions">' +
      '<block type="js_assignment_expression">' +
        '<value name="VAR">' +
          '<block type="js_identifier">' +
            '<field name="NAME">i</field>' +
          '</block>' +
        '</value>' +
        '<value name="VALUE">' +
          '<block type="js_literal_number">' +
            '<field name="NUMBER">0</field>' +
          '</block>' +
        '</value>' +
      '</block>' +
    '</category>' +
  	'<sep></sep>' + // PURE JS
    '<category name="Data">' +
      '<block type="js_identifier"></block>' +
      '<block type="js_literal_number"></block>' +
      '<block type="js_literal_string"></block>' +
      '<block type="js_literal_bool"></block>' +
      '<block type="js_null_value"></block>' +
      '<block type="js_json_object"></block>' +
      '<block type="js_json_element"></block>' +
      '<block type="js_computed_member_expression"></block>' +
    '</category>' +
    '<category name="Variables">' +
      '<block type="js_variable_declaration_unary"></block>' +
      '<block type="js_variable_declarator"></block>' +
      '<block type="js_variable_declaration"></block>' +
    '</category>' +
    '<category name="Expressions">' +
      '<block type="js_assignment_expression"></block>' +
      '<block type="js_binary_expression"></block>' +
      '<block type="js_array_expression"></block>' +
      '<block type="js_member_expression"></block>' +
      '<block type="js_update_expression_prefix"></block>' +
      '<block type="js_update_expression_noprefix"></block>' +
    '</category>' +
    '<category name="Statements">' +
      '<block type="js_if_statement"></block>' +
      '<block type="js_for_statement"></block>' +
      '<block type="js_return_statement"></block>' +
    '</category>' +
    '<category name="Functions">' +
      '<block type="js_function_expression"></block>' +
      '<block type="js_anonimous_function_expression"></block>' +
      '<block type="js_call_expression"></block>' +
    '</category>' +
    /*'<category name="Custom">' +
      '<block type="js_blocklify"></block>' +
    '</category>' +*/
  '</xml>';

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
 * @fileoverview Helper functions for parse from Javascript to xml Blockly blocks.
 * @author carloslfu@gmail.com (Carlos Galarza)
 */
'use strict';

// TODOs:
//  - Convert this in an instatiable class, not singleton (Mixin with Blocklify.importer('JavaScript')).
//  - Support for: NewExpression, LogicalExpression, ThrowStatement, UnaryExpression, ForStatement (how is best?).

goog.provide('Blocklify.JavaScript.importer');

/**
 * JavaScript AST to blockls XML parser.
 * @type !Blockly.Generator
 */
Blocklify.JavaScript.importer = new Blocklify.importer('JavaScript');

Blocklify.JavaScript.importer.astParser = Blocklify.JavaScript.astParser;

//none-estetic inline blocks
Blocklify.JavaScript.importer.no_inline_atomic_blocks = ["FunctionExpression", "ObjectExpression"];

Blocklify.JavaScript.importer.convert = function(node, parent, level) {
  switch (level) {
    case 'atomic':
      return Blocklify.JavaScript.importer.convert_atomic(node, parent, {});
    case 'pattern':
      return Blocklify.JavaScript.importer.convert_pattern(node, parent, {patternEnabled: true});
    case 'mixed':
      return Blocklify.JavaScript.importer.convert_pattern(node, parent, {patternEnabled: true, mixedEnabled: true});
  }
};
Blocklify.JavaScript.importer.notImplementedBlock = function(node) {
  var block = goog.dom.createDom('block');
  block.setAttribute('type', 'js_notimplemented');
  Blocklify.JavaScript.importer.appendField(block, 'TYPE', node.type);
  console.log("importer not yet implemented node:");
  console.log(node);
  return block;
};
Blocklify.JavaScript.importer.createBlock = function(type) {
  var block = goog.dom.createDom('block');
  block.setAttribute('type', type);
  return block;
};
Blocklify.JavaScript.importer.appendField = function(block, name, value) {
  var field = goog.dom.createDom('field', null, value);
  field.setAttribute('name', name);
  block.appendChild(field);
};
Blocklify.JavaScript.importer.appendValueInput = function(block, name, blockValue) {
  var field = goog.dom.createDom('value', null, blockValue);
  field.setAttribute('name', name);
  block.appendChild(field);
};
Blocklify.JavaScript.importer.appendStatement = function(block, statements, parent, options) {
  var tempBlock, lastBlock, statementBlock, rootBlock;
  if (statements.length == 0) {
    return; // returns undefined
  }
  rootBlock = Blocklify.JavaScript.importer.convert_atomic(statements[0], parent, options);
  lastBlock = rootBlock;
  for (var i = 1; i < statements.length; i++) {
    tempBlock = goog.dom.createDom('next');
    statementBlock = Blocklify.JavaScript.importer.convert_atomic(statements[i], parent, options);
    if (typeof(statementBlock) == 'object') {
      tempBlock.appendChild(statementBlock);
      lastBlock.appendChild(tempBlock);
      lastBlock = statementBlock;
    }
  };
  if (block == null) {
    return rootBlock;
  } else {
    block.appendChild(rootBlock);
  }
};
Blocklify.JavaScript.importer.setOutput = function(block, bool) {
  var mutation = block.getElementsByTagName('mutation')[0]; // one mutation element per block
  if (mutation == undefined) {
    mutation = goog.dom.createDom('mutation');
    block.appendChild(mutation);
  }
  mutation.setAttribute('output', bool + '');
};
Blocklify.JavaScript.importer.appendCloneMutation = function(block, name, elementName, elements, parent, options) {
  var no_inline_blocks = Blocklify.JavaScript.importer.no_inline_atomic_blocks;
  var mutation = block.getElementsByTagName('mutation')[0]; // one mutation element per block
  if (mutation == undefined) {
    mutation = goog.dom.createDom('mutation');
    block.appendChild(mutation);
  }
  var inlineFlag = false;
  mutation.setAttribute(name, elements.length + '');
  for (var i = 0; i < elements.length; i++) {
    var elementBlock = Blocklify.JavaScript.importer.convert_atomic(elements[i], parent, options);
    Blocklify.JavaScript.importer.setOutput(elementBlock, true);
    Blocklify.JavaScript.importer.appendValueInput(block, elementName + i, elementBlock);
    inlineFlag = inlineFlag || (no_inline_blocks.indexOf(elements[i].type) != -1);
  }
  if (inlineFlag) {
    block.setAttribute('inline', 'false');
  }
};

/**
 * Function to convert the nodes to xml blocks at atomic level.
 */
Blocklify.JavaScript.importer.convert_atomic = function(node, parent, options, patternNotImplemented) {
  //the return block
  var block = {}, field;
  if (!options) {
    options = {};
  }
  if (options.patternEnabled && options.patternEnabled == true
      && (patternNotImplemented == undefined || patternNotImplemented == false)) {
    block = Blocklify.JavaScript.importer.convert_pattern(node, parent, options);
    if (block != null) {
      return block;
    }
  }
  //none-estetic inline blocks
  var no_inline_blocks = Blocklify.JavaScript.importer.no_inline_atomic_blocks;
  if (node == null) {
    block = goog.dom.createDom('block');
    block.setAttribute('type', 'js_null_value');
    return block;
  }
  switch (node.type) {
    case "Program":
      block = goog.dom.createDom('xml');
      Blocklify.JavaScript.importer.appendStatement(block, node.body, node, options);
      break;
    case "BlockStatement":
      block = Blocklify.JavaScript.importer.appendStatement(null, node.body, node, options);
      break;
    case "ExpressionStatement":
      block = Blocklify.JavaScript.importer.convert_atomic(node.expression, node, options);
      break;
    case "Literal":
      block = goog.dom.createDom('block');
      if (node.value == null) {
        block.setAttribute('type' ,"js_null_value");
      } else {
        var nodeType = typeof(node.value);
        if (nodeType == "number") {
          block.setAttribute('type' ,'js_literal_number');
          Blocklify.JavaScript.importer.appendField(block, 'NUMBER', node.value + '');
        } else if(nodeType == "string") {
          block.setAttribute('type' ,'js_literal_string');
          Blocklify.JavaScript.importer.appendField(block, 'STRING', node.value);
        } else if(nodeType == "boolean") {
          block.setAttribute('type' ,'js_literal_bool');
          Blocklify.JavaScript.importer.appendField(block, 'BOOL', node.raw);
        }
      }
      break;
    case "AssignmentExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_assignment_expression');
      var leftBlock = Blocklify.JavaScript.importer.convert_atomic(node.left, node, options);
      var rightBlock = Blocklify.JavaScript.importer.convert_atomic(node.right, node, options);
      //fix estetic, only literal has inline
      if (no_inline_blocks.indexOf(node.right.type) != -1) {
        block.setAttribute('inline', 'false');
      }
      //force output
      Blocklify.JavaScript.importer.setOutput(rightBlock, true);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VAR', leftBlock);
      Blocklify.JavaScript.importer.appendField(block, 'OPERATOR', node.operator);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', rightBlock);
      break;
    case "VariableDeclarator":
      block = Blocklify.JavaScript.importer.createBlock('js_variable_declarator');
      var varBlock = Blocklify.JavaScript.importer.convert_atomic(node.id, node, options);
      if (node.init == null) {
        node.init = {type:'Identifier', name: 'undefined'};
      }
      var initBlock = Blocklify.JavaScript.importer.convert_atomic(node.init, node, options);
      //fix estetic, only literal has inline
      if (node.init) {
        if (no_inline_blocks.indexOf(node.init.type) != -1) {
          block.setAttribute('inline', 'false');
        }
      }
      Blocklify.JavaScript.importer.setOutput(initBlock, true);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VAR', varBlock);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', initBlock);
      break;
    case "VariableDeclaration":
      if (node.declarations.length == 1) {
        block = Blocklify.JavaScript.importer.createBlock('js_variable_declaration_unary');
        if (node.declarations[0].init == null) {
          node.declarations[0].init = {type:'Identifier', name: 'undefined'};
        }
        var initBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[0].init, node.declarations[0], options);
        var varBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[0].id, node.declarations[0], options);
        //fix estetic, only literal has inline
        if (node.declarations[0].init) { //TODO: make global variable for none-estetic inline blocks
          if (no_inline_blocks.indexOf(node.declarations[0].init.type) != -1) {
            block.setAttribute('inline', 'false');
          }
        }
        Blocklify.JavaScript.importer.setOutput(initBlock, true);
        Blocklify.JavaScript.importer.appendValueInput(block, 'VAR', varBlock);
        Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', initBlock);
      } else {
        var tempBlock, lastBlock, statementBlock, rootBlock;
        rootBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[0], options);
        lastBlock = rootBlock;
        for (var i = 1; i < node.declarations.length; i++) {
          tempBlock = goog.dom.createDom('next');
          statementBlock = Blocklify.JavaScript.importer.convert_atomic(node.declarations[i], options);
          tempBlock.appendChild(statementBlock);
          lastBlock.appendChild(tempBlock);
          lastBlock = statementBlock;
        };
        block = Blocklify.JavaScript.importer.createBlock('js_variable_declaration');
        Blocklify.JavaScript.importer.appendValueInput(block, 'DECLARATIONS', rootBlock);
      }
      break;
    case "CallExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_call_expression');
      var nameBlock = Blocklify.JavaScript.importer.convert_atomic(node.callee, node);
      Blocklify.JavaScript.importer.appendCloneMutation(block, 'arguments', 'ARGUMENT', node.arguments, node, options);
      Blocklify.JavaScript.importer.appendValueInput(block, 'NAME', nameBlock);
      break;
    case "FunctionExpression":
      if (node.id != null) {
        block = Blocklify.JavaScript.importer.createBlock('js_function_expression');
        var nameBlock = Blocklify.JavaScript.importer.convert_atomic(node.id, node, options);
      } else {
        block = Blocklify.JavaScript.importer.createBlock('js_anonimous_function_expression');
      }
      var stackBlock = Blocklify.JavaScript.importer.convert_atomic(node.body, node, options);
      Blocklify.JavaScript.importer.appendCloneMutation(block, 'params', 'PARAM', node.params, node, options);
      if (node.id != null) {
        Blocklify.JavaScript.importer.appendValueInput(block, 'NAME', nameBlock);
      }
      Blocklify.JavaScript.importer.appendValueInput(block, 'STACK', stackBlock);
      break;
    case "FunctionDeclaration":
      block = Blocklify.JavaScript.importer.createBlock('js_function_expression');
      var nameBlock = Blocklify.JavaScript.importer.convert_atomic(node.id, node, options);
      var stackBlock = Blocklify.JavaScript.importer.convert_atomic(node.body, node, options);
      Blocklify.JavaScript.importer.setOutput(block, false);
      Blocklify.JavaScript.importer.appendCloneMutation(block, 'params', 'PARAM', node.params, node, options);
      Blocklify.JavaScript.importer.appendValueInput(block, 'NAME', nameBlock);
      Blocklify.JavaScript.importer.appendValueInput(block, 'STACK', stackBlock);
      break;
    case 'EmptyStatement':
      block = 'Ignore'; // Ignore EmptyStatement
      break;
    case 'Identifier':
      if(parent.type == 'MemberExpression' && parent.computed) {
        block = Blocklify.JavaScript.importer.createBlock('js_computed_member_expression');
        var memberBlock = Blocklify.JavaScript.importer.convert_atomic(node, node);
        Blocklify.JavaScript.importer.appendValueInput(block, 'MEMBER', memberBlock);
      } else if (node.name == 'undefined') {
        block = Blocklify.JavaScript.importer.createBlock('js_undefined_value');
      } else {
        block = Blocklify.JavaScript.importer.createBlock('js_identifier');
        Blocklify.JavaScript.importer.appendField(block, 'NAME', node.name);
      }
      break;
    case "MemberExpression":
      var current_node = node, count = 2, memberBlock, member, parentM = node;
      while (current_node.object.type == "MemberExpression") {
        count++;
        current_node = current_node.object;
      }
      block = Blocklify.JavaScript.importer.createBlock('js_member_expression');
      var mutation = goog.dom.createDom('mutation');
      block.appendChild(mutation);
      mutation.setAttribute('members', count + '');
      for (var i = count-1, current_node = node; i >= 0; i--) {
        //condition for final node
        member = (i == 0)?current_node:current_node.property;
        memberBlock = Blocklify.JavaScript.importer.convert_atomic(member, parentM);
        Blocklify.JavaScript.importer.setOutput(memberBlock, true);
        Blocklify.JavaScript.importer.appendValueInput(block, 'MEMBER' + i, memberBlock);
        current_node = current_node.object;
        parentM = current_node;
      };
      break;
    case "ReturnStatement":
      block = Blocklify.JavaScript.importer.createBlock('js_return_statement');
      var argBlock = Blocklify.JavaScript.importer.convert_atomic(node.argument, node);
      Blocklify.JavaScript.importer.setOutput(argBlock, true);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', argBlock);
      break;
    case "UpdateExpression":
      if (node.prefix == true) {
        block = Blocklify.JavaScript.importer.createBlock('js_update_expression_prefix');
      } else {
        block = Blocklify.JavaScript.importer.createBlock('js_update_expression_noprefix');
      }
      var argBlock = Blocklify.JavaScript.importer.convert_atomic(node.argument, node);
      Blocklify.JavaScript.importer.appendField(block, 'OPERATOR', node.operator);
      Blocklify.JavaScript.importer.appendValueInput(block, 'ARGUMENT', argBlock);
      break;
    case "BinaryExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_binary_expression');
      var leftBlock = Blocklify.JavaScript.importer.convert_atomic(node.left, node);
      var rightBlock = Blocklify.JavaScript.importer.convert_atomic(node.right, node);
      Blocklify.JavaScript.importer.setOutput(rightBlock, true);
      Blocklify.JavaScript.importer.setOutput(leftBlock, true);
      Blocklify.JavaScript.importer.appendValueInput(block, 'LEFT', leftBlock);
      Blocklify.JavaScript.importer.appendField(block, 'OPERATOR', node.operator);
      Blocklify.JavaScript.importer.appendValueInput(block, 'RIGHT', rightBlock);
      break;
    case "ObjectExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_json_object');
      if (node.properties.length == 0) {
        return;
      }
      for (var i = 0; i < node.properties.length; i++) {
        node.properties[i].type = 'ObjectElement';
      };
      var stackBlock = Blocklify.JavaScript.importer.appendStatement(null, node.properties, node, options);
      Blocklify.JavaScript.importer.appendValueInput(block, 'ELEMENTS', stackBlock);
      break;
    case 'ObjectElement':
      block = Blocklify.JavaScript.importer.createBlock('js_json_element');
      var key = Blocklify.JavaScript.importer.convert_atomic(node.key, node, options);
      var value = Blocklify.JavaScript.importer.convert_atomic(node.value, node, options);
      if (no_inline_blocks.indexOf(node.value.type) != -1) {
        block.setAttribute('inline', 'false');
      }
      Blocklify.JavaScript.importer.setOutput(value, true);
      Blocklify.JavaScript.importer.appendValueInput(block, 'KEY', key);
      Blocklify.JavaScript.importer.appendValueInput(block, 'VALUE', value);
      break;
    case "IfStatement":
      block = Blocklify.JavaScript.importer.createBlock('js_if_statement');
      var tests = [], consequents = [], current_node = node.alternate, countElseIf = 0, countElse = 0;
      tests.push(Blocklify.JavaScript.importer.convert_atomic(node.test, node, options));
      consequents.push(Blocklify.JavaScript.importer.convert_atomic(node.consequent, node, options));
      Blocklify.JavaScript.importer.setOutput(tests[0], true);
      while (current_node) {
        if (current_node.type == 'IfStatement') {
          countElseIf++;
          tests.push(Blocklify.JavaScript.importer.convert_atomic(current_node.test, current_node, options));
          Blocklify.JavaScript.importer.setOutput(tests[tests.length-1], true);
          consequents.push(Blocklify.JavaScript.importer.convert_atomic(current_node.consequent, current_node, options));
          current_node = current_node.alternate;
        } else {
          countElse = 1;
          var alternate = Blocklify.JavaScript.importer.convert_atomic(current_node.alternate || current_node, node, options);
          current_node = null;
        }
      };
      var mutation = goog.dom.createDom('mutation');
      block.appendChild(mutation);
      mutation.setAttribute('elseif', countElseIf + '');
      mutation.setAttribute('else', countElse + '');
      Blocklify.JavaScript.importer.appendValueInput(block, 'IF0', tests[0]);
      Blocklify.JavaScript.importer.appendValueInput(block, 'DO0', consequents[0]);
      for (var i = 1; i <= countElseIf; i++) {
        Blocklify.JavaScript.importer.appendValueInput(block, 'IF' + i, tests[i]);
        Blocklify.JavaScript.importer.appendValueInput(block, 'DO' + i, consequents[i]);
      }
      if (countElse == 1) {
        Blocklify.JavaScript.importer.appendValueInput(block, 'ELSE', alternate);
      }
      break;
    case "ThisExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_this_expression');
      break;
    case "ArrayExpression":
      block = Blocklify.JavaScript.importer.createBlock('js_array_expression');
      Blocklify.JavaScript.importer.appendCloneMutation(block, 'elements', 'ELEMENT', node.elements, node, options);
      break;
    
    default:  // if not implemented block
      block = Blocklify.JavaScript.importer.notImplementedBlock(node);
  }
  return block;
};

// Importers
Blocklify.JavaScript.importer.importers = [];

/**
 * Function to convert the nodes to xml blocks at high level (code patterns matching)
 * // TODO: covert this in a importer dispatcher, like Blocklify.JavaScript.Generator.extrernalSources.
 */
Blocklify.JavaScript.importer.convert_pattern = function(node, parent, options) {
  var len = Blocklify.JavaScript.importer.importers.length, block = null;
  // search the pattern in importers
  for (var i = 0; i < len; i++) {
    block = Blocklify.JavaScript.importer.importers[i](node, parent, options);
    if (block !== null) {
      break;
    }
  }
  if (block === null) { // undefined == null is true, but undefined means that it is a pass node (ignore this node)
    if (options.mixedEnabled != undefined && options.mixedEnabled == true) {
      // Last argument avoids infinite recursion in patternNotImplemented
      block = Blocklify.JavaScript.importer.convert_atomic(node, parent, options, true);
    } else {
      block = Blocklify.JavaScript.importer.notImplementedBlock(node);
    }
  }
  return block;
};
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
goog.provide('Blocklify.JavaScript.Blocks');


Blocklify.JavaScript.Blocks.setMutators = function(block, mutatorsList) {
  for (var i = 0; i < mutatorsList.length; i++) {
    Blocklify.JavaScript.Blocks.mutators[mutatorsList[i].name](block, mutatorsList[i]);
  }
};
//TODO: mapper for javascript, when parse code or blocks map lines to more flexible manipulation(can use the data field in xml - added in new version of blockly)
//custom blocks - not yet implemented. experimenting with this, but this requires Blockly.FieldTextArea element (not available in blockly core).

'use strict'

Blockly.Blocks['js_blocklify'] = {
   /**
   * Block for adding in comments.
   * @this Blockly.Block
   */
  init: function() {
  
    this.setColour(10);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextArea(''), 'CODE')
        ;
	  this.setPreviousStatement(true);
    this.setNextStatement(true);
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
    this.setTooltip("Blocklify.");
  }
};
//data objects

'use strict'

Blockly.Blocks['js_literal_number'] = {
  init: function() {
    this.setColour(230);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput('0',
        Blockly.FieldTextInput.numberValidator), 'NUMBER');
    this.setOutput(true, 'Number');
    this.setTooltip("Number.");
  }
};
Blockly.Blocks['js_null_value'] = {
  init: function() {
    this.setColour(230);
    this.appendDummyInput()
        .appendField('null');
    this.setOutput(true);
    this.setTooltip("Null value.");
  }
};
Blockly.Blocks['js_undefined_value'] = {
  init: function() {
    this.setColour(230);
    this.appendDummyInput()
        .appendField('undefined');
    this.setOutput(true);
    this.setTooltip("Undefined value.");
  }
};
Blockly.Blocks['js_literal_string'] = {
  init: function() {
    this.setColour(160);
    this.appendDummyInput()
        .appendField(this.newQuote_(true))
        .appendField(new Blockly.FieldTextInput(''), 'STRING')
        .appendField(this.newQuote_(false));
    this.setOutput(true, 'String');
    this.setTooltip("String.");
  },
  newQuote_: function(open) {
    if (open == this.RTL) {
      var file = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAKCAYAAACALL/6AAAA0UlEQVQY023QP0oDURSF8e8MImhlUIiCjWKhrUUK3YCIVkq6bMAF2LkCa8ENWLoNS1sLEQKprMQ/GBDks3kDM+Oc8nfPfTxuANQTYBeYAvdJLL4FnAFfwF2ST9Rz27kp5YH/kwrYp50LdaXHAU4rYNYzWAdeenx7AbgF5sAhcARsAkkyVQ+ACbAKjIGqta4+l78udXxc/LiJG+qvet0pV+q7+tHE+iJzdbGz8FhmOzVcqj/qq7rcKI7Ut1Leq70C1oCrJMMk343HB8ADMEzyVOMff72l48gwfqkAAAAASUVORK5CYII=';
    } else {
      var file = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAKCAYAAACALL/6AAAAvklEQVQY022PoapCQRRF97lBVDRYhBcEQcP1BwS/QLAqr7xitZn0HzRr8Rts+htmQdCqSbQIwmMZPMIw3lVmZu0zG44UAFSBLdBVBDAFZqFo8eYKtANfBC7AE5h8ZNOHd1FrDnh4VgmDO3ADkujDHPgHfkLZ84bfaLjg/hD6RFLq9z6wBDr+rvuZB1bAEDABY76pA2mGHyWSjvqmIemc4WsCLKOp4nssIj8wD8qS/iSVJK3N7OTeJPV9n72ZbV7iDuSc2BaQBQAAAABJRU5ErkJggg==';
    }
    return new Blockly.FieldImage(file, 12, 12, '"');
  }
};
Blockly.Blocks['js_literal_bool'] = {
  /**
   * Block for boolean data type: true and false.
   * @this Blockly.Block
   */
  init: function() {
    var BOOLEANS =
        [['true', 'true'],
         ['false', 'false']];
    this.setColour(220);
    this.setOutput(true, 'Boolean');
    this.appendDummyInput()
        .appendField(new Blockly.FieldDropdown(BOOLEANS), 'BOOL');
    this.setTooltip(Blockly.Msg.LOGIC_BOOLEAN_TOOLTIP);
  }
};
Blockly.Blocks['js_this_expression'] = {
  init: function() {
    this.setColour(120);
    this.appendDummyInput()
        .appendField('this');
    this.setOutput(true);
    this.setTooltip("This expression.");
  }
};
//object in JSON format
Blockly.Blocks['js_json_object'] = {
  init: function() {
    this.setColour(260);
    this.setOutput(true);
    this.appendDummyInput()
          .appendField('object');
    this.appendStatementInput('ELEMENTS')
          .setCheck('js_json_element');
    this.setTooltip('Object in JSON format.');
  }
};
Blockly.Blocks['js_json_element'] = {
  init: function() {
    this.setColour(260);
    this.setPreviousStatement(true, 'js_json_element');
    this.setNextStatement(true, 'js_json_element');
    this.interpolateMsg(
        ' %1 : %2',
        ['KEY', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setInputsInline(true);
    this.setTooltip('Element of a object in JSON format.');
  }
};
Blockly.Blocks['js_identifier'] = {
  init: function() {
    this.setColour(120);
    this.setOutput(true);
    this.appendDummyInput()
        .appendField(new Blockly.FieldTextInput(''), 'NAME');
    this.setTooltip('Identifier.');
  }
};
Blockly.Blocks['js_computed_member_expression'] = {
  init: function() {
    this.setColour(160);
    this.interpolateMsg(
        '[%1]',
        ['MEMBER', null],
        Blockly.ALIGN_RIGHT);
    this.setOutput(true);
    this.setInputsInline(true);
    this.setTooltip("Computed member of member expression.");
  }
};
Blockly.Blocks['js_variable_declarator'] = {
  /**
   * Block for redering a variable declarator.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true, 'Declarator');
    this.setNextStatement(true, 'Declarator');
    this.interpolateMsg(
        '%1 = %2',
        ['VAR', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Variable declarator.');
  }
};
Blockly.Blocks['js_variable_declaration_unary'] = {
  /**
   * Block for redering a variable declarator.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.interpolateMsg(
        'var %1 = %2',
        ['VAR', null],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Variable declarator unary.');
  }
};
Blockly.Blocks['js_variable_declaration'] = {
  /**
   * Block for redering a variable declaration.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(330);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.appendDummyInput()
            .appendField('variable declaration');
    this.appendStatementInput('DECLARATIONS')
            .setCheck('Declarator');
    this.setTooltip('Variable declaration.');
  }
};
//expressions

'use strict'

Blockly.Blocks['js_if_if_statement'] = {
  /**
   * Mutator block for if container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(220);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_IF_TITLE_IF);
    this.appendStatementInput('STACK');
    this.setTooltip(Blockly.Msg.CONTROLS_IF_IF_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_elseif_statement'] = {
  /**
   * Mutator bolck for else-if condition.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(220);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_ELSEIF_TITLE_ELSEIF);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.CONTROLS_IF_ELSEIF_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_else_statement'] = {
  /**
   * Mutator block for else condition.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(220);
    this.appendDummyInput()
        .appendField(Blockly.Msg.CONTROLS_IF_ELSE_TITLE_ELSE);
    this.setPreviousStatement(true);
    this.setTooltip(Blockly.Msg.CONTROLS_IF_ELSE_TOOLTIP);
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_assignment_expression'] = {
  /**
   * Block for redering a assignment expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['=', '='],
      ['+=', '+='],
      ['-=', '-='],
      ['*=', '*='],
      ['/=', '/='],
      ['%=', '%='],
      ['&=', '&='],
      ['^=', '^='],
      ['|=', '|='],
      ['>>=', '>>='],
      ['<<=', '<<='],
      ['>>>=', '>>>=']
    ];
    this.setColour(330);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.interpolateMsg(
        'set %1 %2 %3',
        ['VAR', null],
        ['OPERATOR', new Blockly.FieldDropdown(OPERATORS)],
        ['VALUE', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Assignment expression.');
  }
};
Blockly.Blocks['js_update_expression_prefix'] = {
  /**
   * Block for redering a prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['++', '++'],
      ['--', '--']
    ];
    this.setColour(230);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.interpolateMsg(
        '%1 %2',
        ['OPERATOR', new Blockly.FieldDropdown(OPERATORS)],
        ['ARGUMENT', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Update expression with prefix.');
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
  }
};
Blockly.Blocks['js_update_expression_noprefix'] = {
  /**
   * Block for redering a no prefix update expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['++', '++'],
      ['--', '--']
    ];
    this.setColour(230);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.interpolateMsg(
        '%1 %2',
        ['ARGUMENT', null],
        ['OPERATOR', new Blockly.FieldDropdown(OPERATORS)],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Update expression without prefix.');
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
  }
};

// TODO: sepearate this block in tree blocks: js_binary_expression_logical, js_binary_expression_aritmetic and
//       js_binary_expression_bitwise beacause the dropdown is so large
Blockly.Blocks['js_binary_expression'] = {
  /**
   * Block for redering a binary expression.
   * @this Blockly.Block
   */
  init: function() {
    var OPERATORS = [
      ['+', '+'],
      ['-', '-'],
      ['*', '*'],
      ['/', '/'],
      ['%', '%'],
      ['==', '=='],
      ['!=', '!='],
      ['>', '>'],
      ['<', '<'],
      ['>=', '>='],
      ['<=', '<='],
      ['===', '==='],
      ['!==', '!=='],
      ['&', '&'],
      ['^', '^'],
      ['|', '|'],
      ['>>', '>>'],
      ['<<', '<<'],
      ['>>>', '>>>']
    ];
    this.setColour(230);
    this.setOutput(true);
    this.interpolateMsg(
        '%1 %2 %3',
        ['LEFT', null],
        ['OPERATOR', new Blockly.FieldDropdown(OPERATORS)],
        ['RIGHT', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setTooltip('Binary expression.');
  }
};

//Member expressions
Blockly.Blocks['js_member_expression'] = {
  /**
   * Block for redering a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.setOutput(true);
    this.appendValueInput('MEMBER0');
    this.appendDummyInput('END'); //TODO: fix mutator for omiting it
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_member_expression_member']));
    this.memberCount = 1;
    this.setTooltip('Member expression.');
    var argMutator = {
      name: 'clone',
      target: 'MEMBER',
      mutatorContainer: 'js_member_expression_container',
      mutatorArgument: 'js_member_expression_member',
      elementCount: 'memberCount'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator]);
    this.setMembers = this.setElements;
  }
};

Blockly.Blocks['js_member_expression_container'] = {
  /**
   * Mutator block for function container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("member expression");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder members of the memeber expression.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_member_expression_member'] = {
  /**
   * Mutator block for adding members to a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("member");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add a member to a member expression.");
    this.contextMenu = false;
  }
};

//Arrays
Blockly.Blocks['js_array_expression'] = {
  /**
   * Block for redering a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(120);
    this.setOutput(true);
    this.appendValueInput('ELEMENT0')
        .appendField('[');
    this.appendDummyInput('END')
        .appendField(']');
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_array_expression_element']));
    this.elementCount = 1;
    this.setTooltip('Array expression.');
    var argMutator = {
      name: 'clone',
      target: 'ELEMENT',
      mutatorContainer: 'js_array_expression_container',
      mutatorArgument: 'js_array_expression_element',
      elementCount: 'elementCount',
      startText: '[',
      endText: ']'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator]);
  }
};

Blockly.Blocks['js_array_expression_container'] = {
  /**
   * Mutator block for function container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("array");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder elements of the array.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_array_expression_element'] = {
  /**
   * Mutator block for adding members to a member expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(240);
    this.appendDummyInput()
        .appendField("element");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add a element to an array expression.");
    this.contextMenu = false;
  }
};

//function blocks
//TODO: implement mutators for usability

'use strict'

goog.provide('Blocklify.JavaScript.Blocks.functions');

goog.require('Blocklify.JavaScript.Blocks.mutators');


Blockly.Blocks['js_function_expression'] = {
  /**
   * Block for redering a function expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
          .appendField("function");
    this.appendValueInput('NAME');
    this.appendValueInput('PARAM0')
          .appendField("(");
    this.appendDummyInput('END')
          .appendField(")");
    this.appendStatementInput('STACK');
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_function_expression_param']));
    this.paramCount = 1;
    this.setTooltip('Function expression.');
    var argMutator = {
      name: 'clone',
      target: 'PARAM',
      mutatorContainer: 'js_function_expression_container',
      mutatorArgument: 'js_function_expression_param',
      elementCount: 'paramCount',
      startText: '(',
      middleText: ',',
      endText: ')'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator, {name: 'switch'}]);
    this.setParams = this.setElements;
    this.setOutput_(true);
    var removeStack = function(block) {
      var stackBlock = this.getInputTargetBlock('STACK');
      var connection = null;
      if (stackBlock) {
        connection = this.getInputTargetBlock('STACK').previousConnection;
      }
      this.removeInput('STACK');
      return connection;
    }
    var addStack = function(connection) {
      var input = this.appendStatementInput('STACK');
      if (connection) {
        connection.connect(input.connection);
      }
    }
    var blockDomToMutation = this.domToMutation;
    this.domToMutation = function(xmlElement) {
      var connection = removeStack.call(this);
      blockDomToMutation.call(this, xmlElement);
      addStack.call(this,connection);
    };
    var blockSetParams = this.setParams;
    this.setParams = function(numparams) {
      var connection = removeStack.call(this);
      blockSetParams.call(this, numparams);
      addStack.call(this,connection);
    };
    var blockCompose = this.compose;
    this.compose = function(containerBlock) {
      var connection = removeStack.call(this);
      blockCompose.call(this, containerBlock);
      addStack.call(this,connection);
    };
  }
};

Blockly.Blocks['js_anonimous_function_expression'] = {
  /**
   * Block for redering a function expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
          .appendField("function");
    this.appendValueInput('PARAM0')
          .appendField("(");
    this.appendDummyInput('END')
          .appendField(")");
    this.appendStatementInput('STACK');
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_function_expression_param']));
    this.paramCount = 1;
    this.setTooltip('Function expression.');
    var argMutator = {
      name: 'clone',
      target: 'PARAM',
      mutatorContainer: 'js_function_expression_container',
      mutatorArgument: 'js_function_expression_param',
      elementCount: 'paramCount',
      startText: '(',
      middleText: ',',
      endText: ')'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator, {name: 'switch'}]);
    this.setParams = this.setElements;
    this.setOutput_(true);
    var removeStack = function(block) {
      var stackBlock = this.getInputTargetBlock('STACK');
      var connection = null;
      if (stackBlock) {
        connection = this.getInputTargetBlock('STACK').previousConnection;
      }
      this.removeInput('STACK');
      return connection;
    }
    var addStack = function(connection) {
      var input = this.appendStatementInput('STACK');
      if (connection) {
        connection.connect(input.connection);
      }
    }
    var blockDomToMutation = this.domToMutation;
    this.domToMutation = function(xmlElement) {
      var connection = removeStack.call(this);
      blockDomToMutation.call(this, xmlElement);
      addStack.call(this,connection);
    };
    var blockSetParams = this.setParams;
    this.setParams = function(numparams) {
      var connection = removeStack.call(this);
      blockSetParams.call(this, numparams);
      addStack.call(this,connection);
    };
    var blockCompose = this.compose;
    this.compose = function(containerBlock) {
      var connection = removeStack.call(this);
      blockCompose.call(this, containerBlock);
      addStack.call(this,connection);
    };
  }
};

Blockly.Blocks['js_function_expression_container'] = {
  /**
   * Mutator block for list container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
        .appendField("function");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder arguments of the function.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_function_expression_param'] = {
  /**
   * Mutator block for adding arguments to a function.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(290);
    this.appendDummyInput()
        .appendField("pameter");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add an parameter to a function declaration.");
    this.contextMenu = false;
  }
};


Blockly.Blocks['js_call_expression'] = {
  /**
   * Block for redering a call expression.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.appendValueInput('NAME');
    this.appendValueInput('ARGUMENT0')
          .appendField("(");
    this.appendDummyInput('END')
          .appendField(")");
    this.setInputsInline(true);
    this.setMutator(new Blockly.Mutator(['js_call_expression_argument']));
    this.argCount = 1;
    this.setTooltip('Call expression.');
    var argMutator = {
      name: 'clone',
      target: 'ARGUMENT',
      mutatorContainer: 'js_call_expression_container',
      mutatorArgument: 'js_call_expression_argument',
      elementCount: 'argCount',
      startText: '(',
      middleText: ',',
      endText: ')'
    };
    Blocklify.JavaScript.Blocks.setMutators(this,[argMutator, {name: 'switch'}]);
    this.setArguments = this.setElements;
    this.setOutput_(false);
  }
};

Blockly.Blocks['js_call_expression_container'] = {
  /**
   * Mutator block for function container.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("function");
    this.appendStatementInput('STACK');
    this.setTooltip("Add, remove or reorder arguments of the function.");
    this.contextMenu = false;
  }
};

Blockly.Blocks['js_call_expression_argument'] = {
  /**
   * Mutator block for adding arguments to a function.
   * @this Blockly.Block
   */
  init: function() {
    this.setColour(260);
    this.appendDummyInput()
        .appendField("argument");
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip("Add an argument to a function call.");
    this.contextMenu = false;
  }
};
//mutator templates for blocks

'use strict'

goog.provide('Blocklify.JavaScript.Blocks.mutators');

// Clone mutator
Blocklify.JavaScript.Blocks.mutators['clone'] = function (block, options){
  var xmlAttrName = options.target.toLowerCase() + 's';
  var elementCount = options.elementCount;
  if (!options.startText) {
    options.startText = '';
  }
  if (!options.middleText) {
    options.middleText = '';
  }
  if (!options.endText) {
    options.endText = '';
  }
  var blockMutationToDom = block.mutationToDom;
  block.mutationToDom = function() {
    if (blockMutationToDom) {
      var container = blockMutationToDom.call(this);
    } else {
      var container = document.createElement('mutation');
    }
    container.setAttribute(xmlAttrName, this[elementCount]);
    return container;
  };
  var blockDomToMutation = block.domToMutation;
  block.domToMutation = function(xmlElement) {
    if (blockDomToMutation) {
      blockDomToMutation.call(this, xmlElement);
    }
    if (this[elementCount] == 0) {
      this.removeInput('START');
    }
    for (var x = 0; x < this[elementCount]; x++) {
      this.removeInput(options.target + x);
    }
    this.removeInput('END');
    this[elementCount] = parseInt(xmlElement.getAttribute(xmlAttrName), 10);
    if (this[elementCount] == 0) {
      this.appendDummyInput('START').appendField(options.startText);
    } else {
      for (var x = 0; x < this[elementCount]; x++) {
        var input = this.appendValueInput(options.target + x);
        if (x == 0) {
          input.appendField(options.startText);
        } else {
          input.appendField(options.middleText);
        }
      }
    }
    this.appendDummyInput('END')
          .appendField(options.endText);
  };
  var blockDecompose = block.decompose;
  block.decompose = function(workspace) {
    if (blockDecompose) {
      blockDecompose.call(this, workspace);
    }
    var containerBlock =
        Blockly.Block.obtain(workspace, options.mutatorContainer);
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var x = 0; x < this[elementCount]; x++) {
      var argBlock = Blockly.Block.obtain(workspace, options.mutatorArgument);
      argBlock.initSvg();
      connection.connect(argBlock.previousConnection);
      connection = argBlock.nextConnection;
    }
    return containerBlock;
  };
  var blockCompose = block.compose;
  block.compose = function(containerBlock) {
    if (blockCompose) {
      blockCompose.call(this, containerBlock);
    }
    // Disconnect all input blocks and remove all inputs.
    if (this[elementCount] == 0) {
      this.removeInput('START');
    }
    for (var x = this[elementCount] - 1; x >= 0; x--) {
      this.removeInput(options.target + x);
    }
    this.removeInput('END');
    this[elementCount] = 0;
    // Rebuild the block's inputs.
    var argBlock = containerBlock.getInputTargetBlock('STACK');
    while (argBlock) {
      var input = this.appendValueInput(options.target + this[elementCount]);
      if (this[elementCount] == 0) {
        input.appendField(options.startText);
      } else {
        input.appendField(options.middleText);
      }
      // Reconnect any child blocks.
      if (argBlock.valueConnection_) {
        input.connection.connect(argBlock.valueConnection_);
      }
      this[elementCount]++;
      argBlock = argBlock.nextConnection &&
          argBlock.nextConnection.targetBlock();
    }
    if (this[elementCount] == 0) {
      this.appendDummyInput('START').appendField(options.startText);
    }
    this.appendDummyInput('END')
          .appendField(options.endText);
  };
  block.saveConnections = function(containerBlock) {
    var argBlock = containerBlock.getInputTargetBlock('STACK');
    var x = 0;
    while (argBlock) {
      var input = this.getInput(options.target + x);
      argBlock.valueConnection_ = input && input.connection.targetConnection;
      x++;
      argBlock = argBlock.nextConnection &&
          argBlock.nextConnection.targetBlock();
    }
  };
  //compose the block with a options ( ability to do mutations from code).
  block.setElements = function(numels) {
    // Disconnect all input blocks and remove all inputs.
    if (this[elementCount] == 0) {
      this.removeInput('START');
    }
    for (var x = this[elementCount] - 1; x >= 0; x--) {
      this.removeInput(options.target + x);
    }
    this.removeInput('END');
    this[elementCount] = numels;
    if (numels == 0) {
      this.appendDummyInput('START').appendField(options.startText);
    } else {
      // Rebuild the block's inputs.
      for (var i = 0 ; i < numels ; i++) {
        var input = this.appendValueInput(options.target + i);
        if (i == 0) {
          input.appendField(options.startText);
        } else {
          input.appendField(options.middleText);
        }
      }
    }
    this.appendDummyInput('END')
          .appendField(options.endText);
  };
};


// Switch mutator adds 'Add Output' and 'Remove Output' options in contextmenu
Blocklify.JavaScript.Blocks.mutators['switch'] = function (block, options){
  var elementCount = options.elementCount;

  var blockMutationToDom = block.mutationToDom;
  block.mutationToDom = function() {
    if (blockMutationToDom) {
      var container = blockMutationToDom.call(this);
    } else {
      var container = document.createElement('mutation');
    }
    if (this.hasOutput_) {
      container.setAttribute('output', 'true');
    } else {
      container.setAttribute('output', 'false');
    }
    return container;
  };
  var blockDomToMutation = block.domToMutation;
  block.domToMutation = function(xmlElement) {
    if (blockDomToMutation) {
      blockDomToMutation.call(this, xmlElement);
    }
    this.setOutput_(xmlElement.getAttribute('output') == 'true');
  };

  block.setOutput_ = function(hasOutput) {
    if (this.hasOutput_ == hasOutput) {
      return;
    }
    this.unplug(true, false);
    if (hasOutput) {
      this.setPreviousStatement(false);
      this.setNextStatement(false);
      this.setOutput(true);
    } else {
      this.setOutput(false);
      this.setPreviousStatement(true, 'Statement');
      this.setNextStatement(true, 'Statement');
    }
    this.hasOutput_ = hasOutput;
  };
  var blockCustomContextMenu = block.customContextMenu;
  block.customContextMenu = function(options) {
    if (blockCustomContextMenu) {
      blockCustomContextMenu.call(this, options);
    }
    var option = {enabled: true};
    if (this.hasOutput_) {
      option.text = 'Remove Output';
    } else {
      option.text = 'Add Output';
    }
    var callbackFactory = function(block){
      return function() {
        block.setOutput_(!block.hasOutput_);
      };
    }
    option.callback = callbackFactory(this);
    options.push(option);
  };
};
//statement blocks

'use strict';

Blockly.Blocks['js_for_statement'] = {
  init: function() {
    this.setColour(220);
    this.appendValueInput("CONDITION")
        .setCheck("")
        .appendField("for");
    this.appendStatementInput("FIRST")
        .setCheck("")
        .appendField("first");
    this.appendStatementInput("DO")
        .setCheck("")
        .appendField("do");
    this.appendStatementInput("STEP")
        .setCheck("")
        .appendField("step");
    this.setTooltip('');
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
  }
};
Blockly.Blocks['js_return_statement'] = {
  init: function() {
    this.setColour(220);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendValueInput('VALUE')
      .appendField('return');
    this.setTooltip('Function returns the value of input.');
  }
};
Blockly.Blocks['js_notimplemented'] = {
  init: function() {
    this.setColour(0);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.appendDummyInput()
      .appendField('Importer for')
      .appendField(new Blockly.FieldTextInput(''), 'TYPE')
      .appendField('not yet implemented :(');
    this.setTooltip('Function returns the value of input.');
    Blocklify.JavaScript.Blocks.setMutators(this,[{name: 'switch'}]);
  }
};

Blockly.Blocks['js_if_statement'] = {
  /**
   * Block for if/elseif/else condition.
   * @this Blockly.Block
   */
  init: function() {
    this.setHelpUrl(Blockly.Msg.CONTROLS_IF_HELPURL);
    this.setColour(220);
    this.appendValueInput('IF0')
        .setCheck('Boolean')
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_IF);
    this.appendStatementInput('DO0')
        .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    this.setPreviousStatement(true, 'Statement');
    this.setNextStatement(true, 'Statement');
    this.setMutator(new Blockly.Mutator(['js_elseif_statement',
                                         'js_else_statement']));
    // Assign 'this' to a variable for use in the tooltip closure below.
    var thisBlock = this;
    this.setTooltip(function() {
      if (!thisBlock.elseifCount_ && !thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_1;
      } else if (!thisBlock.elseifCount_ && thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_2;
      } else if (thisBlock.elseifCount_ && !thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_3;
      } else if (thisBlock.elseifCount_ && thisBlock.elseCount_) {
        return Blockly.Msg.CONTROLS_IF_TOOLTIP_4;
      }
      return '';
    });
    this.elseifCount_ = 0;
    this.elseCount_ = 0;
  },
  /**
   * Create XML to represent the number of else-if and else inputs.
   * @return {Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function() {
    if (!this.elseifCount_ && !this.elseCount_) {
      return null;
    }
    var container = document.createElement('mutation');
    if (this.elseifCount_) {
      container.setAttribute('elseif', this.elseifCount_);
    }
    if (this.elseCount_) {
      container.setAttribute('else', 1);
    }
    return container;
  },
  /**
   * Parse XML to restore the else-if and else inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function(xmlElement) {
    this.elseifCount_ = parseInt(xmlElement.getAttribute('elseif'), 10);
    this.elseCount_ = parseInt(xmlElement.getAttribute('else'), 10);
    for (var i = 1; i <= this.elseifCount_; i++) {
      this.appendValueInput('IF' + i)
          .setCheck('Boolean')
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
      this.appendStatementInput('DO' + i)
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    }
    if (this.elseCount_) {
      this.appendStatementInput('ELSE')
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
    }
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function(workspace) {
    var containerBlock = Blockly.Block.obtain(workspace, 'js_if_if_statement');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 1; i <= this.elseifCount_; i++) {
      var elseifBlock = Blockly.Block.obtain(workspace, 'js_elseif_statement');
      elseifBlock.initSvg();
      connection.connect(elseifBlock.previousConnection);
      connection = elseifBlock.nextConnection;
    }
    if (this.elseCount_) {
      var elseBlock = Blockly.Block.obtain(workspace, 'js_else_statement');
      elseBlock.initSvg();
      connection.connect(elseBlock.previousConnection);
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function(containerBlock) {
    // Disconnect the else input blocks and remove the inputs.
    if (this.elseCount_) {
      this.removeInput('ELSE');
    }
    this.elseCount_ = 0;
    // Disconnect all the elseif input blocks and remove the inputs.
    for (var i = this.elseifCount_; i > 0; i--) {
      this.removeInput('IF' + i);
      this.removeInput('DO' + i);
    }
    this.elseifCount_ = 0;
    // Rebuild the block's optional inputs.
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'js_elseif_statement':
          this.elseifCount_++;
          var ifInput = this.appendValueInput('IF' + this.elseifCount_)
              .setCheck('Boolean')
              .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
          var doInput = this.appendStatementInput('DO' + this.elseifCount_);
          doInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
          // Reconnect any child blocks.
          if (clauseBlock.valueConnection_) {
            ifInput.connection.connect(clauseBlock.valueConnection_);
          }
          if (clauseBlock.statementConnection_) {
            doInput.connection.connect(clauseBlock.statementConnection_);
          }
          break;
        case 'js_else_statement':
          this.elseCount_++;
          var elseInput = this.appendStatementInput('ELSE');
          elseInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
          // Reconnect any child blocks.
          if (clauseBlock.statementConnection_) {
            elseInput.connection.connect(clauseBlock.statementConnection_);
          }
          break;
        default:
          throw 'Unknown block type.';
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  setCounts: function(elseifCount_, elseCount_) {
    // Disconnect the else input blocks and remove the inputs.
    if (this.elseCount_) {
      this.removeInput('ELSE');
    }
    this.elseCount_ = 0;
    // Disconnect all the elseif input blocks and remove the inputs.
    for (var i = this.elseifCount_; i > 0; i--) {
      this.removeInput('IF' + i);
      this.removeInput('DO' + i);
    }
    this.elseifCount_ = 0;
    // Rebuild the block's optional inputs.
    while (this.elseifCount_ < elseifCount_) {
      this.elseifCount_++;
      var ifInput = this.appendValueInput('IF' + this.elseifCount_)
          .setCheck('Boolean')
          .appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSEIF);
      var doInput = this.appendStatementInput('DO' + this.elseifCount_);
      doInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_THEN);
    }
    while (this.elseCount_ < elseCount_) {
      this.elseCount_++;
      var elseInput = this.appendStatementInput('ELSE');
      elseInput.appendField(Blockly.Msg.CONTROLS_IF_MSG_ELSE);
    }
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function(containerBlock) {
    var clauseBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 1;
    while (clauseBlock) {
      switch (clauseBlock.type) {
        case 'js_elseif_statement':
          var inputIf = this.getInput('IF' + i);
          var inputDo = this.getInput('DO' + i);
          clauseBlock.valueConnection_ =
              inputIf && inputIf.connection.targetConnection;
          clauseBlock.statementConnection_ =
              inputDo && inputDo.connection.targetConnection;
          i++;
          break;
        case 'js_else_statement':
          var inputDo = this.getInput('ELSE');
          clauseBlock.statementConnection_ =
              inputDo && inputDo.connection.targetConnection;
          break;
        default:
          throw 'Unknown block type.';
      }
      clauseBlock = clauseBlock.nextConnection &&
          clauseBlock.nextConnection.targetBlock();
    }
  }
};
//data objects

Blocklify.JavaScript.Generator['js_literal_number'] = function(block) {
  var code = parseFloat(block.getFieldValue('NUMBER'));
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_literal_string'] = function(block) {
  var code = Blocklify.JavaScript.Generator.quote_(block.getFieldValue('STRING'));
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_literal_bool'] = function(block) {
  var code = block.getFieldValue('BOOL');
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_null_value'] = function(block) {
  return ['null', Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_undefined_value'] = function(block) {
  return ['undefined', Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_json_object'] = function(block) {
  var elements = Blocklify.JavaScript.Generator.statementToCode(block, 'ELEMENTS');
  var code = ' {' + ((elements != '')?'\n':'') +
      elements + '}';
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blocklify.JavaScript.Generator['js_json_element'] = function(block, context) {
  var key = Blocklify.JavaScript.Generator.valueToCode(block, 'KEY',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var code =  key + ': ' + value + ',\n';
  return code;
};
Blocklify.JavaScript.Generator['js_identifier'] = function(block) {
  var name = block.getFieldValue('NAME');
  var code = name;
  return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
};
Blockly.Blocks['identifier_member_expression'] = {
  init: function() {
    this.setColour(330);
    this.setOutput(true);
    this.interpolateMsg(
        '%1.%2',
        ['NAME', new Blockly.FieldTextInput('')],
        ['NEXT', null, Blockly.ALIGN_RIGHT],
        Blockly.ALIGN_RIGHT);
    this.setInputsInline(false);
    this.setTooltip('Identifier of member expression.');
  }
};
Blocklify.JavaScript.Generator['js_variable_declarator'] = function(block) {
  var variable = Blocklify.JavaScript.Generator.valueToCode(block, 'VAR',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  if (value == 'undefined') {
    return ' ' + variable + ',';
  } else {
    return ' ' + variable + ' = ' + value + ',';
  }
};
Blocklify.JavaScript.Generator['js_variable_declaration_unary'] = function(block) {
  var variable = Blocklify.JavaScript.Generator.valueToCode(block, 'VAR',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  if (value == 'undefined') {
    return 'var ' + variable + ';\n';
  } else {
    return 'var ' + variable + ' = ' + value + ';\n';
  }
};
Blocklify.JavaScript.Generator['js_variable_declaration'] = function(block) {
  var declarations = Blocklify.JavaScript.Generator.statementToCode(block, 'DECLARATIONS');
  declarations = declarations.substring(2,declarations.length-1); //fix last comma and two spaces generated by statementToCode function
  return 'var' + declarations + ';\n';
};
//expressions

Blocklify.JavaScript.Generator['js_assignment_expression'] = function(block) {
  var variable = Blocklify.JavaScript.Generator.valueToCode(block, 'VAR',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var value = Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var code = variable + ' ' + operator + ' ' + value;
  //If has output returns a tuple with the order of precedence
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_update_expression_prefix'] = function(block) {
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var OPERATORS = {
    '++': Blocklify.JavaScript.Generator.ORDER_INCREMENT,
    '--': Blocklify.JavaScript.Generator.ORDER_DECREMENT
  };
  var code = operator + argument;
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_update_expression_noprefix'] = function(block) {
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT',
      Blocklify.JavaScript.Generator.ORDER_ASSIGNMENT);
  var operator = block.getFieldValue('OPERATOR');
  var OPERATORS = {
    '++': Blocklify.JavaScript.Generator.ORDER_INCREMENT,
    '--': Blocklify.JavaScript.Generator.ORDER_DECREMENT
  };
  var code =  argument + operator;
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_binary_expression'] = function(block) {
  var OPERATORS = {
    '+': Blocklify.JavaScript.Generator.ORDER_ADDITION,
    '-': Blocklify.JavaScript.Generator.ORDER_SUBTRACTION,
    '*': Blocklify.JavaScript.Generator.ORDER_MULTIPLICATION,
    '/': Blocklify.JavaScript.Generator.ORDER_DIVISION,
    '%': Blocklify.JavaScript.Generator.ORDER_MODULUS,
    '==': Blocklify.JavaScript.Generator.ORDER_EQUALITY,
    '!=': Blocklify.JavaScript.Generator.ORDER_EQUALITY,
    '>': Blocklify.JavaScript.Generator.ORDER_RELATIONAL,
    '<': Blocklify.JavaScript.Generator.ORDER_RELATIONAL,
    '>=': Blocklify.JavaScript.Generator.ORDER_RELATIONAL,
    '<=': Blocklify.JavaScript.Generator.ORDER_RELATIONAL,
    '===': Blocklify.JavaScript.Generator.ORDER_EQUALITY,
    '&': Blocklify.JavaScript.Generator.ORDER_BITWISE_AND,
    '^': Blocklify.JavaScript.Generator.ORDER_BITWISE_XOR,
    '|': Blocklify.JavaScript.Generator.ORDER_BITWISE_OR,
    '>>': Blocklify.JavaScript.Generator.ORDER_BITWISE_SHIFT,
    '<<': Blocklify.JavaScript.Generator.ORDER_BITWISE_SHIFT,
    '>>>': Blocklify.JavaScript.Generator.ORDER_BITWISE_SHIFT
  };
  var operator = block.getFieldValue('OPERATOR');
  var left = Blocklify.JavaScript.Generator.valueToCode(block, 'LEFT',
      OPERATORS[operator]);
  var right = Blocklify.JavaScript.Generator.valueToCode(block, 'RIGHT',
      OPERATORS[operator]);
  var code =  left + ' ' + operator + ' ' + right;
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_member_expression'] = function(block) {
  var members = [];
  for (var i = 0; i < block.memberCount; i++) {
    members[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'MEMBER' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = members.join('.');
  return [code, Blocklify.JavaScript.Generator.ORDER_MEMBER];
  if (block.outputConnection) {
    return [code, OPERATORS[operator]];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_function_expression'] = function(block) {
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'STACK');
  var name = Blocklify.JavaScript.Generator.valueToCode(block, 'NAME',
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  var args = [];
  for (var i = 0; i < block.paramCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'PARAM' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = 'function ' + name + '(' + args.join(', ') + ') {\n' +
      branch + '}';
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
  } else {
    return code + ';\n';
  }
};

Blocklify.JavaScript.Generator['js_anonimous_function_expression'] = function(block) {
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'STACK');
  var args = [];
  for (var i = 0; i < block.paramCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'PARAM' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = 'function (' + args.join(', ') + ') {\n' +
      branch + '}';
  return [code, Blocklify.JavaScript.Generator.ORDER_TYPEOF];
};

Blocklify.JavaScript.Generator['js_call_expression'] = function(block) {
  var name = Blocklify.JavaScript.Generator.valueToCode(block, 'NAME',
    Blocklify.JavaScript.Generator.ORDER_FUNCTION_CALL);
  var args = [];
  for (var i = 0; i < block.argCount; i++) {
    args[i] = Blocklify.JavaScript.Generator.valueToCode(block, 'ARGUMENT' + i,
      Blocklify.JavaScript.Generator.ORDER_ATOMIC);
  }
  var code = name + '(' + args.join(', ') + ')';
  if (block.outputConnection) {
    return [code, Blocklify.JavaScript.Generator.ORDER_ATOMIC];
  } else {
    return code + ';\n';
  }
};
//statement blocks

Blocklify.JavaScript.Generator['js_for_statement'] = function(block) {
  var value_condition = Blocklify.JavaScript.Generator.valueToCode(block, 'CONDITION', Blocklify.JavaScript.Generator.ORDER_NONE);
  var statements_first = '', func;
  var first_targetblock = block.getInputTargetBlock('FIRST');
  if (first_targetblock) {
    if (first_targetblock.type == 'js_variable_declaration' ||
        first_targetblock.type == 'js_variable_declaration_unary') {
      func = Blocklify.JavaScript.Generator[first_targetblock.type];
      statements_first = func.call(first_targetblock, first_targetblock);
      statements_first = Blocklify.JavaScript.Generator.statementToCode(block, 'FIRST');
      statements_first = statements_first.substring(2, statements_first.length - 2);
    } else {
      statements_first = Blocklify.JavaScript.Generator.sequenceToCode(block, 'FIRST');
    }
  }
  var statements_do = Blocklify.JavaScript.Generator.statementToCode(block, 'DO');
  var statements_step = Blocklify.JavaScript.Generator.sequenceToCode(block, 'STEP');
  // TODO: Assemble JavaScript into code variable.
  var code = 'for (' + statements_first + '; ' + value_condition + '; ' + statements_step + ') {\n' +
    statements_do + '}';
  return code;
};

Blocklify.JavaScript.Generator['js_return_statement'] = function(block) {
  var code = 'return ' + Blocklify.JavaScript.Generator.valueToCode(block, 'VALUE',
    Blocklify.JavaScript.Generator.ORDER_NONE) + ';';
  return code + '\n';
};

Blocklify.JavaScript.Generator['js_if_statement'] = function(block) {
  var n = 0;
  var argument = Blocklify.JavaScript.Generator.valueToCode(block, 'IF' + n,
      Blocklify.JavaScript.Generator.ORDER_NONE) || 'false';
  var branch = Blocklify.JavaScript.Generator.statementToCode(block, 'DO' + n);
  var code = 'if (' + argument + ') {\n' + branch + '}';
  for (n = 1; n <= block.elseifCount_; n++) {
    argument = Blocklify.JavaScript.Generator.valueToCode(block, 'IF' + n,
        Blocklify.JavaScript.Generator.ORDER_NONE) || 'false';
    branch = Blocklify.JavaScript.Generator.statementToCode(block, 'DO' + n);
    code += ' else if (' + argument + ') {\n' + branch + '}';
  }
  if (block.elseCount_) {
    branch = Blocklify.JavaScript.Generator.statementToCode(block, 'ELSE');
    code += ' else {\n' + branch + '}';
  }
  return code + '\n';
};