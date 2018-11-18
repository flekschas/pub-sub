(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (factory((global.createPubSub = {})));
}(this, (function (exports) { 'use strict';

  var bc = (function () {
    var BC = window.BroadcastChannel;
    if (!BC) {
      console.warn("The Broadcast Channel API is not available in your browser.");
      return { postMessage: function () {} };
    }
    return new BC("pub-sub-es");
  })();

  /**
   * Subscribe to an event.
   * @param {string} event - Event name to subscribe to.
   * @param {function} handler - Function to be called when event of type
   *   `event` is published.
   * @param {number} times - Number of times the handler should called for the
   *   given event. The event listener will automatically be unsubscribed once
   *   the number of calls exceeds `times`.
   * @return {object} Object with the event name and the handler. The object
   *   can be used to unsubscribe.
   */
  var subscribe = function (stack) { return function (event, handler, times) {
    if ( times === void 0 ) times = Infinity;

    if (!stack[event]) {
      stack[event] = [];
      stack.__times__[event] = [];
    }

    stack[event].push(handler);
    stack.__times__[event].push(+times || Infinity);

    return { event: event, handler: handler };
  }; };

  /**
   * Unsubscribe from event.
   *
   * @param {string|object} event - Event from which to unsubscribe or the return
   *   object provided by `subscribe()`.
   * @param {function} handler - Handler function to be unsubscribed. It is
   *   ignored if `id` is provided.
   */
  var unsubscribe = function (stack) { return function (event, handler) {
    if (!stack[event]) { return; }

    if (typeof event === "object") {
      event = event.event; // eslint-disable-line no-param-reassign
      handler = event.handler; // eslint-disable-line no-param-reassign
    }

    var id = stack[event].indexOf(handler);

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
  var publish = function (stack, isGlobal) { return function (event, news, isNoGlobalBroadcast) {
    if (!stack[event]) { return; }

    var unsubscriber = unsubscribe(stack);

    stack[event].forEach(function (listener, i) {
      listener(news);
      stack.__times__[event][i]--;
      if (stack.__times__[event][i] < 1) { unsubscriber(event, listener); }
    });

    if (isGlobal && !isNoGlobalBroadcast) {
      try {
        bc.postMessage({ event: event, news: news });
      } catch (error) {
        if (error instanceof DOMException) {
          console.warn(
            ("Could not broadcast \"" + event + "\" globally. Payload is not clonable.")
          );
        } else {
          throw error;
        }
      }
    }
  }; };

  var createEmptyStack = function () { return ({ __times__: {} }); };

  var createPubSub = function (stack) {
    if ( stack === void 0 ) stack = createEmptyStack();

    if (!stack.__times__) { stack.__times__ = {}; }

    return {
      publish: publish(stack),
      subscribe: subscribe(stack),
      unsubscribe: unsubscribe(stack),
      stack: stack
    };
  };

  // Setup global pub-sub
  var globalPubSubStack = createEmptyStack();
  var globalPubSub = {
    publish: publish(globalPubSubStack, true),
    subscribe: subscribe(globalPubSubStack),
    unsubscribe: unsubscribe(globalPubSubStack),
    stack: globalPubSubStack
  };
  bc.onmessage = function (ref) {
      var ref_data = ref.data;
      var event = ref_data.event;
      var news = ref_data.news;

      return globalPubSub.publish(event, news, true);
  };

  exports.globalPubSub = globalPubSub;
  exports.createPubSub = createPubSub;
  exports.default = createPubSub;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
