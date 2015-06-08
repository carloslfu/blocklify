'use strict';
  
module.exports = function (grunt) {
  
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        concat: {
            dist: {
                src: [
                    'javascript/parser/acorn.js',
                    'core/blocklify.js',
                    'javascript/javascript.js',
                    'javascript/generator.js',
                    'javascript/importer.js',
                    'javascript/blocks.js',
                    'javascript/mapper.js',
                    'javascript/blocks/*.js',
                    'javascript/generators/*.js'
                ],
                dest: 'blocklify_uncompressed.js'
            }
        },
        uglify: {
            options: {
		      mangle: false,
		      compress: false
		    },
		    build: {
		      files: {
		        'blocklify_compressed.js': ['blocklify_uncompressed.js']
		      }
		    }
        }
    });
  
    // Where we tell Grunt we plan to use some plug-ins.
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
  
    // Where we tell Grunt what to do when we type "grunt" into the terminal.
    grunt.registerTask('minification', ['uglify']);
    grunt.registerTask('default', ['concat', 'uglify']);
};