# Blocklify

A library that extends blockly to parse and render code in [Blockly][blockly] blocks and generates the same code(ideally). The main idea is make a embeddable block editor for the most common text editors like sublime, brackets or any text scripting tool. I'm currently making blockly-brackets extension and support for javascript in blocklify.
The way for do that is make blocks for each language that represent the language, this helps to render code in blocks and generate code from blocks.

[![example](https://github.com/carloslfu/blocklify/blob/master/blocklify.jpg)](Blocklify)
[blockly]: https://developers.google.com/blockly/

## Installation

Just add a minified version of blocklify before add blockly_compressed.js file.(building system no yet)

##Usage

See the demo in demos/ folder

##Develop and contributing

The incoming features, and in develop features are in [Blocklify][trello]
[trello]: https://trello.com/b/IhdIln7f/blocklify

For testing see tests/playground folder.

For make suppurt for other languages, make a AST parser like [acorn][acorn], and make a renderer for blockly, see the proyect structure.
[acorn]: http://marijnhaverbeke.nl/acorn/
Pull your hacks :)
