(function (angular) {
    "use strict";

	var module = angular.module('net.enzey.services', []);

	module.service('nzService', ['$window', '$document', '$timeout', function ($window, $document, $timeout) {

		var getChildElems = function(elem) {
			var childElems = [];
			elem = angular.element(elem);
			var children = elem.children();
			for (var i=0; i < children.length; i++) {
				getChildElems(children[i]).forEach(function(childElem) {
					childElems.push(childElem);
				});
			}
			childElems.push(elem[0]);

			return childElems;
		};

		this.registerClickAwayAction = function(clickAwayAction) {
			var wrappedClickAwayAction = null;
			var parentElems = [];
			for (var i = 1; i < arguments.length; i++) {
				parentElems.push(arguments[i]);
			}
			wrappedClickAwayAction  = function(event) {
				var allElements = [];
				parentElems.forEach(function(parentElem) {
					getChildElems(parentElem).forEach(function (elem) {
						allElements.push(elem);
					});
				});
				if (allElements.indexOf(event.target) === -1) {
					$document.off('click', wrappedClickAwayAction);
					clickAwayAction(event);
				}
			};
			$timeout(function() {
				$document.on('click', wrappedClickAwayAction);
			});
		};

		var getJsStyleName = function(styleName) {
			var firstCharacterRegex = new RegExp('^.');
			styleName = styleName.split('-');
			for (var i = 1; i < styleName.length; i++) {
				styleName[i] = styleName[i].replace(firstCharacterRegex, styleName[i][0].toUpperCase());
			}
			return styleName.join('');
		};

		this.copyComputedStyles = function(toElement, fromElement) {
			var comStyle = $window.getComputedStyle(fromElement);
			for (var i = 0; i < comStyle.length; i++) {
				var styleName = getJsStyleName(comStyle[i]);
				toElement.style[ styleName ] = comStyle[ styleName ];
			}

			return toElement;
		}

		var eventMatchers = {
			'HTMLEvents': {
				isEvent: function(eventName) {
					return /^(?:load|unload|abort|error|select|change|submit|reset|focus|blur|resize|scroll)$/.test(eventName);
				},
				fireEvent: function(element, eventName, options) {
					var oEvent = null;
					if ($document[0].createEvent) {
						oEvent = document.createEvent('HTMLEvents');
						oEvent.initEvent(eventName, options.bubbles, options.cancelable);
						element.dispatchEvent(oEvent);
					} else {
						options.clientX = options.pointerX;
						options.clientY = options.pointerY;
						var evt = $document[0].createEventObject();
						oEvent = extend(evt, options);
						element.fireEvent('on' + eventName, oEvent);
					}
				}
			},
			'MouseEvents': {
				isEvent: function(eventName) {
					return /^(?:click|dblclick|mouse(?:down|up|over|move|out))$/.test(eventName);
				},
				fireEvent: function(element, eventName, options) {
					var oEvent = null;
					if ($document[0].createEvent) {
						oEvent = document.createEvent('MouseEvents');
						oEvent.initMouseEvent(eventName, options.bubbles, options.cancelable, $document[0].defaultView,
						options.button, options.pointerX, options.pointerY, options.pointerX, options.pointerY,
						options.ctrlKey, options.altKey, options.shiftKey, options.metaKey, options.button, options.element);
						element.dispatchEvent(oEvent);
					} else {
						options.clientX = options.pointerX;
						options.clientY = options.pointerY;
						var evt = $document[0].createEventObject();
						oEvent = extend(evt, options);
						element.fireEvent('on' + eventName, oEvent);
					}
				}
			}
		};
		var defaultOptions = {
			pointerX: 0,
			pointerY: 0,
			button: 0,
			ctrlKey: false,
			altKey: false,
			shiftKey: false,
			metaKey: false,
			bubbles: true,
			cancelable: true
		};

		this.emulateEvent = function simulate(element, eventName) {
			var options = arguments[2] ? arguments[2] : angular.copy(defaultOptions);
			options.element = options.element ? options.element : element
			var fireEventFn = null;

			for (var name in eventMatchers) {
				if (eventMatchers[name].isEvent(eventName)) {
					fireEventFn = eventMatchers[name].fireEvent;
					break;
				}
			}

			if (!fireEventFn) {
				throw new SyntaxError('Only HTMLEvents and MouseEvents interfaces are supported');
			}

			fireEventFn(element, eventName, options);
		};

	}]);

	module.directive('nzTranscludedInclude', function() {
		return {
			restrict: "A",
			transclude: true,
			templateUrl: function(element, attrs) {
				return attrs[this.name];
			},
		}
	});

	module.directive('nzFakeDocClick', ['$document', '$timeout', 'nzService', function($document, $timeout, nzService) {
		return {
			link: function(scope, $element, $attrs) {
				$element.on('click', function(event) {
					$timeout(function() {
						nzService.emulateEvent($document[0].body, 'click', event);
					}, 0, false);
				});
			},
		}
	}]);

	module.directive('nzSquelchEvent', ['$parse', function($parse) {
		return {
			compile: function ($element, $attrs) {
				var directiveName = this.name;
				var events = $attrs[directiveName];
				events = events.split(',');
				events = events.map(function(eventType) {return eventType.trim()});

				var squelchCondition = $attrs['squelchCondition'];

				return function(scope, element, attrs) {
					var squelchEvent = true;
					if (angular.isDefined(squelchCondition)) {
						squelchEvent = $parse(squelchCondition)(scope);
					}
					if (squelchEvent) {
						events.forEach(function(eventType) {
							element.bind(eventType, function(event) {
								event.stopPropagation();
							});
						});
					}
				};
			}
		};
	}]);

})(angular);