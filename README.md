# Blocklify

Is an extension of [Blockly][blockly] for show code in blocks and generate the same code(ideally). The main idea is make a embeddable block editor for the most common text editors like sublime, brackets or any text scripting tool. I'm currently making blocklify-brackets extension and support for javascript in blocklify.
The way for do that is make blocks for each language that represent the language, this helps to show code in blocks and generate code from blocks.

A [live demo][livedemo].
[livedemo]: https://carloslfu.github.io/blocklify/demo/

[![example](https://github.com/carloslfu/blocklify/blob/master/blocklify.jpg)](Blocklify)
[blockly]: https://developers.google.com/blockly/

## Why?

- An embeddable text editor made with Blockly allows make a custom graphical representation of your code taking advantage of the horizontal space (the code is only vertical).
- Organize and give extra meaning to your code, imagine no plain code :).
- Blockly is an awesome tool, allows realtime collaboration, custom block creation and much more.
- Blockly is actively developed and maintained.

## Features
- Two way parsing code, import and export code.

##Usage

Just add blocklify_compressed.js file to your code (See the demo in demos folder).

##Develop

The incoming features, and in develop features are in [Blocklify][trello]
[trello]: https://trello.com/b/IhdIln7f/blocklify

### Features to be implemented in [Blockly][blockly-git] needed for this project
- PointerEvents support for IE10-11 support.
- [Zooming][Zooming]. (yet - not merged - needs to be revised and improved)
- Multiple block selection.
- Multitouch support. (Maybe a full PointerEvents implementation + [polyfills][PEP])
- Group floating field.
- Floating toobox displayed with contextmenu.
- Hideable toolbox. (mousehover event diplays that with a transition)
- Instantiable workspace and instantiable blockly. (for multiple workspaces and multiple blockly instances)
- Nested workspaces and nested blockly instances.
- Pugins API.
- Full SVG implemented fields for best UI. (not overlay text elements)
- Styling API.

### Features to be implemented in this project
- Blocklify block for importing and exporting code into workspace.
- Marked point in code and follow functions. (for merging changes in code)
- Group block. (moves a group of blocks like one using group floating field)

[Zooming]: https://github.com/carloslfu/blockly/tree/mouse_zooming
[PEP]: https://github.com/jquery/PEP

## Contributing
Feel free to contribute. This is the workflow to make a contribution:
- Fork the repo.
- Make your change.
- Test and debug it in tests/playground/index.html page.
- Make a pull request describing what you have done.
For make support for other languages, make a AST parser like [acorn][acorn], and make a renderer for blockly, see the proyect structure.
[acorn]: http://marijnhaverbeke.nl/acorn/
Pull your hacks :)

If you wants to do any feature or have found any bug related to the rendering of blocks, you can contribute to [Blockly][blockly-git] reporting the bug or pulling your patch.

[blockly-git]: https://github.com/google/blockly
