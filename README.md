# sn.core 
This module is a core set of libraries used by Stocknet which is a bit of a side project to test out some capabilities around microservices, docker, and distributed messaging.

This library wraps a bunch of core functions shared by each of the microservices, and whilst i'm generally against shared libraries, these are sufficiently abstracted to the point where non-stocknet applications could use them.

## Getting Started
As it stands, the module isn't on NPM because its a bit of a proof of concept.  You can install it directly from git though.

Install the module with: `npm install jambr/sn.core.git#master`

## Documentation
### MessageBroker (AMQP)
The idea behind MessageBroker is an abstraction on top of AMQP (amqplib), tested against RabbitMQ.  RabbitMQ/AMQP are incredibly powerful but I wanted a simplier interface limited to some core concepts: non persistent subscriptions, persistent subscriptions, remote procedure call.  Each of these concepts is outlined on the RabbitMQ examples page, this is just a simple implementation of each.

To keep things simple, and consistent, for both persistent and non persistent subscriptions, we keep the same model of a **topic** exchange, using routing keys.  The following diagram is from RabbitMQs examples which I think explains the setup quite nicely:

![topic routing](https://www.rabbitmq.com/img/tutorials/python-five.png)

These bindings can be summarised as:

  - Q1 is interested in all the orange animals.
  - Q2 wants to hear everything about rabbits, and everything about lazy animals.

A message with a routing key set to 'quick.orange.rabbit' will be delivered to both queues. Message 'lazy.orange.elephant' also will go to both of them. On the other hand 'quick.orange.fox' will only go to the first queue, and 'lazy.brown.fox' only to the second. 'lazy.pink.rabbit' will be delivered to the second queue only once, even though it matches two bindings. 'quick.brown.fox' doesn't match any binding so it will be discarded.



#### Non-persistent subscriptions
Key characteristics of this type of subscription:

  - The queues are _exclusive_ to the connection which created them, meaning when that connection dies - the queues die with it. 
  - The queue has a 1-2-1 relationship with the consumer, meaning other connections cannot consume from this queue.
  - Messages do **not** require acknowledgement, subsequently this queue is not considered resilant in any way, but is the fastest.

We will keep with the example above, and have a queue that subscribes to 'lazy.#' and '\*.\*.rabbit', and a publisher sending 'lazy.orange.elephant' messages.


```javascript
let Broker = require('sn.core').Brokers.RabbitMQ;
let should = require('should');
let broker = new Broker('testing:namespace');

let subscriptionSetupComplete = () => {
  /* This is fired once the subscription is setup.  
      We know that messages sent now will be picked up by the subscriber. */
  broker.publish('lazy.orange.elephant', 'is called dave');
};

// Setup our subscription
broker.subscribe([
  'lazy.#',
  '*.*.rabbit'
], (message, meta) => {
  should(meta.routingKey).eql('lazy.orange.elephant');
  should(message).eql('is called dave');
}, subscriptionSetupComplete);
```

### Persistent subscriptions
Key characteristics of this type of subscription:

  - The queues are _not exclusive_ to the connection which created them, meaning when that connection dies - the queues lives on and messages continue to get delivered there by the _exchange_, the consumer can come back online and get the messages it missed.
  - Multiple consumers can take from the same named queue, meaning this type of subcription is excellent for worker based queues with multiple consumers (workers).
  - Messages **require acknowledgement**, this means the consumer needs to tell RabbitMQ it got the message, otherwise it will be put back on the queue and redelivered.

The interface is purposly similar, however the queues now require a unique name, whereas in the previous example the queue names were automatically generated.


```javascript
let Broker = require('sn.core').Brokers.RabbitMQ;
let should = require('should');
let broker = new Broker('testing:namespace');

let subscriptionSetupComplete = () => {
  /* This is fired once the subscription is setup.  
      We know that messages sent now will be picked up by the subscriber. */
  broker.publish('lazy.orange.elephant', 'is called dave');
};

// Setup our subscription
broker.subscribePersistent([
  'lazy.#',
  '*.*.rabbit'
], 'my-persistent-queue', (message, meta, ack) => {
  should(meta.routingKey).eql('lazy.orange.elephant');
  should(message).eql('is called dave');
  ack();
}, subscriptionSetupComplete);
```

### Remote Procedure Call
Again, I'm going to plagurise the RabbitMQ example as it explains the situation quite nicely.  Take the following setup: 

![rpc](https://www.rabbitmq.com/img/tutorials/python-six.png)
 
Our RPC will work like this:

  - When the Client starts up, it creates an anonymous exclusive callback queue.
For an RPC request, the Client sends a message with two properties: reply_to, which is set to the callback queue and correlation_id, which is set to a unique value for every request.
  - The request is sent to an rpc_queue queue.
  - The RPC worker (aka: server) is waiting for requests on that queue. When a request appears, it does the job and sends a message with the result back to the Client, using the queue from the reply_to field.
  - The client waits for data on the callback queue. When a message appears, it checks the correlation_id property. If it matches the value from the request it returns the response to the application.

**NOTE**: I take a slight tangent on the typical approach here in that I still use a topic exchange for distribution of messages to the rpc handlers.  

```javascript
let Broker = require('sn.core').Brokers.RabbitMQ;
let should = require('should');
let broker = new Broker('testing:namespace');

let subscriptionSetupComplete = () => {
  /* This is where we make an RPC call. */
  broker.rpc('filter.test.rpc', 'test message', (message) => {
  	should(message).eql('and this is the result');
  }); 
};

// Setup our rpc subscription, this would be the worker 
// that responds to rpc requests.
broker.subscribePersistent(
  'filter.test.rpc',
  'my-persistent-rpc-queue', (message, meta, ack) => {
    should(message).eql('test message'); 
    ack(null, 'and this is the result'); 
}, subscriptionSetupComplete);
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Release History
_(Nothing yet)_

## License
Copyright (c) 2016 Karl Stoney  
Licensed under the MIT license.
