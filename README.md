# Blocklify (alpha)

Is an extension of [Blockly][blockly] for show code in blocks and generate the same code(ideally). The main idea is make a embeddable block editor for the most common text editors like sublime, brackets or any text scripting tool. The way for do that is make blocks for each language that represent the language, this helps to show code in blocks and generate code from blocks.

Now you can use pattern matching for import code to custom blocks, for example import javascript code to Blockly core blocks and additionaly you can use the mixed importer for fill the unsupported features of your custom blocks (or Blockly core blocks) with the JavaScript blocks, see the `tests/patterns/` folder and the `importers/` folder.

See the [BB editor][bb-editor-git] research project page.

[bb-editor-git]: https://github.com/carloslfu/BB-editor

A [live demo of native laanguage blocks][livedemo].
[livedemo]: https://carloslfu.github.io/blocklify/demo/

A [live demo of pattern matching (custom blocks importers)][paternmatching].
[paternmatching]: https://carloslfu.github.io/blocklify/tests/patterns/

![example](https://github.com/carloslfu/blocklify/blob/master/blocklify.jpg)
[blockly]: https://developers.google.com/blockly/

## Why?

- An embeddable text editor made with Blockly allows make a custom graphical representation of your code taking advantage of the horizontal space (the code is only vertical).
- Organize and give extra meaning to your code, imagine no plain code :).
- Blockly is an awesome tool, allows realtime collaboration, custom block creation and much more.
- Blockly is actively developed and maintained.

## Features
- Two way parsing code, import and export code.

Supported languages:
- JavaScript. (partially - work in progress)

## Getting started

Just add blocklify_compressed.js file to your code (See the demo in demos folder), you need include blockly before blocklify sources.

This proyect is under alpha development, don't use for production, is a work in progress.

## Develop

Proyect details in the [documentation page][docs-page].
[docs-page]: https://github.com/carloslfu/blocklify/blob/master/DOCS.md

The incoming features, and in develop features are in [Blocklify][trello]
[trello]: https://trello.com/b/IhdIln7f/blocklify


### Features to be implemented in this project
- Blocklify block for importing and exporting code into workspace.
- Marked point in code and follow functions. (for merging changes in code)
- Group block. (moves a group of blocks like one using floating group field)
- Support for other languages(i'm working in JS) like HTML, python, CSS, C, C++ and more.
- Floating group field.
- Floating toobox displayed with contextmenu.

## Contributing
Feel free to contribute. This is the workflow to make a contribution:
- Fork the repo.
- Make your change.
- Test and debug it in tests/playground/index.html page.
- Make a pull request describing what you have done.

For make support for other languages, make a AST parser like [acorn][acorn], and make a renderer for blockly, see the project structure.
[acorn]: http://marijnhaverbeke.nl/acorn/
Pull your hacks :) , see the [hacking page][hacking-page].
[hacking-page]: https://github.com/carloslfu/blocklify/blob/master/HACKING.md

If you wants to do any feature or have found any bug related to the rendering of blocks, you can contribute to [Blockly repo][blockly-git] reporting the bug or pulling your patch.

[blockly-git]: https://github.com/google/blockly
