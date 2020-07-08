/**
 * A new or fake broadcast channel.
 * @type {BroadcastChannel|object}
 */
const bc = (() => {
  try {
    return new window.BroadcastChannel('pub-sub-es');
  } catch (e) {
    return { postMessage: () => {} };
  }
})();

/**
 * Setup subscriber.
 * @param {object} stack - The bound event stack.
 * @return {function} - Curried function for subscribing to an event on a
 *   specific event stack.
 */
const subscribe = (stack) =>
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
  (event, handler, times = Infinity) => {
    if (!stack[event]) {
      stack[event] = [];
      stack.__times__[event] = [];
    }

    stack[event].push(handler);
    stack.__times__[event].push(+times || Infinity);

    return { event, handler };
  };

/**
 * Setup unsubscriber.
 * @param {object} stack - The bound event stack.
 * @return {function} - Curried function for unsubscribing an event from a
 *   specific event stack.
 */
const unsubscribe = (stack) =>
  /**
   * Unsubscribe from event.
   * @curried
   * @param {string|object} event - Event from which to unsubscribe or the return
   *   object provided by `subscribe()`.
   * @param {function} handler - Handler function to be unsubscribed. It is
   *   ignored if `id` is provided.
   */
  (event, handler) => {
    if (typeof event === 'object') {
      handler = event.handler; // eslint-disable-line no-param-reassign
      event = event.event; // eslint-disable-line no-param-reassign
    }

    if (!stack[event]) return;

    const id = stack[event].indexOf(handler);

    if (id === -1 || id >= stack[event].length) return;

    stack[event].splice(id, 1);
    stack.__times__[event].splice(id, 1);
  };

/**
 * Setup the publisher.
 * @param  {object} stack - The bound event stack.
 * @param  {boolean} isGlobal - If `true` event will be published globally.
 * @return {function} - Curried function for publishing an event on a specific
 *   event stack.
 */
const publish = (stack, isGlobal) =>
  /**
   * Public interface for publishing an event.
   * @curried
   * @param   {string} event - Event type to be published.
   * @param   {any} news - The news to be published.
   * @param   {boolean}  isNoGlobalBroadcast - If `true` event will *not* be
   *   broadcasted gloablly even if `isGlobal` is `true`.
   */
  (event, news, isNoGlobalBroadcast) => {
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
            `Could not broadcast '${event}' globally. Payload is not clonable.`
          );
        } else {
          throw error;
        }
      }
    }
  };

/**
 * Setup event clearer
 * @param {object} stack - The bound event stack.
 * @return {function} - A curried function removing all event listeners on a
 *   specific event stack.
 */
const clear = (stack) =>
  /**
   * Remove all event listeners and unset listening times
   * @curried
   */
  () => {
    Object.keys(stack)
      .filter((eventName) => eventName[0] !== '_')
      .forEach((eventName) => {
        stack[eventName] = undefined;
        stack.__times__[eventName] = undefined;
        delete stack[eventName];
        delete stack.__times__[eventName];
      });
  };

/**
 * Create a new empty stack object
 * @return {object} - An empty stack object.
 */
const createEmptyStack = () => ({ __times__: {} });

/**
 * Create a new pub-sub instance
 * @param {object} stack - Object to be used as the event stack.
 * @return {object} - A new pub-sub instance.
 */
const createPubSub = (stack = createEmptyStack()) => {
  if (!stack.__times__) stack.__times__ = {};

  return {
    publish: publish(stack),
    subscribe: subscribe(stack),
    unsubscribe: unsubscribe(stack),
    clear: clear(stack),
    stack,
  };
};

/**
 * Global pub-sub stack object
 * @type {object}
 */
const globalPubSubStack = createEmptyStack();
/**
 * Global pub-sub stack instance
 * @type {object}
 */
const globalPubSub = {
  publish: publish(globalPubSubStack, true),
  subscribe: subscribe(globalPubSubStack),
  unsubscribe: unsubscribe(globalPubSubStack),
  stack: globalPubSubStack,
};
bc.onmessage = ({ data: { event, news } }) =>
  globalPubSub.publish(event, news, true);

export { globalPubSub, createPubSub };

export default createPubSub;
