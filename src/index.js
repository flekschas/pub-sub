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
 * @typedef {{ [Key in EventName]: Payload }} Event
 * @template {string} [EventName=string]
 * @template {unknown} [Payload=unknown]
 */

/**
 * @typedef {(news: T[Key]) => void} Handler - Event handler function
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * @typedef {{ event: Key, handler: Handler<T, Key> }} Subscription - Event subscription object
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * @typedef {(event: Key, handler: Handler<T, Key>, times?: number) => Subscription<T, Key>} Subscribe - Function to subscribe to an event
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * @typedef {object} CreateSubscribeOptions - Options for customizing the subscriber factory
 * @property {Boolean} caseInsensitive - If `true` the event names are case insenseitive
 */

/**
 * @typedef {(stack: Stack<T>, options?: CreateSubscribeOptions) => Subscribe<T, Key>} CreateSubscribe - Factory function for `subscribe()`
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * Setup subscriber
 * @type {CreateSubscribe}
 */
const createSubscribe =
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
 * @typedef {(event: Key | Subscription<T, Key>, handler?: Handler<T, Key>) => void} Unsubscribe - Function to unsubscribe from an event
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * @typedef {object} CreateUnsubscribeOptions - Options for customizing the unsubscriber factory
 * @property {Boolean} caseInsensitive - If `true` the event names are case insenseitive
 */

/**
 * @typedef {(stack: Stack<T>, options?: CreateUnsubscribeOptions) => Unsubscribe<T, Key>} CreateUnsubscribe - Factory function for `unsubscribe()`
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * Setup unsubscriber
 * @type {CreateUnsubscribe}
 */
const createUnsubscribe =
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
 * @typedef {(listeners: (Handler<T, Key>)[], news: T[Key]) => void} Inform - Inform listeners about some news
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * Inform listeners about some news
 * @type {Inform}
 */
const inform = (listeners, news) => () => {
  listeners.forEach((listener) => listener(news));
};

/**
 * @typedef {object} PublishOptions - Options for how to publish an event
 * @property {Boolean} isNoGlobalBroadcast - If `true` event will *not* be broadcasted gloablly even if `isGlobal` is `true`.
 * @property {Boolean} async - If `true` event will *not* be broadcasted synchronously even if `async` is `false` globally.
 */

/**
 * @typedef {(event: Key, news: T[Key], options?: PublishOptions) => void} Publish - Function to publish an event
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * @typedef {object} CreatePublishOptions - Factory function for `publish()`
 * @property {Boolean} isGlobal - If `true` event will be published globally.
 * @property {Boolean} caseInsensitive - If `true` the event names are case insenseitive
 * @property {Boolean} async - If `true` the pub-sub instance publishes events asynchronously (recommended)
 */

/**
 * @typedef {(stack: Stack<T>, options?: CreatePublishOptions) => Publish<T>} CreatePublish - Factory function for `publish()`
 * @template {Event} [T=Event]
 */

/**
 * Setup the publisher.
 * @type {CreatePublish}
 */
const createPublish = (stack, { isGlobal, caseInsensitive, async } = {}) => {
  const unsubscribe = createUnsubscribe(stack);
  return (event, news, options = {}) => {
    const e = getEventName(event, caseInsensitive);

    if (!stack[e]) return;

    const listeners = [...stack[e]];

    listeners.forEach((listener, i) => {
      if (--stack.__times__[e][i] < 1) unsubscribe(e, listener);
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
 * @typedef {(stack: Stack<T>) => Clear} CreateClear - Factory function for `clear()`
 * @template {Event} [T=Event]
 */

/**
 * Setup event clearer
 * @type {CreateClear}
 */
const createClear = (stack) => () => {
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
 * @typedef {{ [event: Key]: (Handler<T, Key>)[], __times__: { [event: Key]: number[] }} Stack - Event stack object that stores the events handers and notification times
 * @template {Event} [T=Event]
 * @template {keyof T} Key
 */

/**
 * @typedef {object} PubSubOptions - Options for customizing the pub-sub instance
 * @property {Boolean} async - If `true` the pub-sub instance publishes events asynchronously (recommended)
 * @property {Boolean} caseInsensitive - If `true` the event names are case insenseitive
 * @property {Stack} stack A custom event subscriber stack
 */

/**
 * @typedef {{ publish: Publish<Event>, subscribe: Subscribe<Event>, unsubscribe: Unsubscribe<Event>, clear: Clear, stack: Stack }} PubSub - The pub-sub instance
 * @template {Event} [T=Event]
 */

/**
 * @typedef {() => Stack<T>} CreateStack - Create a new empty stack object
 * @template {Event} [T=Event]
 */

/**
 * Create a new empty stack object
 * @type {CreateStack}
 */
const createEmptyStack = () => ({ __times__: {} });

/**
 * @typedef {(options?: PubSubOptions) => PubSub<T>} CreatePubSub - Create a new pub-sub instance
 * @template {Event} [T=Event]
 */

/**
 * Create a new pub-sub instance
 * @type {CreatePubSub}
 */
const createPubSub = (options = {}) => {
  const async = options.async || false;
  const caseInsensitive = options.caseInsensitive || false;
  const stack = options.stack || createEmptyStack();

  if (!stack.__times__) stack.__times__ = {};

  return {
    publish: createPublish(stack, { async, caseInsensitive }),
    subscribe: createSubscribe(stack, { caseInsensitive }),
    unsubscribe: createUnsubscribe(stack, { caseInsensitive }),
    clear: createClear(stack),
    stack,
  };
};

/**
 * Global pub-sub stack object
 */
const globalPubSubStack = createEmptyStack();

/**
 * Global pub-sub instance
 * @type {PubSub}
 */
const globalPubSub = {
  publish: createPublish(globalPubSubStack, { isGlobal: true }),
  subscribe: createSubscribe(globalPubSubStack),
  unsubscribe: createUnsubscribe(globalPubSubStack),
  clear: createClear(globalPubSubStack),
  stack: globalPubSubStack,
};

bc.onmessage = ({ data: { event, news } }) =>
  globalPubSub.publish(event, news, { isNoGlobalBroadcast: true });

export { globalPubSub, createPubSub };

export default createPubSub;
