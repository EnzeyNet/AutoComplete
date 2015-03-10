(function(angular) {
	var module = angular.module('net.enzey.autocomplete', [
		'net.enzey.services',
		'ngSanitize'
	]);

	var isDefined = function(value) {
		if (value !== null & value !== undefined) {
			if (angular.isNumber(value) && !isNaN(value)) {
				return true;
			}
			if (angular.isString(value) && value.trim() !== '') {
				return true;
			}
		}
		return false;
	};

	escapeRegexSpecialChars = function(str) {
		if (angular.isString(str)) {
			return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
		}
		return '';
	};

	module.provider('nzAutoCompleteConfig', function () {
		var positionHintsFn = function(){};
		var minimumChars = 1;
		var silentPeriod = 250;
		var isSelectionRequired = false;
		var noResultsOnSelect = false;

		this.setPositionHintsFn = function(_positionHintsFn) {
			if (angular.isFunction(_positionHintsFn)) {
				positionHintsFn = _positionHintsFn;
			}
		};
		this.setMinimumChars = function(_minimumChars) {
			minimumChars = +_minimumChars;
		};
		this.setSilentPeriod = function(_silentPeriod) {
			silentPeriod = +_silentPeriod;
		};
		this.isSelectionRequired = function(_isSelectionRequired) {
			isSelectionRequired = !!_isSelectionRequired;
		};
		this.isNoResultsOnSelect = function(_noResultsOnSelect) {
			noResultsOnSelect = !!_noResultsOnSelect;
		};

		this.$get = function() {
			return {
				getPositionHintsFn: function() {
					return positionHintsFn;
				},
				getMinimumChars: function() {
					return minimumChars;
				},
				getSilentPeriod: function() {
					return silentPeriod;
				},
				isSelectionRequired: function() {
					return isSelectionRequired;
				},
				isNoResultsOnSelect: function() {
					return noResultsOnSelect;
				},
			};
		};
	});

	var defaultTemplateUrl = 'AutoComplete/hintTemplate.html';
	module.run(['$templateCache', function($templateCache) {
		var defaultTemplate = '<div nz-auto-complete-hint-text></div>';
		$templateCache.put(defaultTemplateUrl, defaultTemplate);
	}]);

	module.directive('nzAutoCompleteHintText', ['$parse', function($parse) {
		return {
			restrict: 'AE',
			link: {
				post: function(scope, element, attrs) {
					var inputText = scope.ngModelCtrl.$viewValue;
					inputText = escapeRegexSpecialChars(inputText);
					var hintText = scope.displayPath === null ? 'hint' : 'hint.' + scope.displayPath;
					var highlightRegExp =  new RegExp('(' + inputText +  ')', 'gi');
					var text = $parse(hintText)(scope);
					if (text) {
						var markedText = text.replace(highlightRegExp, '<mark>$1</mark>');

						element[0].innerHTML = markedText;
					}
				}
			}
		};
	}]);

	module.directive('nzAutoCompleteInclude', ['$parse', '$compile', '$http', '$templateCache', function($parse, $compile, $http, $templateCache) {
		return {
			restrict: 'AE',
			compile: function() {
				var directiveName = this.name;
				return function (scope, element, attr) {
					var templateUrl = $parse(attr[directiveName])(scope);
					$http.get(templateUrl, {cache: $templateCache})
					.success(function(html) {
						element.replaceWith($compile(html)(scope));
					});
				}
			}
		};
	}]);

	var positionAndAddScrollBar = function(hintList, inputElem) {
		hintList.css('display', 'block');
		var scroller = hintList.find('div')[0];
		if (scroller.scrollHeight > scroller.clientHeight) {
			angular.element(scroller).css('overflow-y', 'scroll');
		} else {
			angular.element(scroller).css('overflow-y', '');
		}
		hintList.css('display', '');
	};

	module.directive('nzAutoComplete', ['$parse', '$timeout', '$compile', 'nzAutoCompleteConfig', 'nzService', function($parse, $timeout, $compile, nzAutoCompleteConfig, nzService) {
		return {
			scope: {},
			restrict: 'AE',
			controller: ['$scope', function($scope) {
				$scope.keyPressEvent = function(e) {
					if ($scope.selectedHintIndex !== null && (e.keyCode === 13 || e.keyCode === 9)) {
						$scope.select($scope.selectedHintIndex);
					} else if (e.keyCode === 40) {
						// key down
						if ($scope.selectedHintIndex !== null && $scope.hints.length > 1) {
							var newIndex;
							if ($scope.selectedHintIndex === $scope.hints.length - 1) {
								newIndex = 0;
							} else {
								newIndex = $scope.selectedHintIndex + 1;
							}
							$scope.selectRow(newIndex);
						}
						e.preventDefault();
						e.stopPropagation();
					} else if (e.keyCode === 38) {
						// key up
						if ($scope.selectedHintIndex !== null && $scope.hints.length > 1) {
							var newIndex;
							if ($scope.selectedHintIndex === 0) {
								newIndex = $scope.hints.length - 1;
							} else {
								newIndex = $scope.selectedHintIndex - 1;
							}
							$scope.selectRow(newIndex);
						}
						e.preventDefault();
						e.stopPropagation();
					}
				};
			}],
			compile: function ($element, $attrs) {
				$element.addClass('autoComplete');

				var inputElem = $element[0].querySelector('input');
				if (inputElem) {
					inputElem = angular.element(inputElem);
				} else {
					inputElem = angular.element('<input type="text"></input>');
				}
				$element.empty();
				inputElem.removeAttr('ng-model');
				inputElem.removeAttr('data-ng-model');
				var hintInputElem = inputElem.clone();

				inputElem.addClass('textEntry');
				hintInputElem.addClass('hintBox');
				hintInputElem.attr('tabindex', '-1');
				hintInputElem.removeAttr('placeholder');

				var ngModelName = $attrs.ngModel;
				inputElem.attr('ng-model', ngModelName);

				var wrapper = angular.element('<div></div>');
				$element.append(hintInputElem);
				$element.append(angular.element('<iframe></iframe>'));
				$element.append(inputElem);
				$element.append(angular.element('<div class="loadingIndicator"></div>'));

				return {
					pre: function(scope, element, attrs) {
						scope.hints = [];

						var templateUrl = isDefined(attrs.templateUrl) ? attrs.templateUrl : "'" + defaultTemplateUrl + "'";
						var hintList = $compile('\
							<div class="scrollerContainer">\
								<iframe></iframe>\
								<div class="scroller" ng-hide="hints.length < 1">\
									<div class="hint"\
											ng-repeat="hint in hints"\
											ng-click="select($index)"\
											ng-mouseover="hoverOver($index)"\
											ng-class="{selectedHint: $index === selectedHintIndex}">\
										<div nz-auto-complete-include="' + templateUrl + '"></div>\
									</div>\
								</div>\
								<div class="scroller noResults">\
									<span class="noResults hint">{{noResultsText}}</span>\
								</div>\
							</div>\
						')(scope);
						element.append(hintList);

						scope.displayPath = null;
						if (isDefined(attrs.displayPath)) {
							scope.displayPath = attrs.displayPath;
						}

						scope.noResultsText = "No Results";
						if (isDefined(attrs.noResultsText)) {
							scope.noResultsText = attrs.noResultsText;
						}

						scope.hoverOver = function(selectedIndex) {
							scope.selectRow(selectedIndex);
						};

					},
					post: function (scope, element, attrs) {
						var inputElem     = angular.element(element[0].querySelector('.textEntry'));
						var hintInputElem = angular.element(element[0].querySelector('.hintBox'));
						var hintList      = angular.element(element[0].querySelector('.scrollerContainer'));

						var modelCtrl = inputElem.controller('ngModel');
						scope.ngModelCtrl = modelCtrl;

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

						var getResultsFn = $parse(attrs.getResultsFn)(scope.$parent);
						if (!getResultsFn || !typeof getResultsFn === 'function') {
							throw 'A function that returns results is required!';
						}

						var positionHintsFn = nzAutoCompleteConfig.getPositionHintsFn();
						if (isDefined(attrs.positionHintsFn)) {
							var customPositionFunction = $parse(attrs.positionHintsFn)(scope.$parent);
							if (angular.isFunction(customPositionFunction)) {
								positionHintsFn = customPositionFunction;
							}
						}

						var minimumChars = +$parse(attrs.minChar)(scope.$parent);
						if (isNaN(minimumChars)) {
							minimumChars = nzAutoCompleteConfig.getMinimumChars();
						}
						if (minimumChars === 0) {
							getResultsFn( modelCtrl.$viewValue ).then(displaySuggestions);
						}

						var silentPeriod = +$parse(attrs.silentPeriod)(scope.$parent);
						if (isNaN(silentPeriod)) {
							silentPeriod = nzAutoCompleteConfig.getSilentPeriod();
						}

						var isSelectionRequired = nzAutoCompleteConfig.isSelectionRequired();
						if (attrs.selectionRequired === '' || attrs.selectionRequired === 'true' || scope.displayPath) {
							isSelectionRequired = true;
						}

						var noResultsOnSelect = nzAutoCompleteConfig.isNoResultsOnSelect();
						if (attrs.noResultsOnSelect === '' || attrs.noResultsOnSelect === 'true') {
							noResultsOnSelect = true;
						}
						var ignoreNextRestuls = false;

						var getHintDisplay = function() {
							var hintDisplayObj = scope.hints[scope.selectedHintIndex];
							if (scope.displayPath !== null) {
								return $parse(scope.displayPath)(hintDisplayObj);
							}
							return hintDisplayObj;
						};
						scope.selectRow = function(index) {
							if (index === scope.selectedHintIndex) {return;}

							if (0 <= index && index < scope.hints.length) {
								var scroller = element[0].querySelector('.scroller');

								scope.selectedHintIndex = index;

								//var displayHint = !(inputElem[0].scrollWidth > inputElem[0].clientWidth);
								var inputStyledDiv  = nzService.copyComputedStyles(angular.element('<div></div>')[0], inputElem[0]);
								inputStyledDiv = angular.element(inputStyledDiv);
								inputStyledDiv.css('white-space', 'nowrap');
								inputStyledDiv.text(inputElem.val());
								inputStyledDiv.css('opacity', 0);
								inputElem.parent().append(inputStyledDiv);

								var displayHint = inputStyledDiv[0].scrollWidth <= inputStyledDiv[0].clientWidth;
								inputStyledDiv.remove();

								if (displayHint) {
									var hintDisplayText = getHintDisplay();
									var regex = new RegExp('^' + escapeRegexSpecialChars(modelCtrl.$viewValue), 'i');
									var objParser = objParser = $parse(scope.displayPath);
									if (scope.displayPath !== null) {
										var objParser = objParser = $parse(scope.displayPath);
										displayHint = regex.test(objParser(hintDisplayText));
									} else {
										displayHint = regex.test(hintDisplayText);
									}
								}

								if (displayHint === true) {
									var userInputString = inputElem.val();
									hintInputElem.val(userInputString + hintDisplayText.slice(userInputString.length, hintDisplayText.length));
								} else {
									hintInputElem.val('');
								}

								$timeout(function() {
									hintList.css('display', 'block');
									var selectedHint = scroller.querySelector('.selectedHint');
									if (selectedHint.offsetTop < scroller.scrollTop) {
										// scrollUp
										scroller.scrollTop = selectedHint.offsetTop;
									} else if (selectedHint.offsetTop + selectedHint.clientHeight > scroller.scrollTop + scroller.clientHeight) {
										// scrollDown
										scroller.scrollTop = selectedHint.offsetTop + selectedHint.clientHeight - scroller.clientHeight;
									}
									hintList.css('display', '');
								}, 50, false);

							}
						};

						scope.select = function(selectedIndex) {
							scope.selectedHintIndex = selectedIndex;
							var selectedObj = scope.hints[scope.selectedHintIndex];
							$parse(ngModelName).assign(scope.$parent, selectedObj);
							inputElem[0].focus();
							scope.$emit('AutoCompleteSelect', selectedObj);
							if (noResultsOnSelect) {
								ignoreNextRestuls = true;
							}
						};

						var displaySuggestions = function(hintResults) {
							scope.hints = hintResults;
							if (!scope.hints) {scope.hints = [];}

							if (scope.hints.length > 0) {
								scope.selectRow(0);
							} else {
								element.addClass('noResults');
							}

							if (positionHintsFn) {
								$timeout(function() {
									if (!positionHintsFn(hintList, inputElem)) {
										positionAndAddScrollBar(hintList, inputElem);
									}
								}, 0, false);
							}

						};

						modelCtrl.$parsers.push(function(value) {
							hintInputElem.val('');
							if (value) {
								var result;
								if (isSelectionRequired) {
									var selectedObj = scope.hints[scope.selectedHintIndex];
									if (scope.hints && scope.hints.length > 0) {
										var selectedStringValue = selectedObj;
										if (isDefined(scope.displayPath)) {
											selectedStringValue = $parse(scope.displayPath)(selectedStringValue)
										}
										selectedStringValue = escapeRegexSpecialChars(selectedStringValue);
										if (new RegExp(selectedStringValue, 'gi').test(value)) {
											result = selectedObj;
										}
									}
								} else {
									result = value;
								}
								modelCtrl.$setValidity('hasSelection', result ? true : false);
							}
							getResults();
							return result;
						});
						modelCtrl.$formatters.push(function(value) {
							$timeout(getResults, 0, true);
							hintInputElem.val('');
							if (!value) {return;}
							var result;
							if (scope.displayPath) {
								result = $parse(scope.displayPath)(value);
							} else {
								result = value;
							}
							return result;
						});

						var pendingResultsFunctionCall;
						var getResults = function() {
							//setParentModel();

							scope.selectedHintIndex = null;
							scope.hints = [];
							element.removeClass('noResults');
							// Stop any pending requests

							$timeout.cancel(pendingResultsFunctionCall);

							if (ignoreNextRestuls) {
								ignoreNextRestuls = false;
							} else {
								element.addClass('loading');
								if (minimumChars === 0 || (angular.isString(modelCtrl.$viewValue) && minimumChars <= modelCtrl.$viewValue.length)) {
									pendingResultsFunctionCall = $timeout(function() {
										element.removeClass('loading');
										getResultsFn( modelCtrl.$viewValue ).then(displaySuggestions);
									}, silentPeriod, true);
								} else {
									element.removeClass('loading');
								}
							}
						};

						inputElem.bind("focus", function() {
							if (positionHintsFn && scope.hints) {
								$timeout(function() {
									positionHintsFn(hintList, inputElem);
								}, 1, false);
							}
						});

						inputElem.on('keydown', function(e) {
							scope.keyPressEvent(e);
							scope.$apply();
						});
					}
				}
			}
		};
	}]);

})(angular);