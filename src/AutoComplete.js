(function(angular) {
	var module = angular.module('net.enzey.autocomplete', []);

	module.directive('nzAutoComplete', function($compile, $parse, $timeout) {
		return {
			scope: {},
			restrict: 'AE',
			link: function (scope, element, attr) {
				var positionHintsFn = function(hintList, inputElem) {
					var scroller = hintList.find('.scroller')[0];
					if (scroller.scrollHeight > scroller.clientHeight) {
						angular.element(scroller).css('overflow-y', 'scroll');
					} else {
						angular.element(scroller).css('overflow-y', '');
					}
				};
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
				var displayHint = false;
				var getResultsFn = $parse(attr.getResultsFn)(scope.$parent);
				if (!getResultsFn || !typeof getResultsFn === 'function') {
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

				var selectRow = function(index, skipApply) {
					if (index === scope.hintableIndex) {return;}

					if (0 <= index && index < scope.hintables.length) {
						var hints = hintList.find('.hint');
						var newHint = angular.element(hints[index]);
						var scroller = hintList.find('.scroller')[0];

						if (newHint[0].offsetTop < scroller.scrollTop) {
							// scrollUp
							scroller.scrollTop = newHint[0].offsetTop - 1;
						} else if (newHint[0].offsetTop + newHint.outerHeight() > scroller.scrollTop + scroller.clientHeight) {
							// scrollDown
							scroller.scrollTop = newHint[0].offsetTop + newHint.outerHeight() - scroller.clientHeight + 1;
						}

						scope.hintableIndex = index;
						if (!skipApply) {
							scope.$apply();
						}
						if (displayHint === true) {
							hintInputElem.val(getHintDisplay());
						}
					}
				};

                scope.select = function(selectedIndex) {
                    scope.hintableIndex = selectedIndex;
					scope.actualText = getHintDisplay();
                    inputElem[0].focus();
                };

                scope.hoverOver = function(selectedIndex) {
					selectRow(selectedIndex, true);
                };

				var hintText = angular.isDefined(attr.displayPath) ? 'hint.' + attr.displayPath : 'hint';
                var hintList = $compile('<div class="scrollerContainer" ng-hide="hintables.length < 2"><iframe></iframe><div class="scroller"><div class="hint" ng-repeat="hint in hintables" ng-click="select($index)" ng-mouseover="hoverOver($index)" ng-class="{selectedHint: $index === hintableIndex}"><div>{{' + hintText + '}}</div></div></div></div>')(scope);
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
					hintInputElem.val('');
					scope.hintables = [];

					getResultsFn(scope.actualText).then(function(hintResults) {
						scope.hintables = hintResults;
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
							$timeout(function() {
								selectRow(0);
							}, 0, false);

						}

						if (positionHintsFn) {
							$timeout(function() {
								positionHintsFn(hintList, inputElem);
							}, 1, false);
						}

						setParentModel();
					});
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
						if (scope.hintableIndex !== null && scope.hintables.length > 1) {
							var newIndex;
							if (scope.hintableIndex === scope.hintables.length - 1) {
								newIndex = 0;
							} else {
								newIndex = scope.hintableIndex + 1;
							}
							selectRow(newIndex);
						}
                        e.preventDefault();
                        e.stopPropagation();
					} else if (e.keyCode === 38) {
						// key up
						if (scope.hintableIndex !== null && scope.hintables.length > 1) {
							var newIndex;
							if (scope.hintableIndex === 0) {
								newIndex = scope.hintables.length - 1;
							} else {
								newIndex = scope.hintableIndex - 1;
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