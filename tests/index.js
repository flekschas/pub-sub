const BroadcastChannel = require('broadcast-channel');
const browserEnv = require('browser-env');
const test = require('tape');

browserEnv();

let globalChannel;
window.BroadcastChannel = function FakeBroadcastChannel(channelName) {
  globalChannel = new BroadcastChannel(channelName);
  return globalChannel;
};

// Note, in the following ES6's import doesn't work. Somehow `window` is then
// not available.
const pubSubEs = require('../src/index');

const { createPubSub, globalPubSub } = pubSubEs;

let globalCounter = 0;

const globalEventName = 'my-global-event';
const globalEventHandler = () => ++globalCounter;

globalPubSub.subscribe(globalEventName, globalEventHandler);

globalPubSub.publish(globalEventName);
globalPubSub.publish(globalEventName);

test('publishes and subscribes to event', (t) => {
  t.plan(3);

  const pubSub = createPubSub();
  const eventName = 'my-event';

  pubSub.subscribe(eventName, (x) => t.ok(x, 'event should publish data'));
  pubSub.publish(eventName, true);

  t.ok(
    pubSub.stack[eventName].length === 1,
    'event stack should have 1 listener'
  );

  t.ok(
    pubSub.stack.__times__[eventName][0] === Infinity,
    'event stack `__times__` should be `Infinity`'
  );
});

test('creates independent pub-sub stacks', (t) => {
  t.plan(7);

  const pubSubA = createPubSub();
  const pubSubB = createPubSub();

  const eventName = 'count';

  let counterA = 0;
  let counterB = 0;

  t.ok(pubSubA.stack !== counterB.stack, 'event stacks should not be the same');

  pubSubA.subscribe(eventName, () => ++counterA);
  pubSubB.subscribe(eventName, () => ++counterB);

  pubSubA.publish(eventName);
  pubSubA.publish(eventName);

  t.ok(counterA === 2, 'counter A should be 2');
  t.ok(counterB === 0, 'counter A should be 0');

  pubSubB.publish(eventName);

  t.ok(counterA === 2, 'counter A should be 2');
  t.ok(counterB === 1, 'counter A should be 1');

  t.ok(
    pubSubA.stack[eventName].length === 1,
    'event stack A should have 1 listener'
  );
  t.ok(
    pubSubB.stack[eventName].length === 1,
    'event stack B should have 1 listener'
  );
});

test('unsubscribes from event', (t) => {
  t.plan(4);

  const pubSub = createPubSub();

  let counter = 0;

  const eventName = 'my-event';
  const eventHandler = () => ++counter;

  pubSub.subscribe(eventName, eventHandler);

  pubSub.publish(eventName);
  pubSub.publish(eventName);

  pubSub.unsubscribe(eventName, eventHandler);

  pubSub.publish(eventName);

  t.ok(counter === 2, 'should have encountered 2 events');
  t.ok(pubSub.stack[eventName].length === 0, 'event stack should be empty');

  const eventSubscription = pubSub.subscribe(eventName, eventHandler);

  pubSub.publish(eventName);
  pubSub.publish(eventName);

  pubSub.unsubscribe(eventSubscription);

  pubSub.publish(eventName);

  t.ok(counter === 4, 'should have encountered 4 events');
  t.ok(pubSub.stack[eventName].length === 0, 'event stack should be empty');
});

test('automatically unsubscribes after n events', (t) => {
  t.plan(2);

  const pubSub = createPubSub();

  let counter = 0;

  const eventName = 'my-event';
  const eventHandler = () => ++counter;

  pubSub.subscribe(eventName, eventHandler, 2);

  pubSub.publish(eventName);
  pubSub.publish(eventName);
  pubSub.publish(eventName);

  t.ok(counter === 2, 'should have encountered 2 events');
  t.ok(pubSub.stack[eventName].length === 0, 'event stack should be empty');
});

test('global pub-sub service', (t) => {
  t.plan(3);

  // Check the beginning of this file. We've already fired a global event twice
  t.ok(globalCounter === 2, 'should have encountered 2 global events already');

  const eventHandler = () =>
    t.ok(globalCounter === 3, 'should have encountered 3 global events');

  globalPubSub.subscribe(globalEventName, eventHandler, 2);

  t.ok(
    globalPubSub.stack[globalEventName].length === 2,
    'the global event should have 2 listeners'
  );

  globalPubSub.publish(globalEventName);
});

test('allows custom event stack and sets __times__ if necessary', (t) => {
  t.plan(2);

  const myStack = {};
  const pubSub = createPubSub(myStack);

  t.ok(pubSub.stack === myStack, '`myStack` should be the event stack');
  t.ok(pubSub.stack.__times__, 'event stack should be the `__times__` prop');

  // A hack to properly close the test runner.
  globalChannel.close();
});

test('removes all listeners on clear()', (t) => {
  t.plan(6);

  const pubSub = createPubSub();

  let counter = 0;

  const eventName = 'my-event';
  const eventHandler = () => ++counter;

  pubSub.subscribe(eventName, eventHandler);

  pubSub.publish(eventName);

  t.ok(
    Object.keys(pubSub.stack).length === 2,
    'stack should have one listener and the `__times__` property'
  );
  t.ok(
    Object.keys(pubSub.stack.__times__).length === 1,
    '`stack.__times__` should have one entry'
  );
  t.ok(counter === 1, 'event should have been handled once');

  pubSub.clear();
  pubSub.publish(eventName);

  t.ok(
    Object.keys(pubSub.stack).length === 1,
    'stack should have no listeners and only the `__times__` property'
  );
  t.ok(
    Object.keys(pubSub.stack.__times__).length === 0,
    '`stack.__times__` should no entries anymore'
  );
  t.ok(counter === 1, 'new events should not be handled anymore');

  // A hack to properly close the test runner.
  globalChannel.close();
});
