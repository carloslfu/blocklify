# Blocklify

Is an extension of [Blockly][blockly] for show code in blocks and generate the same code(ideally). The main idea is make a embeddable block editor for the most common text editors like sublime, brackets or any text scripting tool. I'm currently making blocklify-brackets extension and support for javascript in blocklify.
The way for do that is make blocks for each language that represent the language, this helps to show code in blocks and generate code from blocks.

A [live demo][livedemo].
[livedemo]: https://carloslfu.github.io/blocklify/demo/

[![example](https://github.com/carloslfu/blocklify/blob/master/blocklify.jpg)](Blocklify)
[blockly]: https://developers.google.com/blockly/

## Why?

- An embeddable text editor made with Blockly allows make a custom graphical representation of your code taking advantage of the horizontal space (the code is only vertical).
- Separate the logic of the graphics is a good idea.
- Blockly is an awesome tool.
- Blockly is actively developed and maintained.

## Installation

Just add a minified version of blocklify before add blockly_compressed.js file.(building system no yet)

##Usage

See the demo in demos/ folder.

##Develop and contributing

The incoming features, and in develop features are in [Blocklify][trello]
[trello]: https://trello.com/b/IhdIln7f/blocklify

For testing see tests/playground folder.

For make suppurt for other languages, make a AST parser like [acorn][acorn], and make a renderer for blockly, see the proyect structure.
[acorn]: http://marijnhaverbeke.nl/acorn/
Pull your hacks :)

If you wants to do any feature or have found any bug related to the rendering of blocks, you can contribute to [Blockly][blockly-git] reporting the bug or pulling your patch.

[blockly-git]: https://github.com/google/blockly
