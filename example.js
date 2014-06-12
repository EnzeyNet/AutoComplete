(function(angular) {

	var module = angular.module('net.enzey.examples',
		[
			'net.enzey.autocomplete',
		]
	);

	var getPerms = function(datums) {
		var permArr = [];
		var usedChars = [];

		function permute(input) {
			var i, ch;
			for (i = 0; i < input.length; i++) {
				ch = input.splice(i, 1)[0];
				usedChars.push(ch);
				if (input.length == 0) {
					permArr.push(usedChars.slice());
				}
				permute(input);
				input.splice(i, 0, ch);
				usedChars.pop();
			}
			return permArr
		};

		return permute(datums);
	};

	module.run(function($templateCache) {
		$templateCache.put('object.html', '<div nz-auto-complete-hint-text></div>');
	});

	module.controller('autoCompeteExample', function($scope, $timeout, $rootScope, $q) {
		var getWatchCount = function (scope, scopeHash) {
			// default for scopeHash
			if (scopeHash === undefined) {
				scopeHash = {};
			}

			// make sure scope is defined and we haven't already processed this scope
			if (!scope || scopeHash[scope.$id] !== undefined) {
				return 0;
			}

			var watchCount = 0;

			if (scope.$$watchers) {
				watchCount = scope.$$watchers.length;
			}
			scopeHash[scope.$id] = watchCount;

			// get the counts of children and sibling scopes
			// we only need childHead and nextSibling (not childTail or prevSibling)
			watchCount+= getWatchCount(scope.$$childHead, scopeHash);
			watchCount+= getWatchCount(scope.$$nextSibling, scopeHash);

			return watchCount;
		};
		var updateWatchCount;
		updateWatchCount = function() {
			$timeout(function() {
				$scope.watchCount = getWatchCount($rootScope);
				updateWatchCount();
			}, 3000, true);
		};
		updateWatchCount();

		var arrayOfStuff = ['fruit', 'fun', 'family', 'fudge', 'nonfrugal', 'nonliquid', 'nonunison', 'neckpiece', 'nonnitric', 'nastiness', 'novachord', 'nonsaline', 'nonchurch', 'narcotist', 'nucleolus', 'nonbodily', 'nonmucous', 'nondebtor', 'nursemaid', 'nepheline', 'nonsuccor', 'nebulated', 'norwegian', 'nachising', 'nomnomnom'];
		var arrayOfObjs = [];
		arrayOfStuff.forEach(function(text) {
			arrayOfObjs.push({foo: {bar: text}});
		});
		$scope.searchFunction = function (inputText) {
			var deferredFn = $q.defer();
			if (!inputText || inputText.length < 1) {
				deferredFn.reject();
				return deferredFn.promise;
			}

			var regex = new RegExp('^' + inputText, 'i');
			var results = [];
			arrayOfStuff.forEach(function(text) {
				if (regex.test(text)) {results.push(text);}
			});

			deferredFn.resolve(results);
			return deferredFn.promise;
		};
		$scope.searchFunctionObjs = function (inputText) {
			var deferredFn = $q.defer();
			if (!inputText || inputText.length < 1) {
				deferredFn.reject();
				return deferredFn.promise;
			}

			$timeout(function() {
				var regex = new RegExp('^' + inputText, 'i');
				var results = [];
				arrayOfObjs.forEach(function(obj) {
					if (regex.test(obj.foo.bar)) {results.push(obj);}
				});

				deferredFn.resolve(results);
			}, 1000, false);

			return deferredFn.promise;
		}
		$scope.searchFunctionAnyLoc = function (inputText) {
			var deferredFn = $q.defer();
			if (!inputText || inputText.length < 1) {
				deferredFn.reject();
				return deferredFn.promise;
			}

			var regex = new RegExp(inputText, 'i');
			var results = [];
			arrayOfObjs.forEach(function(obj) {
				if (regex.test(obj.foo.bar)) {results.push(obj);}
			});

			deferredFn.resolve(results);
			return deferredFn.promise;
		}

		var data = getPerms(['a', 'b', 'c', 'd', 'e', 'f', 'g']);

	});

})(angular);