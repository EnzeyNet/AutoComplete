AutoComplete
============

Native AngularJS &amp; CSS AutoComplete with trailing hint text

Angular Module: net.enzey.autocomplete

Directive Name: nzAutoComplete


| required | directive params | description |
| ------------- | ------------- | ------------- |
| true | ng-model  | The model value on the scope to set the selected input to.  |
| false | display-path  | The path within the returned objects from the getResultsFn to get to the hint text of the object. |
| false | is-selection-required  | If the input must exactly match a hint text. |
| true | get-results-fn  | getResultsFn(inputText) - A promise that returns the hints to display. |
| false | position-hints-fn  | positionHintsFn(hintListElem, inputElem) - Function that allows custom positioning of the hint results.  |


```
<div nz-auto-complete get-results-fn="_resultsFunctionOnController_" ng-model="modelLocation"></div>
```
