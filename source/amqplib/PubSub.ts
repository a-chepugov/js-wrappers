import { Options, Replies } from 'amqplib';
import { ISubscriber, IPublisher, IChannel } from './interfaces';
import RichConnection from './RichConnection';
import RichChannel, { RichChannelOptions } from './RichChannel';
import RichExchange from './RichExchange';
import RichQueue from './RichQueue';
import RichMessage, { RichConsumer } from './RichMessage';

const subscribe = <T>(queue: RichQueue<T>, subscriber: ISubscriber<T>, { retries = 0 } = {}, options?: Options.Consume): Promise<Replies.Consume> => {
	return queue.consume(async (message: RichMessage<T>) => {
		try {
			await subscriber(message.payload, message.headers);
			return message.ack();
		} catch (error) {
			if (retries > 0) {
				if (message.deaths < retries) {
					return message.die();
				} else {
					return message.ack();
				}
			} else {
				return message.nack();
			}
		}
	}, options);
}

export class Publisher<T> implements IPublisher<T, string> {
	queue: RichQueue<T>;

	constructor(queue: RichQueue<T>) {
		RichQueue.assert(queue);
		this.queue = queue;
		Object.freeze(this);
	}

	subscribe(subscriber: ISubscriber<T>, config?: any, options?: Options.Consume) {
		return subscribe(this.queue, subscriber, config, options)
	}

	unsubscribe(tag: string) {
		return this.queue.cancel(tag);
	}

	publish(payload: T, options?: Options.Publish) {
		return this.queue.publish(payload, options);
	}

	static async from(connection: RichConnection, queueName: string, richChannelOptions?: RichChannelOptions, queueOptions?: Options.AssertQueue) {
		connection.connect();
		const channel = connection.Channel(richChannelOptions);
		channel.open();
		const queue = channel.Queue(queueName, queueOptions);
		queue.assert();
		return new Publisher(queue);
	}
}

export class Bus<T> implements IChannel<T, string, string> {
	exchange: RichExchange<T>;

	constructor(exchange: RichExchange<T>) {
		RichExchange.assert(exchange);
		this.exchange = exchange;
		Object.freeze(this);
	}

	subscribe = async (topic: string, subscriber: ISubscriber<T>, queue: RichQueue<T>, config?: any, args?: any, options?: Options.Consume) => {
		await queue.bind(this.exchange, topic, args);
		return subscribe(queue, subscriber, config, options);
	}

	unsubscribe(topic: string, tag: string, queue: RichQueue<T>) {
		return queue.cancel(tag);
	}

	publish = (topic: string, payload: T, options?: Options.Publish) => {
		return this.exchange.publish(topic, payload, options);
	}

	static async from(connection: RichConnection, exchangeName: string, type: string, richChannelOptions?: RichChannelOptions, exchangeOptions?: Options.AssertExchange) {
		connection.connect();
		const channel = connection.Channel(richChannelOptions);
		channel.open();
		const exchange = channel.Exchange(exchangeName, type, exchangeOptions);
		exchange.assert();
		return new Bus(exchange);
	}
}

