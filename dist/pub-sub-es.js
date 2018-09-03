(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.createPubSub = {})));
}(this, (function (exports) { 'use strict';

  /**
   * Subscribe to an event.
   * @param {string} event - Event name to subscribe to.
   * @param {function} callback - Function to be called when event of type
   *   `event` is published.
   * @param {number} times - Number of times the callback should called for the
   *   given event. The event listener will automatically be unsubscribed once
   *   the number of calls exceeds `times`.
   * @return {object} Object with the event name and the callback. The object
   *   can be used to unsubscribe.
   */
  var subscribe = function (stack) { return function (event, callback, times) {
    if ( times === void 0 ) times = Infinity;

    if (!stack[event]) {
      stack[event] = [];
      stack.__times__[event] = [];
    }

    stack[event].push(callback);
    stack.__times__[event].push(parseInt(times, 10) || Infinity);

    return { event: event, callback: callback };
  }; };

  /**
   * Unsubscribe from event.
   *
   * @param {string|object} event - Event from which to unsubscribe or the return
   *   object provided by `subscribe()`.
   * @param {function} callback - Callback function to be unsubscribed. It is
   *   ignored if `id` is provided.
   */
  var unsubscribe = function (stack) { return function (event, callback) {
    if (!stack[event]) { return; }

    if (typeof event === 'object') {
      event = event.event; // eslint-disable-line no-param-reassign
      callback = event.callback; // eslint-disable-line no-param-reassign
    }

    var id = stack[event].indexOf(callback);

    if (!stack[event]) { return; }
    if (id === -1 || id >= stack[event].length) { return; }

    stack[event].splice(id, 1);
    stack.__times__[event].splice(id, 1);
  }; };

  /**
   * Publish an event.
   *
   * @param {string} event - Event type to be published.
   * @param {any} news - The news to be published.
   */
  var publish = function (stack) { return function (event, news) {
    if (!stack[event]) { return; }

    var unsubscriber = unsubscribe(stack);

    stack[event].forEach(function (listener, i) {
      listener(news);
      if (!(stack.__times__[event][i] -= 1)) { unsubscriber(event, listener); }  // eslint-disable-line
    });
  }; };

  var createPubSub = function (stack) {
    if ( stack === void 0 ) stack = { __times__: {} };

    return ({
    publish: publish(stack),
    subscribe: subscribe(stack),
    unsubscribe: unsubscribe(stack),
    stack: stack,
  });
  };

  var globalPubSub = createPubSub();

  exports.globalPubSub = globalPubSub;
  exports.default = createPubSub;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
