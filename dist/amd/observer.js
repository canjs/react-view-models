/*react-view-model@0.3.0#observer*/
define(function (require, exports, module) {
    var Observation = require('can-observation');
    var assign = require('can-util/js/assign');
    function Observer() {
        Observation.call(this, null, null, () => this.listener && this.listener());
    }
    Observer.prototype = Object.create(Observation.prototype);
    Observer.prototype.constructor = Observer;
    assign(Observer.prototype, {
        start: function () {
            this.value = Date.now();
        },
        startLisening: function (listener) {
            this.listener = listener || this.listener;
            this.bound = true;
            this.oldObserved = this.newObserved || {};
            this.ignore = 0;
            this.newObserved = {};
            Observation.observationStack.push(this);
        },
        stopListening: function () {
            if (Observation.observationStack[Observation.observationStack.length - 1] !== this) {
                var index = Observation.observationStack.indexOf(this);
                if (index === -1) {
                    throw new Error('Async observations stopped out of order.');
                }
                Observation.observationStack.splice(index, 1);
                Observation.observationStack.push(this);
            }
            Observation.observationStack.pop();
            this.updateBindings();
        }
    });
    module.exports = Observer;
});