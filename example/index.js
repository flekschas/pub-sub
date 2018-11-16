import { createPubSub, globalPubSub } from "../src";

const pubSub = createPubSub();
const messages = document.querySelector("#messages");

const eventHandler = isGlobal => event => {
  const newElement = document.createElement("li");
  newElement.innerText = event;
  newElement.className = isGlobal ? "is-global" : "is-local";

  messages.appendChild(newElement);
};

const localEventHandler = eventHandler();
const globalEventHandler = eventHandler(true);

pubSub.subscribe("event", localEventHandler);

globalPubSub.subscribe("event", globalEventHandler);

const message = document.querySelector("#message");

const buttonSendLocally = document.querySelector("#send-locally");
const buttonSendGlobally = document.querySelector("#send-globally");

const clickHandler = isGlobal => event => {
  event.preventDefault();
  if (isGlobal) globalPubSub.publish("event", message.value);
  else pubSub.publish("event", message.value);
};

const localClickHandler = clickHandler();
const globalClickHandler = clickHandler(true);

buttonSendLocally.addEventListener("click", localClickHandler);
buttonSendGlobally.addEventListener("click", globalClickHandler);
