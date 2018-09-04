# Simple ES6-based pub-sub service

[![Build Status](https://travis-ci.org/flekschas/pub-sub.svg?branch=master)](https://travis-ci.org/flekschas/pub-sub)

> A simple pub-sub service for custom events written in ES6 or whatever the latest version of EcmaScript is called.

## Install

```
npm -i -D pub-sub-es
```

## Get Started

```javascript
import createPubSub from 'pub-sub-es';

// Creates a new pub-sub event listener stack.
const pubSub = createPubSub();

// Subscribe to an event
const myEmojiEventHandler = msg => console.log(`🎉 ${msg} 😍`);
pubSub.on('my-emoji-event', myEmojiEventHandler);

// Publish an event
pubSub.publish('my-emoji-event', 'Yuuhuu');  // >> 🎉 Yuuhuu 😍

// Unsubscribe
pubSub.unsubscribe('my-emoji-event', myEmojiEventHandler);
```

## API

`pub-sub-es` exports the factory function (`createPubSub`) for creating a new pub-sub service by default and a global pub-sub service (`globalPubSub`). The API is the same.

#### `createPubSub(stack = { __times__: {} })`

- `stack` is an object holding for holding the event listeners and defaults to a new stack when being omitted.

**Returns:** a new pub-sub service

#### `pubSub.publish(event, news)`

- `event` is the name of the event to be published.
- `news` is an arbitrary value that is being broadcasted.

#### `pubSub.subscribe(event, handler, times)`

- `event` is the name of the event to be published.
- `handler` is the handler function that is being called together with the broadcasted value.
- `times` is the number of times the handler is invoked before it's automatically unsubscribed.

**Returns:** an object of form `{ event, handler }`. This object can be used to automatically unsubscribe, e.g., `pubSub.unsubscribe(pubSub.subscribe('my-event', myHandler))`.

#### `pubSub.unsubscribe(event, news)`

- `event` is the name of the event to be published. Optionally, `unsubscribe` accepts an object of form `{ event, handler}` coming from `subscribe`. 
- `news` is an arbitrary value that is being broadcasted.

## Development

Some handy commands:

- `npm build`: builds the UMD library
- `npm run watch`: continuously builds the UMD library
- `npm run lint`: checks the code style
- `npm test`: runs the test suite
