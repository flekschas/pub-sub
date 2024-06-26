### v3.0.0

- Rewrote the whole library in TypeScript to finally fix all the type issues.

**Breaking Changes**

- Stop publishing UMD modules

### v2.1.2

- Fix behavior of `publish`'s `async` option. The option will now override the globally specified behavior.
- Fix a typo in `types` of `package.json` to point to the correct type definitions
- Further improve some type descriptions

### v2.1.1

- Fix several type definitions

### v2.1.0

- Add and publish types
- Add missing `clear()` function to the global pub sub instance

### v2.0.2

- Fix an issue with the Broadcast Channel's `publish` call

### v2.0.1

- Fix an edge case in async `publish`

### v2.0.0

- Add option to make the event stack case-insensitive via `createPubSub({ caseInsensitive: true })`
- Add option to make `publish` asynchronous via `createPubSub({ async: true })` (or `pubSub.publish(event, news, { async: true })`)

**Breaking Changes**

- The API of `createPubSub` changed from `createPubSub(customStackObject = {})` to `createPubSub({ async = false, caseInsensitive = false, stack = {} } = {})`

### v1.2.2

- Fix a bug when using pub-sub-es in an iframe.
- Updated third-party packages

### v1.2.1

- Fixed a bad bug when subscribing with the shorthand. Expanded the tests to cover the shorthand unsubscription.

### v1.2.0

- Add `clear()` for removing all currently active event listeners and unsetting all event times

### v1.1.2

- Check if `BroadcastChannel` is available and log a warning otherwise

### v1.1.1

- Catch exceptions on broadcasting with `BroadcastChannel`

### v1.1.0

- Expand global communication across windows
- Add a demo page

### v1.0.2

- Prettify code and fix doc typos

### v1.0.1

- Make sure that custom stacks have the `__times__` property

### v1.0.0

- Fully tested working version
