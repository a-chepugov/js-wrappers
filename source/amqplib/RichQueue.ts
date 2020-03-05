import { Channel, ConsumeMessage, Options } from 'amqplib';
import * as RichChannel from './RichChannel';
import * as RichExchange from './RichExchange';
import * as RichMessage from './RichMessage';

export class RichQueue<T> {
	channel: RichChannel.default;
	name: string;
	options?: Options.AssertQueue;
	serialize: (payload: T) => Buffer;
	deserialize: (buffer: Buffer) => T;

	constructor(
		channel: RichChannel.default,
		name: string,
		options?: Options.AssertQueue,
		serialize = (payload: T) => Buffer.from(JSON.stringify(payload)),
		deserialize = (buffer: Buffer) => JSON.parse(String(buffer))
	) {
		RichChannel.default.assert(channel);
		this.channel = channel;
		this.name = name;
		this.options = options;
		this.serialize = serialize;
		this.deserialize = deserialize;
		Object.freeze(this);
	}

	assert() {
		return this.channel.assertQueue(this.name, this.options);
	}

	check() {
		return this.channel.checkQueue(this.name);
	}

	delete(options?: Options.DeleteQueue) {
		return this.channel.deleteQueue(this.name, options);
	}

	bind(exchange: RichExchange.default<T>, pattern: string, args?: any) {
		RichExchange.default.assert(exchange);
		return this.channel.bindQueue(this.name, exchange.name, pattern, args);
	}

	unbind(exchange: RichExchange.default<T>, pattern: string, args?: any) {
		RichExchange.default.assert(exchange);
		return this.channel.unbindQueue(this.name, exchange.name, pattern, args);
	}

	publish(content: T, options?: Options.Publish) {
		return this.channel.sendToQueue(this.name, this.serialize(content), options);
	}

	consume(consumer: RichMessage.RichConsumer<T>, options?: Options.Consume) {
		const fn = (channel: Channel) => (msg: ConsumeMessage) => consumer(new RichMessage.default(channel, msg, this.deserialize));
		return this.channel.consume(this.name, fn, options);
	}

  cancel(consumerTag: string) {
		return this.channel.cancel(consumerTag);
	};

	static assert(instance: any) {
		if (instance instanceof RichQueue) {
			return true;
		} else {
			throw new Error(`Invalid instance: ${instance}`);
		}
	}

}

export default RichQueue;
