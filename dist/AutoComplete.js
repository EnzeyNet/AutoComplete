(function(angular) {
	var module = angular.module('net.enzey.autocomplete', ['ngSanitize']);

	var defaultTemplateUrl = 'AutoComplete/hintTemplate.html';
	module.run(function($templateCache) {
		var defaultTemplate = '<div nz-auto-complete-hint-text></div>';
		$templateCache.put(defaultTemplateUrl, defaultTemplate);
	});

	module.directive('nzAutoCompleteHintText', function($parse, $sce) {
		return {
			restrict: 'AE',
			controller: function ($scope) {
				$scope.highlightedText = function() {
					var hintText = $scope.displayPath === null ? 'hint' : 'hint.' + $scope.displayPath;
					var highlightRegExp =  new RegExp('(' + $scope.actualText +  ')', 'gi');
					var text = $parse(hintText)(this);
					var markedText = text.replace(highlightRegExp, '<mark>$1</mark>');
					return $sce.trustAsHtml(markedText);
				};
			},
			compile: function (element, attr) {
				var highlightedText = angular.element('<div ng-bind-html="highlightedText()"></div>');
				element.append(highlightedText);
			}
		};
	});

	module.directive('nzAutoCompleteInclude', function($compile, $http, $templateCache) {
		return {
			restrict: 'AE',
			link: function (scope, element, attr) {
				$http.get(attr.nzAutoCompleteInclude, {cache: $templateCache})
				.success(function(html) {
					element.append($compile(html)(scope));
				});
			}
		};
	});

	module.directive('nzAutoComplete', function($compile, $parse, $timeout) {
		return {
			scope: {},
			transclude: true,
			restrict: 'AE',
			link: function (scope, element, attr) {
				element.addClass('inputHint');
				scope.hints = [];
				scope.actualText = '';

				scope.displayPath = null;
				if (angular.isDefined(attr.displayPath)) {
					scope.displayPath = attr.displayPath;
				}

				var positionHintsFn = function(hintList, inputElem) {
					var scroller = hintList.find('div')[0];
					if (scroller.scrollHeight > scroller.clientHeight) {
						angular.element(scroller).css('overflow-y', 'scroll');
					} else {
						angular.element(scroller).css('overflow-y', '');
					}
				};
				if (angular.isDefined(attr.positionHintsFn)) {
					positionHintsFn = $parse(attr.positionHintsFn)(scope.$parent);
				}
				/*
				positionHintsFn = function(hintList, inputElem) {
					$(hintList).position({
						my: "left top",
						at: "left bottom",
						of: inputElem,
						collision: 'flip'
					});
				}
				*/

				var displaySuggestions = function(hintResults) {
					scope.hints = hintResults;
					if (!scope.hints) {scope.hints = [];}

					if (scope.hints.length > 0) {
						var regex = new RegExp('^' + scope.actualText, 'i');
						var objParser = null;
						if (scope.displayPath !== null) {
							objParser = $parse(scope.displayPath);
						}
						$timeout(function() {
							selectRow(0);
						}, 0, false);
						scope.hints.forEach(function(hintObj) {
							if (!displayHint) {return;}

							if (objParser) {
								displayHint = displayHint && regex.test(objParser(hintObj));
							} else {
								displayHint = displayHint && regex.test(hintObj);
							}
						});

					}

					if (positionHintsFn) {
						$timeout(function() {
							positionHintsFn(hintList, inputElem);
						}, 1, false);
					}

				};

				var silentPeriod = +$parse(attr.silentPeriod)(scope.$parent);
				if (isNaN(silentPeriod)) {silentPeriod = 250;}

				var minimumChars = +$parse(attr.minChar)(scope.$parent);
				if (isNaN(minimumChars)) {minimumChars = 1;}
				if (minimumChars === 0) {
					getResultsFn(scope.actualText).then(displaySuggestions);
				}

				var displayHint = false;
				var getResultsFn = $parse(attr.getResultsFn)(scope.$parent);
				if (!getResultsFn || !typeof getResultsFn === 'function') {
					throw 'A function that returns results is required!';
				}

				var isSelectionRequired = false;
				if (angular.isDefined(attr.selectionRequired) && attr.selectionRequired === 'true') {
					isSelectionRequired = true;
				}

				var hintInputElem = $compile('<input class="hintBox" tabindex="-1"></input>')(scope);
                var inputElem     = $compile('<input class="textEntry" ng-model="actualText"></input>')(scope);

				element.append(hintInputElem);
				element.append($compile('<iframe></iframe>')(scope));
				element.append(inputElem);

				var getHintDisplay = function() {
					var hintDisplayObj = scope.hints[scope.selectedHintIndex];
					if (scope.displayPath !== null) {
						return $parse(scope.displayPath)(hintDisplayObj);
					}
					return hintDisplayObj;
				};

				var selectRow = function(index, skipApply) {
					if (index === scope.selectedHintIndex) {return;}

					if (0 <= index && index < scope.hints.length) {
						var scroller = hintList.find('div')[0];
						var hints =   angular.element(scroller).children();
						var newHint = angular.element(hints[index]);

						if (newHint[0].offsetTop < scroller.scrollTop) {
							// scrollUp
							scroller.scrollTop = newHint[0].offsetTop - 1;
						} else if (newHint[0].offsetTop + newHint[0].clientHeight > scroller.scrollTop + scroller.clientHeight) {
							// scrollDown
							scroller.scrollTop = newHint[0].offsetTop + newHint[0].clientHeight - scroller.clientHeight + 1;
						}

						scope.selectedHintIndex = index;
						if (!skipApply) {
							scope.$apply();
						}
						if (displayHint === true) {
							var hintDisplayText = getHintDisplay();
							var userInputString = inputElem.val();
							hintInputElem.val(userInputString + hintDisplayText.slice(userInputString.length, hintDisplayText.length));
						}
					}
				};

                scope.select = function(selectedIndex) {
                    scope.selectedHintIndex = selectedIndex;
					scope.actualText = getHintDisplay();
                    inputElem[0].focus();
                };

                scope.hoverOver = function(selectedIndex) {
					selectRow(selectedIndex, true);
                };

				var templateUrl = angular.isDefined(attr.templateUrl) ? attr.templateUrl : defaultTemplateUrl;
                var hintList = $compile('<div class="scrollerContainer" ng-hide="hints.length < 2"><iframe></iframe><div class="scroller"><div class="hint" ng-repeat="hint in hints" ng-click="select($index)" ng-mouseover="hoverOver($index)" ng-class="{selectedHint: $index === selectedHintIndex}"><div nz-auto-complete-include="' + templateUrl + '"></div></div></div></div>')(scope);
                element.append(hintList);

				var setParentModel = function() {
					if (isSelectionRequired) {
						var selectedObj = scope.hints[scope.selectedHintIndex];
						if (scope.hints && scope.hints.length > 0 &&
						( scope.actualText === selectedObj || scope.actualText === $parse(scope.displayPath)(selectedObj) ) ) {
							$parse(attr.ngModel).assign(scope.$parent, selectedObj);
						} else {
							$parse(attr.ngModel).assign(scope.$parent);
						}
					} else {
						if (minimumChars <= scope.actualText.length) {
							$parse(attr.ngModel).assign(scope.$parent, scope.actualText);
						} else {
							$parse(attr.ngModel).assign(scope.$parent, "");
						}
					}
				};

				var pendingResultsFunctionCall;
				scope.$watch('actualText', function() {
					displayHint = inputElem[0].scrollWidth <= inputElem[0].clientWidth;
					setParentModel();

					scope.selectedHintIndex = null;
					hintInputElem.val('');
					scope.hints = [];

					// Stop any pending requests
					$timeout.cancel(pendingResultsFunctionCall);

					if (minimumChars <= scope.actualText.length) {
						pendingResultsFunctionCall = $timeout(function() {
							// ... Display loading indication ...
							getResultsFn(scope.actualText).then(displaySuggestions);
						}, silentPeriod, true);
					}
				});

				inputElem.bind("focus", function() {
					if (positionHintsFn && scope.hints) {
						$timeout(function() {
							positionHintsFn(hintList, inputElem);
						}, 1, false);
					}
				});

				inputElem.bind("keydown", function(e) {
					if (scope.selectedHintIndex !== null && e.keyCode === 13) {
						scope.actualText = getHintDisplay();
						scope.$apply();
					} else if (e.keyCode === 40) {
						// key down
						if (scope.selectedHintIndex !== null && scope.hints.length > 1) {
							var newIndex;
							if (scope.selectedHintIndex === scope.hints.length - 1) {
								newIndex = 0;
							} else {
								newIndex = scope.selectedHintIndex + 1;
							}
							selectRow(newIndex);
						}
                        e.preventDefault();
                        e.stopPropagation();
					} else if (e.keyCode === 38) {
						// key up
						if (scope.selectedHintIndex !== null && scope.hints.length > 1) {
							var newIndex;
							if (scope.selectedHintIndex === 0) {
								newIndex = scope.hints.length - 1;
							} else {
								newIndex = scope.selectedHintIndex - 1;
							}
							selectRow(newIndex);
						}
                        e.preventDefault();
                        e.stopPropagation();
					}
				});

			}
		};
	});

})(angular);