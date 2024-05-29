import { expect, expectTypeOf, test, vi } from "vitest";

import { createPubSub, globalPubSub } from "./index";
import type { Event } from "./index";

const wait = (msec: number) =>
	new Promise((resolve) => {
		setTimeout(resolve, msec);
	});

let globalCounter = 0;

const globalEventName = "my-global-event";
const globalEventHandler = () => ++globalCounter;

globalPubSub.subscribe(globalEventName, globalEventHandler);

globalPubSub.publish(globalEventName);
globalPubSub.publish(globalEventName);

test("publishes and subscribes to event", () => {
	const eventName = "my-event";
	const pubSub = createPubSub<Event<typeof eventName, boolean>>();

	pubSub.subscribe(eventName, (x) => expect(x).toBe(true));
	pubSub.publish(eventName, true);

	expect(pubSub.stack[eventName]?.length).toBe(1);
	expect(pubSub.stack[eventName]?.[0].times).toBe(Number.POSITIVE_INFINITY);
});

test("creates independent pub-sub stacks", () => {
	const pubSubA = createPubSub<Event<"count", undefined>>();
	const pubSubB = createPubSub<Event<"count", undefined>>();

	const eventName = "count";

	let counterA = 0;
	let counterB = 0;

	expect(pubSubA.stack).not.toBe(pubSubB.stack);

	pubSubA.subscribe(eventName, () => ++counterA);
	pubSubB.subscribe(eventName, () => ++counterB);

	pubSubA.publish(eventName);
	pubSubA.publish(eventName);

	expect(counterA).toBe(2);
	expect(counterB).toBe(0);

	pubSubB.publish(eventName);

	expect(counterA).toBe(2);
	expect(counterB).toBe(1);

	expect(pubSubA.stack[eventName]?.length).toBe(1);
	expect(pubSubB.stack[eventName]?.length).toBe(1);
});

test("unsubscribes from event", () => {
	const pubSub = createPubSub();

	let counter = 0;

	const eventName = "my-event";
	const eventHandler = () => ++counter;

	pubSub.subscribe(eventName, eventHandler);

	pubSub.publish(eventName);
	pubSub.publish(eventName);

	pubSub.unsubscribe(eventName, eventHandler);

	pubSub.publish(eventName);

	expect(counter).toBe(2);
	expect(pubSub.stack[eventName]?.length).toBe(0);

	const eventSubscription = pubSub.subscribe(eventName, eventHandler);

	pubSub.publish(eventName);
	pubSub.publish(eventName);

	pubSub.unsubscribe(eventSubscription);

	pubSub.publish(eventName);

	expect(counter).toBe(4);
	expect(pubSub.stack[eventName]?.length).toBe(0);

	pubSub.subscribe(eventName, eventHandler);

	// Nothing should happen if one tries to unsubscribe an unknown handler
	pubSub.unsubscribe(eventName, () => ++counter);

	pubSub.publish(eventName);
	pubSub.publish(eventName);

	pubSub.unsubscribe(eventName, eventHandler);

	pubSub.publish(eventName);

	expect(counter).toBe(6);
	expect(pubSub.stack[eventName]?.length).toBe(0);
});

test("test case-sensitive", () => {
	const pubSub = createPubSub();
	const eventName = "myEvent";

	let counter = 0;
	const eventHandler = () => ++counter;

	pubSub.subscribe(eventName, eventHandler);
	pubSub.publish(eventName);
	pubSub.publish(eventName.toLowerCase());

	expect(counter).toBe(1);

	pubSub.unsubscribe(eventName.toLowerCase(), eventHandler);

	pubSub.publish(eventName);

	expect(pubSub.stack[eventName]?.length).toBe(1);
	expect(counter === 2, "should have registered 2 events");

	pubSub.unsubscribe(eventName, eventHandler);

	expect(pubSub.stack[eventName]?.length).toBe(0);
});

test("test case-insensitivity", () => {
	const eventName = "myEvent";
	const pubSub = createPubSub({ caseInsensitive: true });

	let counterA = 0;
	let counterB = 0;
	const eventHandlerA = () => ++counterA;
	const eventHandlerB = () => ++counterB;

	pubSub.subscribe(eventName, eventHandlerA);

	pubSub.publish(eventName);

	expect(counterA).toBe(1);

	pubSub.subscribe(eventName.toLowerCase(), eventHandlerB);
	pubSub.publish(eventName.toLowerCase());

	expect(counterA).toBe(2);
	expect(counterB).toBe(1);

	pubSub.unsubscribe(eventName.toLowerCase(), eventHandlerA);
	pubSub.unsubscribe(eventName, eventHandlerB);

	pubSub.publish(eventName);

	expect(pubSub.stack[eventName]).toBe(undefined);
	expect(pubSub.stack[eventName.toLowerCase()]?.length).toBe(0);
});

test("automatically unsubscribes after n events", () => {
	const eventName = "my-event";
	const pubSub = createPubSub<Event<typeof eventName, undefined>>();

	let counter = 0;

	const eventHandler = () => ++counter;

	pubSub.subscribe(eventName, eventHandler, 2);
	expect(pubSub.stack[eventName]?.[0].times).toBe(2);

	pubSub.publish(eventName);
	pubSub.publish(eventName);
	pubSub.publish(eventName);

	expect(counter).toBe(2);
	expect(pubSub.stack[eventName]?.length).toBe(0);
});

test("global pub-sub service", () => {
	// Check the beginning of this file. We've already fired a global event twice
	expect(globalCounter).toBe(2);

	const eventHandler = () => expect(globalCounter).toBe(3);

	globalPubSub.subscribe(globalEventName, eventHandler, 2);

	expect(globalPubSub.stack[globalEventName]?.length).toBe(2);

	globalPubSub.publish(globalEventName);

	const consoleWarn = vi.spyOn(console, "warn");

	globalPubSub.subscribe("anotherGlobalEvent", () => {
		/* nothing */
	});

	// Try to publish an event with an unclonable payload
	// @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#things_that_dont_work_with_structured_clone
	globalPubSub.publish("anotherGlobalEvent", () => 42);

	expect(consoleWarn).toHaveBeenCalledOnce();
	expect(consoleWarn).toHaveBeenLastCalledWith(
		"Could not broadcast 'anotherGlobalEvent' globally. Payload is not clonable.",
	);

	globalPubSub.subscribe("yetAnotherGlobalEvent", (news) =>
		expect(news).toBe(42),
	);

	const broadcastChannel = new window.BroadcastChannel("pub-sub-es");
	broadcastChannel.postMessage({ event: "yetAnotherGlobalEvent", news: 42 });
	broadcastChannel.close();
});

test("allows custom event stack and sets __times__ if necessary", () => {
	const myStack = {};
	const pubSub = createPubSub({ stack: myStack });

	expect(pubSub.stack === myStack, "`myStack` should be the event stack");
	expect(pubSub.stack.__times__, "event stack should be the `__times__` prop");
});

test("removes all listeners on clear()", () => {
	const eventName = "my-event";
	const pubSub = createPubSub<Event<typeof eventName, undefined>>();

	let counter = 0;

	const eventHandler = () => ++counter;

	pubSub.subscribe(eventName, eventHandler);

	pubSub.publish(eventName);

	expect(Object.keys(pubSub.stack).length).toBe(1);
	expect(counter).toBe(1);

	pubSub.clear();
	pubSub.publish(eventName);

	expect(Object.keys(pubSub.stack).length).toBe(0);
	expect(counter).toBe(1);
});

test("test async events", async () => {
	const eventName = "myEvent";

	const syncPubSub = createPubSub<Event<typeof eventName, undefined>>();
	const asyncPubSub = createPubSub<Event<typeof eventName, undefined>>({
		async: true,
	});

	let counter = 0;
	const eventHandler = () => ++counter;

	syncPubSub.subscribe(eventName, eventHandler);
	syncPubSub.publish(eventName);
	expect(counter).toBe(1);

	counter = 0;
	asyncPubSub.subscribe(eventName, eventHandler);
	asyncPubSub.publish(eventName);
	expect(counter).toBe(0);

	await wait(0);

	expect(counter).toBe(1);

	counter = 0;
	syncPubSub.publish(eventName, undefined, { async: true });
	expect(counter).toBe(0);

	await wait(0);

	expect(counter).toBe(1);

	counter = 0;
	asyncPubSub.publish(eventName, undefined, { async: false });
	expect(counter).toBe(1);

	asyncPubSub.clear();
	counter = 0;
	asyncPubSub.subscribe(eventName, eventHandler, 1);
	asyncPubSub.publish(eventName);
	asyncPubSub.publish(eventName);

	await wait(0);

	expect(counter).toBe(1);
});

test("publish() types", () => {
	const pubSub1 = createPubSub<Event<"name", undefined>>();
	expectTypeOf(pubSub1.publish).parameter(1).toBeUndefined();

	const pubSub2 = createPubSub<Event<"name", boolean>>();
	expectTypeOf(pubSub2.publish).parameter(1).toBeBoolean();

	const pubSub3 = createPubSub<Event<"name", number>>();
	expectTypeOf(pubSub3.publish).parameter(1).toBeNumber();

	const pubSub4 = createPubSub<Event<"name", number>>();
	expectTypeOf(pubSub4.publish).parameter(1).toBeNumber();

	const pubSub5 = createPubSub<Event<"name", number[]>>();
	expectTypeOf(pubSub5.publish).parameter(1).toBeArray();
});
