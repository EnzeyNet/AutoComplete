// Karma configuration
// Generated on Fri Jul 05 2013 16:55:06 GMT-0500 (Central Daylight Time)
module.exports = function(config) {
    'use strict';
    config.set({
            // your config
            frameworks: ["jasmine"],
            basePath: '.',
            files: [
                'lib*/angular/*.js',
                'lib*/**/*.js',
                'src/*.js',
                'src_test/*.js'
            ],
            exclude: [
				'lib/**/*min.js'
            ],

            ngHtml2JsPreprocessor: {
                stripPrefix: "src/"
            },

            preprocessors: {
                'src/**/*.js': 'coverage'
            },

            coverageReporter: {
                type: 'cobertura',
                dir: 'coverage/',
                file: 'coverage.xml'
            },

// test results reporter to use
// possible values: 'dots', 'progress', 'junit'
            reporters: ['progress', 'junit', 'coverage'],

            junitReporter: {
                outputFile: 'reports/test-results.xml',
                suite: ''
            },

            runnerPort: 9100,

            port: 9876,
            colors: true,
// possible values: LOG_DISABLE || LOG_ERROR || LOG_WARN || LOG_INFO || LOG_DEBUG
            logLevel: config.LOG_INFO,
            autoWatch: true,

// Start these browsers, currently available:
// - Chrome
// - ChromeCanary
// - Firefox
// - Opera
// - Safari (only Mac)
// - PhantomJS
// - IE (only Windows)
            browsers: ['Chrome'],
// If browser does not capture in given timeout [ms], kill it
            captureTimeout: 60000,
// Continuous Integration mode
// if true, it capture browsers, run tests and exit
            singleRun: true
        }
    );
};
