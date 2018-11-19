const bc = (() => {
  const BC = window.BroadcastChannel;
  if (!BC) {
    console.warn("The Broadcast Channel API is not available in your browser.");
    return { postMessage: () => {} };
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
const subscribe = stack => (event, handler, times = Infinity) => {
  if (!stack[event]) {
    stack[event] = [];
    stack.__times__[event] = [];
  }

  stack[event].push(handler);
  stack.__times__[event].push(+times || Infinity);

  return { event, handler };
};

/**
 * Unsubscribe from event.
 *
 * @param {string|object} event - Event from which to unsubscribe or the return
 *   object provided by `subscribe()`.
 * @param {function} handler - Handler function to be unsubscribed. It is
 *   ignored if `id` is provided.
 */
const unsubscribe = stack => (event, handler) => {
  if (!stack[event]) return;

  if (typeof event === "object") {
    event = event.event; // eslint-disable-line no-param-reassign
    handler = event.handler; // eslint-disable-line no-param-reassign
  }

  const id = stack[event].indexOf(handler);

  if (!stack[event]) return;
  if (id === -1 || id >= stack[event].length) return;

  stack[event].splice(id, 1);
  stack.__times__[event].splice(id, 1);
};

/**
 * Publish an event.
 *
 * @param {string} event - Event type to be published.
 * @param {any} news - The news to be published.
 */
const publish = (stack, isGlobal) => (event, news, isNoGlobalBroadcast) => {
  if (!stack[event]) return;

  const unsubscriber = unsubscribe(stack);

  stack[event].forEach((listener, i) => {
    listener(news);
    stack.__times__[event][i]--;
    if (stack.__times__[event][i] < 1) unsubscriber(event, listener);
  });

  if (isGlobal && !isNoGlobalBroadcast) {
    try {
      bc.postMessage({ event, news });
    } catch (error) {
      if (error instanceof DOMException) {
        console.warn(
          `Could not broadcast "${event}" globally. Payload is not clonable.`
        );
      } else {
        throw error;
      }
    }
  }
};

/**
 * Remove all event listeners and unset listening times
 * @curried
 * @param {object} stack - The bound event stack.
 * @return {function} - A function removing all event listeners.
 */
const clear = stack => () => {
  Object.keys(stack)
    .filter(eventName => eventName[0] !== "_")
    .forEach(eventName => {
      stack[eventName] = undefined;
      stack.__times__[eventName] = undefined;
      delete stack[eventName];
      delete stack.__times__[eventName];
    });
};

const createEmptyStack = () => ({ __times__: {} });

const createPubSub = (stack = createEmptyStack()) => {
  if (!stack.__times__) stack.__times__ = {};

  return {
    publish: publish(stack),
    subscribe: subscribe(stack),
    unsubscribe: unsubscribe(stack),
    clear: clear(stack),
    stack
  };
};

// Setup global pub-sub
const globalPubSubStack = createEmptyStack();
const globalPubSub = {
  publish: publish(globalPubSubStack, true),
  subscribe: subscribe(globalPubSubStack),
  unsubscribe: unsubscribe(globalPubSubStack),
  stack: globalPubSubStack
};
bc.onmessage = ({ data: { event, news } }) =>
  globalPubSub.publish(event, news, true);

export { globalPubSub, createPubSub };

export default createPubSub;
