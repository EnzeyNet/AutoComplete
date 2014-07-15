AutoComplete
============

Native AngularJS &amp; CSS AutoComplete with trailing hint text

Angular Module: net.enzey.autocomplete

Directive Name: nzAutoComplete

Live Example: http://EnzeyNet.github.io/AutoComplete

| required | directive params | description |
| ------------- | ------------- | ------------- |
| true | ng-model | The model value on the scope to set the selected input to.  |
| false | display-path | The path within the returned objects from the getResultsFn to get to the hint text of the object. |
| false | selection-required | If the input must exactly match a hint text. |
| false | min-char | The minimum number of input characters needed to set the model and call get-results-fn. Leading and trailing spaces are not counted toward the entered character count. |
| false | silent-period | The amount of time to wait for no input before before calling get-results-fn. Default: 250 |
| false | no-results-text | The text to display when no results are found. Default: 'No Results' |
| true | get-results-fn | getResultsFn(inputText) - A promise that returns the hints to display. |
| false | position-hints-fn | positionHintsFn(hintListElem, inputElem) - Function that allows custom positioning of the hint results.  |


```
<div nz-auto-complete get-results-fn="_resultsFunctionOnController_" ng-model="modelLocation"></div>
```
