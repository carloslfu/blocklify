# Blocklify

Is an extension of [Blockly][blockly] for show code in blocks and generate the same code(ideally). The main idea is make a embeddable block editor for the most common text editors like sublime, brackets or any text scripting tool. The way for do that is make blocks for each language that represent the language, this helps to show code in blocks and generate code from blocks.

I'm now working in [BBlocks][BBlocks-git] a more flexible GUI for this proyect, while reaching a stable version this project will be in stand by. This proyect will be renamed and refactored. This will be a full editor for embedded visual programing.

A [live demo][livedemo].
[livedemo]: https://carloslfu.github.io/blocklify/demo/

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
- JavaScript. (partially - in develop)

##Usage

Just add blocklify_compressed.js file to your code (See the demo in demos folder).

##Develop

**State**: stand by.

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

For make support for other languages, make a AST parser like [acorn][acorn], and make a renderer for blockly, see the proyect structure.
[acorn]: http://marijnhaverbeke.nl/acorn/
Pull your hacks :)

If you wants to do any feature or have found any bug related to the rendering of blocks, you can contribute to [BBlocks][BBlocks-git] reporting the bug or pulling your patch.

[blockly-git]: https://github.com/google/blockly
[BBlocks-git]: https://github.com/carloslfu/BBlocks.js
