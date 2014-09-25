module.exports = function (grunt) {

	var matchdep = require('matchdep'); // dependencies from package
	var repoLocation = /(https:\/\/github.com)(.*)/.exec(grunt.file.read('.git/config'))[0];	
	var srcdir = 'src';
	var distdir = 'dist';

	// Get name of folder this file is in.
	var projectName = /[^\\/]*$/gi.exec(__dirname)[0];

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		distdir: distdir,
		projectName: projectName,
		curl: {
			update_template: {
				src: 'https://github.com/EnzeyNet/GitHub-Project-Template/archive/master.zip',
				dest: 'update/master.zip'
			}
		},
		karma: {
			unit: {
				configFile: 'karma.conf.js',
				runnerPort: 9999,
				browsers: ['Chrome', 'Firefox']
			}
		},
		concat: {
			options: {
				separator: '\n//End of file\n'
			},
			dev: {
				src: [
					srcdir + '/**/*.js'
				],
				dest: '<%= distdir %>/<%= projectName %>.js'
			}
		},
		uglify: {
			production: {
				files: {
					'<%= distdir %>/<%= projectName %>.min.js': [srcdir + '/**/*.js']
				}
			}
		},
		less: {
			dev: {
				options: {
					cleancss:  false,
					sourceMap: false,
					compress:  false,
					paths: [srcdir + '/less']
				},
				files: {
					'<%= distdir %>/<%= projectName %>.css': srcdir + '/less/<%= projectName %>.less'
				}
			},
			production: {
				options: {
					cleancss:  true,
					sourceMap: true,
					compress:  true,
					paths: [srcdir + '/' + projectName + '.less']
				},
				files: {
					'<%= distdir %>/<%= projectName %>.min.css': srcdir + '/less/<%= projectName %>.less'
				}
			}
		},
		gitclone: {
			'gh-pages': {
				options: {
					branch: 'gh-pages',
					repository: repoLocation,
					directory: 'gh-pages'
				}
			}
		},
		clean: ['<%= distdir %>', 'gh-pages']
	});
	matchdep.filterDev('grunt-*').forEach(grunt.loadNpmTasks);

	grunt.registerTask('get-dependencies', 'Install js packages listed in bower.json', function() {
		var bower = require('bower');
		var done = this.async();

		bower.commands.install()
		.on('data', function(data){
			grunt.log.write(data);
		})
		.on('error', function(data){
			grunt.log.write(data);
			done(false);
		})
		.on('end', function (data) {
			done();
		});
	});

	grunt.registerTask('all', ['get-dependencies', 'buildDev', 'buildProd', 'test']);
	grunt.registerTask('buildDev', ['concat', 'less:dev', 'purgeEmptyFiles']);
	grunt.registerTask('buildProd', ['uglify', 'less:production', 'purgeEmptyFiles']);
	grunt.registerTask('test', ['karma:unit']);

	grunt.registerTask('build-examples', 'Build gh-pages branch of examples.', function() {
		grunt.task.run('buildDev', 'buildProd', 'update-examples', 'update-examples-dist');
	});

	grunt.registerTask('purgeEmptyFiles', function() {
		grunt.file.recurse(distdir, function(abspath, rootdir, subdir, filename) {
			if (grunt.file.read(abspath).length === 0) {
				grunt.file.delete(abspath);
			}
		});
	});

	grunt.registerTask('update-examples', function() {
		if (!grunt.file.exists('gh-pages')) {
			grunt.task.run('gitclone:gh-pages');
		}
		grunt.task.run('update-examples-dist');
	});

	grunt.registerTask('update-examples-dist', function() {
		var examplesDist = 'gh-pages/' + distdir + '/';
		grunt.file.mkdir(examplesDist);
		grunt.file.recurse(distdir, function (abspath, rootdir, subdir, filename) {
			grunt.log.error(abspath);
			grunt.file.copy(abspath, examplesDist + filename);
		});
	});

	grunt.registerTask('init-repo', function() {
		var mainLessFile = srcdir + '/' + 'less' + '/' + projectName + '.less';
		if (!grunt.file.exists(mainLessFile)) {
			grunt.file.write(mainLessFile, '');
		}

		if (!grunt.file.exists(srcdir)) {
			grunt.file.mkdir(srcdir);
		}

		if (!grunt.file.exists('gh-pages')) {
			grunt.task.run('gitclone:gh-pages');
		}
	});

	grunt.registerTask('update', function() {
		
	});
};
