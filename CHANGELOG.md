### v2.0.0

**Breaking Changes:**

- Switched to _async_ publishing by default. If you need synchronous publishing do `publish(event, news, { sync: true })`
- Replaced the third parameter of `publish` with an option object accepting `{ sync, localBroadcast }`

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
