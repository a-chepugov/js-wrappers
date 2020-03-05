import { Connection, Channel, Options, Replies, ConsumeMessage } from 'amqplib';

import LCell from '../lib/LCell';

import * as RichConnection from './RichConnection';
import * as RichQueue from './RichQueue';
import * as RichExchange from './RichExchange';

export type RichChannelOptions = { reconnect: number };

export type MessageConsumer = (msg: ConsumeMessage) => void;

export class RichChannel {
	connection: RichConnection.default;
	#options: RichChannelOptions;
	#channel: LCell<Channel>;
	#consumers: Map<string, [ string, (channel: Channel) => MessageConsumer, Options.Consume | undefined ]>

	constructor(connection: RichConnection.default, options?: RichChannelOptions) {
		RichConnection.default.assert(connection);
		this.connection = connection;

		this.#options = { reconnect: Number(options?.reconnect) };

		this.#channel = LCell.new();
		this.#consumers = new Map();
		Object.freeze(this);
	}

	open = () => {
		return this.#channel.map((channel?: Channel) => {
			if (channel) {
				return channel;
			} else {
				return this.connection.use((connection: Connection) => {
					return connection.createChannel().then(async (channel) => {
						channel
							.on('error', console.error)
							.on('close', () => {
								this.#channel.set();
								if (this.#options.reconnect > 0) this.open();
							});

						const consumers = this.#consumers.values();
						this.#consumers.clear();
						for (const [ queue, consumer, options ] of consumers) {
							const reply = await RichChannel.consume(channel, queue, consumer, options);
							this.#consumers.set(reply.consumerTag, [ queue, consumer, options ]);
						}
						return channel;
					})
				})
				.catch((error) => {
					this.#channel.set();
					if (this.#options.reconnect > 0) setTimeout(this.open, this.#options.reconnect);
					throw(error);
				})
			}
		})
	}

	use = (fn: (channel: Channel) => any) => {
		return this.#channel.use((channel) => {
			if (channel) {
				return fn(channel);
			} else {
				throw new Error('amqp channel is not established');
			}
		});
	}

	close = () => {
		this.#options.reconnect = 0;
		return this.#channel.map((channel?: Channel) => {
			if (channel) channel.close();
			return undefined;
		});
	}

	// ==================================================

	Queue = (name: string, options?: Options.AssertQueue) => {
		return new RichQueue.default(this, name, options);
	}

	assertQueue = (queue: string, options?: Options.AssertQueue) => {
		return this.use((channel) => channel.assertQueue(queue, options));
	}

	checkQueue = (queue: string) => {
		return this.use((channel) => channel.checkQueue(queue));
	}

	deleteQueue = (queue: string, options?: Options.DeleteQueue) => {
		return this.use((channel) => channel.deleteQueue(queue, options));
	}

	bindQueue = (queue: string, exchange: string, pattern: string, args?: any) => {
		return this.use((channel) => channel.bindQueue(queue, exchange, pattern, args));
	}

	unbindQueue = (queue: string, exchange: string, pattern: string, args?: any) => {
		return this.use((channel) => channel.unbindQueue(queue, exchange, pattern, args));
	}

	sendToQueue = (queue: string, content: Buffer, options?: Options.Publish) => {
		return this.use((channel) => channel.sendToQueue(queue, content, options));
	}

	consume = async (queue: string, consumer: (channel: Channel) => MessageConsumer, options?: Options.Consume) => {
		const reply = await this.use((channel) => RichChannel.consume(channel, queue, consumer, options));
		this.#consumers.set(reply.consumerTag, [ queue, consumer, options ]);
		return reply;
	}

	cancel = async (consumerTag: string) => {
		const reply = await this.use((channel) => channel.cancel(consumerTag));
		this.#consumers.delete(consumerTag);
		return reply;
	}

	// ==================================================

	Exchange = (name: string, type: string, options?: Options.AssertQueue) => {
		return new RichExchange.default(this, name, type, options);
	}

	assertExchange = (exchange: string, type: string, options?: Options.AssertExchange) => {
		return this.use((channel) => channel.assertExchange(exchange, type, options));
	}

	checkExchange = (exchange: string) => {
		return this.use((channel) => channel.checkExchange(exchange));
	}

	deleteExchange = (exchange: string, options?: Options.DeleteQueue) => {
		return this.use((channel) => channel.deleteExchange(exchange, options));
	}

	publish = (exchange: string, routingKey: string, content: Buffer, options?: Options.Publish) => {
		return this.use((channel) => channel.publish(exchange, routingKey, content, options));
	}

	bindExchange = (destination: string, source: string, pattern: string, args?: any) => {
		return this.use((channel) => channel.bindExchange(destination, source, pattern, args));
	}

	unbindExchange = (destination: string, source: string, pattern: string, args?: any) => {
		return this.use((channel) => channel.unbindExchange(destination, source, pattern, args));
	}

	// ==================================================

	static consume(channel: Channel, queue: string, factory: (channel: Channel) => MessageConsumer, options?: Options.Consume) {
		const consumer = factory(channel);
		if (typeof consumer === 'function') {
			return channel.consume(queue, (msg: ConsumeMessage | null) => {
				if (msg) consumer(msg);
			}, options);
		} else {
			throw new Error(`Consumer is not a function: ${consumer}`);
		}
	}

	static assert(instance: any) {
		if (instance instanceof RichChannel) {
			return true;
		} else {
			throw new Error(`Invalid instance: ${instance}`);
		}
	}
}

export default RichChannel;

