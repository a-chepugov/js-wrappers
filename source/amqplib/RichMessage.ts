import { ConsumeMessage, Channel } from 'amqplib';

export type RichConsumer<T> = (message: RichMessage<T>) => void;

export class RichMessage<T> {
	channel: Channel;
	msg: ConsumeMessage;
	deserialize: (content: Buffer) => T;

	constructor(channel: Channel, msg: ConsumeMessage, deserialize: (content: Buffer) => T) {
		this.channel = channel;
		this.msg = msg;
		this.deserialize = deserialize;
		Object.freeze(this);
	}

	get payload() {
		return this.deserialize(this.msg.content);
	}

	get headers() {
		return this.msg.properties?.headers || {};
	}

	get deaths(): number {
		return Number(this.headers?.['x-death']?.[0]?.count) || 0;
	}

	ack(allUpTo?: boolean) {
		return this.channel.ack(this.msg, allUpTo);
	}

	nack(allUpTo?: boolean, requeue?: boolean) {
		return this.channel.nack(this.msg, allUpTo, requeue);
	}

	die() {
		return this.channel.nack(this.msg, false, false);
	}
}

export default RichMessage;

