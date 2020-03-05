import { Options } from 'amqplib';

import * as RichChannel from './RichChannel';

export class RichExchange<T> {
	channel: RichChannel.default;
	name: string;
	type: string;
	options?: Options.AssertExchange;
	serialize: (payload: T) => Buffer;

	constructor(
		channel: RichChannel.default,
		name: string, type: string,
		options?: Options.AssertExchange,
		serialize = (payload: T) => Buffer.from(JSON.stringify(payload))
	) {
		RichChannel.default.assert(channel);
		this.channel = channel;
		this.name = name;
		this.type = type;
		this.options = options;

		this.serialize = serialize;

		Object.freeze(this);
	}

	assert() {
		return this.channel.assertExchange(this.name, this.type, this.options);
	}

	check() {
		return this.channel.checkExchange(this.name);
	}

	delete(options?: Options.DeleteExchange) {
		return this.channel.deleteExchange(this.name, options);
	}

	bind(source: RichExchange<T>, pattern: string, args?: any) {
		RichExchange.assert(source);
		return this.channel.bindExchange(this.name, source.name, pattern, args);
	}

	unbind(source: RichExchange<T>, pattern: string, args?: any) {
		RichExchange.assert(source);
		return this.channel.unbindExchange(this.name, source.name, pattern, args);
	}

	publish(routingKey: string, content: T, options?: Options.Publish) {
		return this.channel.publish(this.name, routingKey, this.serialize(content), options);
	}

	static assert(instance: any) {
		if (instance instanceof RichExchange) {
			return true;
		} else {
			throw new Error(`Invalid instance: ${instance}`);
		}
	}
}

export default RichExchange;
