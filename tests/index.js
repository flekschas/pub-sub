const test = require('tape');

const createPubSub = require('../src/index');

let globalCounter = 0;

const globalEventName = 'my-global-event';
const globalEventHandler = () => ++globalCounter;

createPubSub.globalPubSub.subscribe(globalEventName, globalEventHandler);

createPubSub.globalPubSub.publish(globalEventName);
createPubSub.globalPubSub.publish(globalEventName);

test('publishes and subscribes to event', (t) => {
  t.plan(2);

  const pubSub = createPubSub.default();
  const eventName = 'my-event';

  pubSub.subscribe(eventName, x => t.ok(x));
  pubSub.publish(eventName, true);

  t.ok(pubSub.stack[eventName].length === 1);
});

test('creates independent pub-sub stacks', (t) => {
  t.plan(4);

  const pubSubA = createPubSub.default();
  const pubSubB = createPubSub.default();

  const eventName = 'count';

  let counterA = 0;
  let counterB = 0;

  pubSubA.subscribe(eventName, () => ++counterA);
  pubSubB.subscribe(eventName, () => ++counterB);

  pubSubA.publish(eventName);
  pubSubA.publish(eventName);
  pubSubA.publish(eventName);

  pubSubB.publish(eventName);
  pubSubB.publish(eventName);

  t.ok(counterA === 3);
  t.ok(counterB === 2);

  t.ok(pubSubA.stack[eventName].length === 1);
  t.ok(pubSubB.stack[eventName].length === 1);
});

test('unsubscribes from event', (t) => {
  t.plan(2);

  const pubSub = createPubSub.default();

  let counter = 0;

  const eventName = 'my-event';
  const eventHandler = () => ++counter;

  pubSub.subscribe(eventName, eventHandler);

  pubSub.publish(eventName);
  pubSub.publish(eventName);

  pubSub.unsubscribe(eventName, eventHandler);

  pubSub.publish(eventName);

  t.ok(counter === 2);
  t.ok(pubSub.stack[eventName].length === 0);
});

test('automatically unsubscribes after n events', (t) => {
  t.plan(2);

  const pubSub = createPubSub.default();

  let counter = 0;

  const eventName = 'my-event';
  const eventHandler = () => ++counter;

  pubSub.subscribe(eventName, eventHandler, 2);

  pubSub.publish(eventName);
  pubSub.publish(eventName);
  pubSub.publish(eventName);

  t.ok(counter === 2);
  t.ok(pubSub.stack[eventName].length === 0);
});

test('global pub-sub service', (t) => {
  t.plan(3);

  // Check the beginning of this file. We've already fired a global event twice
  t.ok(globalCounter === 2);

  const eventHandler = () => t.ok(globalCounter === 3);

  createPubSub.globalPubSub.subscribe(globalEventName, eventHandler, 2);

  t.ok(createPubSub.globalPubSub.stack[globalEventName].length === 2);

  createPubSub.globalPubSub.publish(globalEventName);
});
