/*global describe,expect,it,beforeEach,inject,afterEach*/

describe('Test Name', function() {

    'use strict';

    var scope;
    var compile;
    var rootScope;

    //beforeEach(module('your.module'));

    beforeEach(inject(function($rootScope, $compile, $document) {
        scope = $rootScope.$new();
        compile = $compile;
        rootScope = $rootScope;
    }));

    it('test', inject(function() {
    }));

});
