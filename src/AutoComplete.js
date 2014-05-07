(function(angular) {
	var module = angular.module('net.enzey.trailingInput', []);

	module.directive('nzAutoComplete', function($compile, $parse, $timeout) {
		return {
			scope: {},
			restrict: 'AE',
			link: function (scope, element, attr) {
				var positionHintsFn;
				/*
					positionHintsFn = 
							$(hintList).position({
								my: "left top",
								at: "left bottom",
								of: inputElem
							});
				*/
				var displayHint = false;
				var getResultsFunc = $parse(attr.getResultsFunc)(scope.$parent);
				if (!getResultsFunc || !typeof getResultsFunc === 'function') {
					throw 'A function that returns results is required!';
				}
				var isSelectionRequired = false;
				if ( (angular.isDefined(attr.selectionRequired) && attr.selectionRequired === 'true') || 
						angular.isDefined(attr.displayPath) ) {
					isSelectionRequired = true;
				}
				element.addClass('inputHint');
				var hintInputElem = $compile('<input class="hintBox" tabindex="-1"></input>')(scope);
                var inputElem     = $compile('<input class="textEntry" ng-model="actualText"></input>')(scope);

				var getHintDisplay = function() {
					var hintDisplayObj = scope.hintables[scope.hintableIndex];
					if (angular.isDefined(attr.displayPath)) {
						return $parse(attr.displayPath)(hintDisplayObj);
					}
					return hintDisplayObj;
				};

				element.append(hintInputElem);
				element.append($compile('<iframe></iframe>')(scope));
				element.append(inputElem);

                scope.select = function(selectedIndex) {
                    scope.hintableIndex = selectedIndex;
					scope.actualText = getHintDisplay();
                    inputElem[0].focus();
                };

                scope.hoverOver = function(selectedIndex) {
                    scope.hintableIndex = selectedIndex;
					if (displayHint === true) {
						hintInputElem.val(getHintDisplay());
					}
                };

				var hintText = angular.isDefined(attr.displayPath) ? 'hint.' + attr.displayPath : 'hint';
                var hintList = $compile('<div class="scrollerContainer" ng-hide="hintables.length < 2"><iframe></iframe><div class="scroller"><div class="hint" ng-repeat="hint in hintables" ng-click="select($index)" ng-mouseover="hoverOver($index)" ng-class="{selectedHint: $index === hintableIndex}"><div nz-no-bind>{{' + hintText + '}}</div></div></div></div>')(scope);
                element.append(hintList);

				scope.actualText = '';

				inputElem.bind("focus", function() {
					if (positionHintsFn && scope.hintables) {
						$timeout(function() {
							positionHintsFn(hintList, inputElem);
						}, 1, false);
					}
				});
				scope.$watch('actualText', function() {
					displayHint = true;
                    scope.hintableIndex = null;
					var newHintText = scope.actualText;
					scope.hintables = getResultsFunc(scope.actualText);
					if (!scope.hintables) {scope.hintables = [];}

					if (scope.hintables.length > 0) {
						var regex = new RegExp('^' + scope.actualText);
						var objParser = null;
						if (angular.isDefined(attr.displayPath)) {
							objParser = $parse(attr.displayPath);
						}
						scope.hintables.forEach(function(hintObj) {
							if (objParser) {
								displayHint = displayHint && regex.test(objParser(hintObj));
							} else {
								displayHint = displayHint && regex.test(hintObj);
							}
						});
						scope.hintableIndex = 0;
						newHintText = getHintDisplay();
					}
					if (displayHint === true) {
						hintInputElem.val(newHintText);
					} else {
						hintInputElem.val('');
					}
					if (positionHintsFn) {
						$timeout(function() {
							positionHintsFn(hintList, inputElem);
						}, 1, false);
					}

					setParentModel();
				});

				var setParentModel = function() {
					if (isSelectionRequired) {
						var selectedObj = scope.hintables[scope.hintableIndex];
						if (scope.hintables && scope.hintables.length > 0 && 
						( scope.actualText === selectedObj || scope.actualText === $parse(attr.displayPath)(selectedObj) ) ) {
							$parse(attr.ngModel).assign(scope.$parent, selectedObj);
						} else {
							$parse(attr.ngModel).assign(scope.$parent);
						}
					} else {
						$parse(attr.ngModel).assign(scope.$parent, scope.actualText);
					}
				};

				inputElem.bind("keydown", function(e) {
					if (scope.hintableIndex !== null && (e.keyCode === 13 || e.keyCode === 39)) {
						scope.actualText = getHintDisplay();
						scope.$apply();
					} else if (e.keyCode === 40) {
						// key down
						if (scope.hintableIndex !== null && hintInputElem.val().length > scope.actualText.length) {
							if (scope.hintableIndex === scope.hintables.length - 1) {
                                scope.hintableIndex = 0;
							} else {
                                scope.hintableIndex++;
							}
							hintInputElem.val(getHintDisplay());
							scope.$apply();
						}
                        e.preventDefault();
                        e.stopPropagation();
					} else if (e.keyCode === 38) {
						// key up
						if (scope.hintableIndex !== null && hintInputElem.val().length > scope.actualText.length) {
							if (scope.hintableIndex === 0) {
								scope.hintableIndex = scope.hintables.length - 1;
							} else {
								scope.hintableIndex--;
							}
							hintInputElem.val(getHintDisplay());
							scope.$apply();
						}
                        e.preventDefault();
                        e.stopPropagation();
					}
				});

			}
		};
	});

})(angular);