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
  stack.__times__[event].push(parseInt(times, 10) || Infinity);

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

  if (typeof event === 'object') {
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
const publish = stack => (event, news) => {
  if (!stack[event]) return;

  const unsubscriber = unsubscribe(stack);

  stack[event].forEach((listener, i) => {
    listener(news);
    if (!(stack.__times__[event][i] -= 1)) unsubscriber(event, listener);  // eslint-disable-line
  });
};

const createPubSub = (stack = { __times__: {} }) => ({
  publish: publish(stack),
  subscribe: subscribe(stack),
  unsubscribe: unsubscribe(stack),
  stack,
});

const globalPubSub = createPubSub();

export {
  globalPubSub,
  createPubSub,
};

export default createPubSub;
