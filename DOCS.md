# Documentation

## Architecture

For each language supported.

![architecture](https://github.com/carloslfu/blocklify/blob/master/architecture.jpg)

### Atomic converter

Atomic blocks are the representation of the target language, all features should have a block representation, any code should be converted to blocks.

### Pattern converter

Patterns are blocks that represents high level abstractions of the code, for example the blockly core blocks or your own custom blocks. This allows importing code patterns in your custom blocks. This feature is not yet implemented, work in progress.

### Mixed converter

This converter allows use both atomic and pattern converter for importing code. This feature is not yet implemented, work in progress.