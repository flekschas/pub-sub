/**
 * Event object
 */
export type Event<
	EventName extends string = string,
	// biome-ignore lint/complexity/noUselessTypeConstraint: <explanation>
	Payload extends unknown = unknown,
> = { [Key in EventName]: Payload };

/**
 * Event handler function
 */
export type Handler<News> = undefined extends News
	? (news?: News | undefined) => void
	: (news: News) => void;

/**
 * Event subscription object
 */
export interface Subscription<T extends Event, Key extends keyof T & string> {
	event: Key;
	handler: Handler<T[Key]>;
}

/**
 * Function to subscribe to an event
 */
export type Subscribe<T extends Event> = ReturnType<typeof createSubscribe<T>>;

/**
 * Function to unsubscribe to an event
 */
export type Unsubscribe<T extends Event> = ReturnType<
	typeof createUnsubscribe<T>
>;

/**
 * Options for customizing the subscriber factory
 */
export interface CreateSubscribeOptions {
	/**
	 * If `true` the event names are case insenseitive
	 */
	caseInsensitive: boolean;
}

/**
 * Options for customizing the unsubscriber factory
 */
export interface CreateUnsubscribeOptions {
	/**
	 * If `true` the event names are case insenseitive
	 */
	caseInsensitive: boolean;
}

/**
 * Options for how to publish an event
 */
export type PublishOptions = {
	/**
	 * If `true` event will *not* be broadcasted gloablly even if `isGlobal` is `true`.
	 */
	isNoGlobalBroadcast: boolean;
	/**
	 * If `true` event will *not* be broadcasted synchronously even if `async` is `false` globally.
	 */
	async: boolean;
};

/**
 * Function to publish an event
 */
export type Publish<T extends Event> = <Key extends keyof T & string>(
	...args: undefined extends T[Key]
		? [key: Key, news?: T[Key], options?: Partial<PublishOptions>]
		: [key: Key, news: T[Key], options?: Partial<PublishOptions>]
) => void;

/**
 * Options for customizing the publisher factory
 */
export interface CreatePublishOptions {
	/**
	 * If `true` event will be published globally.
	 */
	isGlobal: boolean;
	/**
	 * If `true` the event names are case insenseitive
	 */
	caseInsensitive: boolean;
	/**
	 * If `true` the pub-sub instance publishes events asynchronously (recommended)
	 */
	async: boolean;
}

/**
 * Event listener object that stores the event hander and notification times
 */
export interface Listener<News> {
	handler: Handler<News>;
	times: number;
}

/**
 * Event stack object that stores all event listeners
 */
export type Stack<T extends Event> = Partial<{
	[Key in keyof T & string]: Listener<T[Key]>[];
}>;

/**
 * Remove all event listeners
 */
export type Clear = ReturnType<typeof createClear>;

/**
 * Options for customizing the pub-sub instance
 */
export interface PubSubOptions<T extends Event> {
	async: boolean;
	caseInsensitive: boolean;
	stack: Stack<T>;
}

/**
 * The pub-sub instance
 */
export interface PubSub<T extends Event = Event> {
	publish: Publish<T>;
	subscribe: Subscribe<T>;
	unsubscribe: Unsubscribe<T>;
	clear: Clear;
	stack: Stack<T>;
}

/**
 * Broadcast channel for global events
 */
const broadcastChannel = new window.BroadcastChannel("pub-sub-es");

const isString = (key: unknown): key is string => typeof key === "string";

const getEventName = <T extends Event, Key extends keyof T & string>(
	eventName: Key,
	caseInsensitive?: boolean,
) => {
	if (isString(eventName) && caseInsensitive) {
		return eventName.toLowerCase() as Key;
	}
	return eventName;
};

/**
 * Setup subscriber
 */
const createSubscribe =
	<T extends Event>(
		stack: Stack<T>,
		options?: Partial<CreateSubscribeOptions>,
	) =>
	<Key extends keyof T & string>(
		event: Key,
		handler: Handler<T[Key]>,
		times = Number.POSITIVE_INFINITY,
	) => {
		const e = getEventName<T, Key>(event, options?.caseInsensitive);
		const listeners = stack[e] || [];

		listeners.push({
			handler,
			times: +times || Number.POSITIVE_INFINITY,
		});

		stack[e] = listeners;

		return { event: e, handler };
	};

const isSubscription = <T extends Event, Key extends keyof T & string>(
	event: Key | Subscription<T, Key>,
): event is Subscription<T, Key> => typeof event === "object";

/**
 * Factory function for creating `unsubscribe`
 */
function createUnsubscribe<T extends Event>(
	stack: Stack<T>,
	options?: Partial<CreateUnsubscribeOptions>,
) {
	/**
	 * Function to unsubscribe from an event
	 */
	function unsubscribe<Key extends keyof T & string>(
		subscription: Subscription<T, Key>,
	): void;
	function unsubscribe<Key extends keyof T & string>(
		event: Key,
		handler: Handler<T[Key]>,
	): void;
	function unsubscribe<Key extends keyof T & string>(
		eventOrSubscription: Key | Subscription<T, Key>,
		handlerOrUndefined?: Handler<T[Key]>,
	) {
		let event: Key;
		let handler: Handler<T[Key]>;

		if (isSubscription(eventOrSubscription)) {
			handler = eventOrSubscription.handler;
			event = eventOrSubscription.event;
		} else {
			event = eventOrSubscription;
			// biome-ignore lint/style/noNonNullAssertion: The function overload defines that if `eventOrSubscription` is not a subscription, `handler` must be defined
			handler = handlerOrUndefined!;
		}

		const e = getEventName<T, Key>(event, options?.caseInsensitive);
		const listeners = stack[e];

		if (!listeners) {
			return;
		}

		const idx = listeners.findIndex((listener) => listener.handler === handler);

		if (idx === -1 || idx >= listeners.length) {
			return;
		}

		listeners.splice(idx, 1);
	}

	return unsubscribe;
}

const hasListeners = <T extends Event, Key extends keyof T & string>(
	listeners?: Partial<{ [Key in keyof T & string]: Listener<T[Key]>[] }>[Key],
): listeners is Listener<T[Key]>[] => {
	return Boolean(listeners);
};

/**
 * Factory function for create `publish()`
 */
const createPublish = <T extends Event>(
	stack: Stack<T>,
	options?: Partial<CreatePublishOptions>,
): Publish<T> => {
	const unsubscribe = createUnsubscribe(stack);
	return <Key extends keyof T & string>(
		...args: undefined extends T[Key]
			? [event: Key, news?: T[Key], callOptions?: Partial<PublishOptions>]
			: [event: Key, news: T[Key], callOptions?: Partial<PublishOptions>]
	) => {
		const [event, news, callOptions] = args;
		const eventName = getEventName<T, Key>(event, options?.caseInsensitive);
		const listenersOrUndefined = stack[eventName];

		if (!hasListeners(listenersOrUndefined)) {
			return;
		}

		const listeners = [...listenersOrUndefined];

		for (const listener of listeners) {
			if (--listener.times < 1) {
				unsubscribe(eventName, listener.handler);
			}
		}

		const isAsync =
			callOptions?.async !== undefined ? callOptions.async : options?.async;

		/**
		 * Inform listeners about some news
		 */
		const inform = () => {
			for (const listener of listeners) {
				try {
					listener.handler(news as T[Key]);
				} catch(error) {
					console.error(error);
				}
			}
		};

		if (isAsync) {
			setTimeout(inform, 0);
		} else {
			inform();
		}

		if (options?.isGlobal && !callOptions?.isNoGlobalBroadcast) {
			try {
				broadcastChannel.postMessage({ event: eventName, news });
			} catch (error) {
				if (error instanceof Error && error.name === "DataCloneError") {
					console.warn(
						`Could not broadcast '${eventName.toString()}' globally. Payload is not clonable.`,
					);
				} else {
					throw error;
				}
			}
		}
	};
};

function keys<T extends object>(obj: T): Array<keyof T & string> {
	// @ts-expect-error - Object.keys returns the string keys of our type and omits number & symbol but TS's doesn't type the object this way because there are edge cases
	return Object.keys(obj);
}

/**
 * Factory function for creating `clear()`
 */
const createClear =
	<T extends Event>(stack: Stack<T>) =>
	() => {
		for (const event of keys(stack)) {
			delete stack[event];
		}
	};

/**
 * Create a new empty stack object
 */
const createStack = <T extends Event>(): Stack<T> => ({});

/**
 * Create a new pub-sub instance
 */
const createPubSub = <T extends Event = Event>(
	options?: Partial<PubSubOptions<T>>,
): PubSub<T> => {
	const async = Boolean(options?.async);
	const caseInsensitive = Boolean(options?.caseInsensitive);
	const stack = options?.stack || createStack<T>();

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
const globalPubSubStack = createStack();

/**
 * Global pub-sub instance
 */
const globalPubSub: PubSub = {
	publish: createPublish(globalPubSubStack, { isGlobal: true }),
	subscribe: createSubscribe(globalPubSubStack),
	unsubscribe: createUnsubscribe(globalPubSubStack),
	clear: createClear(globalPubSubStack),
	stack: globalPubSubStack,
};

broadcastChannel.onmessage = ({ data: { event, news } }) =>
	globalPubSub.publish(event, news, { isNoGlobalBroadcast: true });

export { globalPubSub, createPubSub };

export default createPubSub;
