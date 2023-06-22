/**
 * A new or fake broadcast channel.
 * @type {BroadcastChannel}
 */
const bc = (() => {
  try {
    return new window.BroadcastChannel('pub-sub-es');
  } catch (e) {
    return { postMessage: () => {} };
  }
})();

/**
 * Get final event name
 * @param {string} eventName - Event name to be adjusted
 * @param {Boolean} caseInsensitive - If `true`, `eventName` will be lowercased
 */
const getEventName = (eventName, caseInsensitive) =>
  caseInsensitive ? eventName.toLowerCase() : eventName;

/**
 * @callback Handler - Event handler function
 * @param {any} news - Event data
 * @return {void}
 */

/**
 * @typedef {object} Subscription - Event subscription object
 * @property {string} event - Event name
 * @property {Handler} handler - Event handler
 */

/**
 * @callback Subscribe
 * @param {string} event - Event name to subscribe to.
 * @param {Handler} handler - Function to be called when event of type `event` is published.
 * @param {number} times - Number of times the handler should called for the given event. The event listener will automatically be unsubscribed once the number of calls exceeds `times`.
 * @return {Subscription} Object with the event name and the handler. The object can be used to unsubscribe.
 */

/**
 * Setup subscriber.
 * @param {Stack} stack - The bound event stack.
 * @return {Subscribe} Curried function for subscribing to an event on a specific event stack.
 */
const subscribe =
  (stack, { caseInsensitive } = {}) =>
  (event, handler, times = Infinity) => {
    const e = getEventName(event, caseInsensitive);

    if (!stack[e]) {
      stack[e] = [];
      stack.__times__[e] = [];
    }

    stack[e].push(handler);
    stack.__times__[e].push(+times || Infinity);

    return { event: e, handler };
  };

/**
 * @callback Unsubscribe
 * @param {string|Subscription} event - Event from which to unsubscribe or the return object provided by `subscribe()`.
 * @param {Handler} handler - Handler function to be unsubscribed. It is ignored if `id` is provided.
 * @returns {void}
 */

/**
 * Setup unsubscriber.
 * @param {Stack} stack - The bound event stack.
 * @return {Unsubscribe} Curried function for unsubscribing an event from a specific event stack.
 */
const unsubscribe =
  (stack, { caseInsensitive } = {}) =>
  (event, handler) => {
    if (typeof event === 'object') {
      handler = event.handler; // eslint-disable-line no-param-reassign
      event = event.event; // eslint-disable-line no-param-reassign
    }

    const e = getEventName(event, caseInsensitive);

    if (!stack[e]) return;

    const id = stack[e].indexOf(handler);

    if (id === -1 || id >= stack[e].length) return;

    stack[e].splice(id, 1);
    stack.__times__[e].splice(id, 1);
  };

/**
 * Inform listeners about some news
 * @param {(() => void)[]} listeners - List of listeners
 * @param {any} news - News object
 */
const inform = (listeners, news) => () => {
  listeners.forEach((listener) => listener(news));
};

/**
 * @typedef {object} PublishOptions
 * @property {Boolean} isNoGlobalBroadcast - If `true` event will *not* be broadcasted gloablly even if `isGlobal` is `true`.
 * @property {Boolean} async - If `true` event will *not* be broadcasted synchronously even if `async` is `false` globally.
 */

/**
 * @callback Publish
 * @param {string} event - Event type to be published.
 * @param {any} news - The news to be published.
 * @param {PublishOptions} options - Publishing options
 * @returns {void}
 */

/**
 * Setup the publisher.
 * @param {Stack} stack - The bound event stack.
 * @param {Boolean} isGlobal - If `true` event will be published globally.
 * @return {Publish} Curried function for publishing an event on a specific event stack.
 */
const publish = (stack, { isGlobal, caseInsensitive, async } = {}) => {
  const unsubscriber = unsubscribe(stack);
  return (event, news, options = {}) => {
    const e = getEventName(event, caseInsensitive);

    if (!stack[e]) return;

    const listeners = [...stack[e]];

    listeners.forEach((listener, i) => {
      if (--stack.__times__[e][i] < 1) unsubscriber(e, listener);
    });

    if (async || options.async) {
      setTimeout(inform(listeners, news), 0);
    } else {
      inform(listeners, news)();
    }

    if (isGlobal && !options.isNoGlobalBroadcast) {
      try {
        bc.postMessage({ event: e, news });
      } catch (error) {
        if (error instanceof DOMException) {
          console.warn(
            `Could not broadcast '${e}' globally. Payload is not clonable.`
          );
        } else {
          throw error;
        }
      }
    }
  };
};

/**
 * @callback Clear - Remove all event listeners
 * @return {void}
 */

/**
 * Setup event clearer
 * @param {Stack} stack - The bound event stack.
 * @return {Clear} A curried function removing all event listeners on a specific event stack.
 */
const clear = (stack) => () => {
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
 * @typedef {{ [event: string]: Handler[], __times__: { [event: string]: number[] }} Stack
 */

/**
 * Create a new empty stack object
 * @return {Stack} An empty stack object.
 */
const createEmptyStack = () => ({ __times__: {} });

/**
 * @typedef {object} PubSubOptions
 * @property {Boolean} async If `true` the pub-sub instance publishes events asynchronously (recommended)
 * @property {Boolean} caseInsensitive If `true` the event names are case insenseitive
 * @property {Stack} stack A custom event subscriber stack
 */

/**
 * @typedef {object} PubSub
 * @property {Publish} publish - A function to publish an event
 * @property {Subscribe} subscribe - A function for subscribing to an event
 * @property {Unsubscribe} unsubscribe - A function for unsubscribing from an event
 * @property {Clear} clear - A function for clearing all event subscribers
 * @property {Stack} stack - The event subscriber stack
 */

/**
 * Create a new pub-sub instance
 * @param {PubSubOptions} options - Object to be used as the event stack.
 * @return {PubSub} New pub-sub instance.
 */
const createPubSub = (options = {}) => {
  const async = options.async || false;
  const caseInsensitive = options.caseInsensitive || false;
  const stack = options.stack || createEmptyStack();

  if (!stack.__times__) stack.__times__ = {};

  return {
    publish: publish(stack, { async, caseInsensitive }),
    subscribe: subscribe(stack, { caseInsensitive }),
    unsubscribe: unsubscribe(stack, { caseInsensitive }),
    clear: clear(stack),
    stack,
  };
};

/**
 * Global pub-sub stack object
 */
const globalPubSubStack = createEmptyStack();

/**
 * Global pub-sub stack instance
 * @type {PubSub}
 */
const globalPubSub = {
  publish: publish(globalPubSubStack, { isGlobal: true }),
  subscribe: subscribe(globalPubSubStack),
  unsubscribe: unsubscribe(globalPubSubStack),
  clear: clear(globalPubSubStack),
  stack: globalPubSubStack,
};

bc.onmessage = ({ data: { event, news } }) =>
  globalPubSub.publish(event, news, { isNoGlobalBroadcast: true });

export { globalPubSub, createPubSub };

export default createPubSub;
