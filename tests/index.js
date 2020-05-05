import BroadcastChannel from 'broadcast-channel';
import browserEnv from 'browser-env';
import { test } from 'zora';

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

const wait = time => new Promise(resolve => setTimeout(resolve, time));

(async () => {
  await Promise.all([
    test('publishes and subscribes to event', async t => {
      const pubSub = createPubSub();
      const eventName = 'my-event';

      pubSub.subscribe(eventName, x => t.ok(x, 'event should publish data'));
      pubSub.publish(eventName, true);

      await wait(0);

      t.ok(
        pubSub.stack[eventName].length === 1,
        'event stack should have 1 listener'
      );

      t.ok(
        pubSub.stack.__times__[eventName][0] === Infinity,
        'event stack `__times__` should be `Infinity`'
      );
    }),

    test('creates independent pub-sub stacks', async t => {
      const pubSubA = createPubSub();
      const pubSubB = createPubSub();

      const eventName = 'count';

      let counterA = 0;
      let counterB = 0;

      t.ok(
        pubSubA.stack !== counterB.stack,
        'event stacks should not be the same'
      );

      pubSubA.subscribe(eventName, () => ++counterA);
      pubSubB.subscribe(eventName, () => ++counterB);

      pubSubA.publish(eventName);
      pubSubA.publish(eventName);
      await wait(0);

      t.ok(counterA === 2, 'counter A should be 2');
      t.ok(counterB === 0, 'counter A should be 0');

      pubSubB.publish(eventName);
      await wait(0);

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
    }),

    test('unsubscribes from event', async t => {
      const pubSub = createPubSub();

      let counter = 0;

      const eventName = 'my-event';
      const eventHandler = () => ++counter;

      pubSub.subscribe(eventName, eventHandler);

      pubSub.publish(eventName);
      pubSub.publish(eventName);

      await wait(0);

      pubSub.unsubscribe(eventName, eventHandler);

      pubSub.publish(eventName);

      await wait(0);

      t.ok(counter === 2, 'should have encountered 2 events');
      t.ok(pubSub.stack[eventName].length === 0, 'event stack should be empty');

      const eventSubscription = pubSub.subscribe(eventName, eventHandler);

      pubSub.publish(eventName);
      pubSub.publish(eventName);

      await wait(0);

      pubSub.unsubscribe(eventSubscription);

      pubSub.publish(eventName);

      await wait(0);

      t.ok(counter === 4, 'should have encountered 4 events');
      t.ok(pubSub.stack[eventName].length === 0, 'event stack should be empty');
    }),

    test('automatically unsubscribes after n events', async t => {
      const pubSub = createPubSub();

      let counter = 0;

      const eventName = 'my-event';
      const eventHandler = () => ++counter;

      pubSub.subscribe(eventName, eventHandler, 2);

      pubSub.publish(eventName);
      pubSub.publish(eventName);
      pubSub.publish(eventName);

      await wait(0);

      t.ok(counter === 2, 'should have encountered 2 events');
      t.ok(pubSub.stack[eventName].length === 0, 'event stack should be empty');
    }),

    test('global pub-sub service', async t => {
      globalPubSub.publish(globalEventName);
      globalPubSub.publish(globalEventName);

      await wait(0);

      // Check the beginning of this file. We've already fired a global event twice
      t.ok(
        globalCounter === 2,
        'should have encountered 2 global events already'
      );

      const eventHandler = () => {};

      globalPubSub.subscribe(globalEventName, eventHandler, 2);

      t.ok(
        globalPubSub.stack[globalEventName].length === 2,
        'the global event should have 2 listeners'
      );

      globalPubSub.publish(globalEventName);

      await wait(0);

      t.ok(globalCounter === 3, 'should have encountered 3 global events');
    }),

    test('allows custom event stack and sets __times__ if necessary', async t => {
      const myStack = {};
      const pubSub = createPubSub(myStack);

      t.ok(pubSub.stack === myStack, '`myStack` should be the event stack');
      t.ok(
        pubSub.stack.__times__,
        'event stack should be the `__times__` prop'
      );
    }),

    test('removes all listeners on clear()', async t => {
      const pubSub = createPubSub();

      let counter = 0;

      const eventName = 'my-event';
      const eventHandler = () => ++counter;

      pubSub.subscribe(eventName, eventHandler);

      pubSub.publish(eventName);

      await wait(0);

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

      await wait(0);

      t.ok(
        Object.keys(pubSub.stack).length === 1,
        'stack should have no listeners and only the `__times__` property'
      );
      t.ok(
        Object.keys(pubSub.stack.__times__).length === 0,
        '`stack.__times__` should no entries anymore'
      );
      t.ok(counter === 1, 'new events should not be handled anymore');
    })
  ]);

  // A hack to properly close the test runner.
  globalChannel.close();
})();
