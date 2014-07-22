(function(angular) {
	var module = angular.module('net.enzey.autocomplete', ['ngSanitize']);

	var defaultTemplateUrl = 'AutoComplete/hintTemplate.html';
	module.run(function($templateCache) {
		var defaultTemplate = '<div nz-auto-complete-hint-text></div>';
		$templateCache.put(defaultTemplateUrl, defaultTemplate);
	});

	module.directive('nzAutoCompleteHintText', function($parse) {
		return {
			restrict: 'AE',
			link: {
				post: function(scope, element, attrs) {
					var inputText = scope.ngModelCtrl.$viewValue;
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
	});

	module.directive('nzAutoCompleteInclude', function($parse, $compile, $http, $templateCache) {
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
	});

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

	module.directive('nzAutoComplete', function($parse, $timeout) {
		return {
			scope: {},
			restrict: 'AE',
			template: function(element, attr) {
				element.addClass('autoComplete');

				var inputElem = element[0].querySelector('input');
				if (inputElem) {
					inputElem = angular.element(inputElem);
				} else {
					inputElem = angular.element('<input type="text"></input>');
				}
				inputElem.removeAttr('ng-model');
				inputElem.removeAttr('data-ng-model');
				var hintInputElem = inputElem.clone();

				inputElem.addClass('textEntry');
				inputElem.attr('ng-keypress', "keyPressEvent($event)");
				hintInputElem.addClass('hintBox');
				hintInputElem.attr('tabindex', '-1');
				hintInputElem.removeAttr('placeholder');

				var wrapper = angular.element('<div></div>');
				wrapper.append(hintInputElem);
				wrapper.append(angular.element('<iframe></iframe>'));
				wrapper.append(inputElem);
				wrapper.append(angular.element('<div class="loadingIndicator"></div>'));

				element.empty();
				return wrapper[0].innerHTML;
			},
			compile: function ($element, $attrs) {
				var inputElem =     angular.element($element[0].querySelector('.textEntry'));
				var hintInputElem = angular.element($element[0].querySelector('.hintBox'));

				var ngModelName = '$parent.' + $attrs.ngModel;
				inputElem.attr('ng-model', ngModelName);

				var templateUrl = angular.isDefined($attrs.templateUrl) ? $attrs.templateUrl : "'" + defaultTemplateUrl + "'";
				var hintList = angular.element('\
					<div class="scrollerContainer">\
						<iframe></iframe>\
						<div class="scroller" ng-hide="hints.length < 2">\
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
				');
				$element.append(hintList);

				var displayHint = false;
				return {
					pre: function(scope, element, attrs) {
						scope.hints = [];

						scope.keyPressEvent = function(e) {
							if (scope.selectedHintIndex !== null && (e.keyCode === 13 || e.keyCode === 9)) {
								scope.select(scope.selectedHintIndex);
							} else if (e.keyCode === 40) {
								// key down
								if (scope.selectedHintIndex !== null && scope.hints.length > 1) {
									var newIndex;
									if (scope.selectedHintIndex === scope.hints.length - 1) {
										newIndex = 0;
									} else {
										newIndex = scope.selectedHintIndex + 1;
									}
									scope.selectRow(newIndex);
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
									scope.selectRow(newIndex);
								}
								e.preventDefault();
								e.stopPropagation();
							}
						};

						scope.displayPath = null;
						if (angular.isDefined(attrs.displayPath)) {
							scope.displayPath = attrs.displayPath;
						}

						scope.noResultsText = "No Results";
						if (angular.isDefined(attrs.noResultsText)) {
							scope.noResultsText = attrs.noResultsText;
						}

						scope.hoverOver = function(selectedIndex) {
							scope.selectRow(selectedIndex);
						};

					},
					post: function (scope, element, attrs) {
						var modelCtrl = angular.element(inputElem).controller('ngModel');
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
						var positionHintsFn = function(){};
						if (angular.isDefined(attrs.positionHintsFn)) {
							var customPositionFunction = $parse(attrs.positionHintsFn)(scope.$parent);
							if (angular.isFunction(customPositionFunction)) {
								positionHintsFn = customPositionFunction;
							}
						}

						var getResultsFn = $parse(attrs.getResultsFn)(scope.$parent);
						if (!getResultsFn || !typeof getResultsFn === 'function') {
							throw 'A function that returns results is required!';
						}

						var minimumChars = +$parse(attrs.minChar)(scope.$parent);
						if (isNaN(minimumChars)) {minimumChars = 1;}
						if (minimumChars === 0) {
							getResultsFn( modelCtrl.$viewValue ).then(displaySuggestions);
						}

						var silentPeriod = +$parse(attrs.silentPeriod)(scope.$parent);
						if (isNaN(silentPeriod)) {silentPeriod = 250;}

						var isSelectionRequired = false;
						if (angular.isDefined(attrs.selectionRequired) && attrs.selectionRequired === 'true') {
							isSelectionRequired = true;
						}

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
								var hints =   angular.element(scroller).children();

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
								}, 0, false);

								scope.selectedHintIndex = index;
								if (displayHint === true) {
									var hintDisplayText = getHintDisplay();
									var userInputString = inputElem.val();
									hintInputElem.val(userInputString + hintDisplayText.slice(userInputString.length, hintDisplayText.length));
								}
							}
						};

						scope.select = function(selectedIndex) {
							scope.selectedHintIndex = selectedIndex;
							var selectedObj = scope.hints[scope.selectedHintIndex];
							$parse(ngModelName).assign(scope, selectedObj);
							inputElem[0].focus();
						};

						var displaySuggestions = function(hintResults) {
							scope.hints = hintResults;
							if (!scope.hints) {scope.hints = [];}

							if (scope.hints.length > 0) {
								var regex = new RegExp('^' + modelCtrl.$viewValue, 'i');
								var objParser = null;
								if (scope.displayPath !== null) {
									objParser = $parse(scope.displayPath);
								}
								scope.hints.forEach(function(hintObj) {
									if (!displayHint) {return;}

									if (objParser) {
										displayHint = displayHint && regex.test(objParser(hintObj));
									} else {
										displayHint = displayHint && regex.test(hintObj);
									}
								});
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
										if (angular.isDefined(scope.displayPath)) {
											selectedStringValue = $parse(scope.displayPath)(selectedStringValue)
										}
										if (new RegExp(selectedStringValue, 'gi').test(value)) {
											result = selectedObj;
										}
									}
								} else {
									if (minimumChars <= value.length) {
										result = value;
									}
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
							displayHint = inputElem[0].scrollWidth <= inputElem[0].clientWidth;
							//setParentModel();

							scope.selectedHintIndex = null;
							scope.hints = [];
							element.addClass('loading');
							element.removeClass('noResults');
							// Stop any pending requests

							$timeout.cancel(pendingResultsFunctionCall);

							if (modelCtrl.$viewValue && minimumChars <= modelCtrl.$viewValue.length) {
								pendingResultsFunctionCall = $timeout(function() {
									element.removeClass('loading');
									getResultsFn( modelCtrl.$viewValue ).then(displaySuggestions);
								}, silentPeriod, true);
							} else {
								element.removeClass('loading');
							}
						};

						inputElem.bind("focus", function() {
							if (positionHintsFn && scope.hints) {
								$timeout(function() {
									positionHintsFn(hintList, inputElem);
								}, 1, false);
							}
						});

					}
				}
			}
		};
	});

})(angular);