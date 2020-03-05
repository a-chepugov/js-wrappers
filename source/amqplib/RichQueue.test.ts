import pkg from '../../package.json';
import RichConnection from './RichConnection';
import RichQueue from './RichQueue';

import sleep from '../lib/sleep';

const opts = { clientProperties: { connection_name: `${pkg.name}:${pkg.version}-queue` } };
const url = 'amqp://guest:guest@127.0.0.1:5672';

describe('RichQueue', () => {
	const	connection = new RichConnection(url, opts);
	connection.connect();
	const channel = connection.Channel();
	channel.open();

	test('create/delete', async () => {
		const qName = 'test-queue-create-' + Math.random();
		const queue = new RichQueue(channel, qName);
		await queue.assert();
		const result = await queue.check();
		await queue.delete();
		expect(result).toHaveProperty('queue', qName);
	});

	test('queue consumers manipulation', async() => {
		const qName = 'test-queue-consumers-' + Math.random();
		const queue = new RichQueue(channel, qName);
		await queue.assert();

		const { consumerTag } = await queue.consume((message) => {
			message.ack();
		});
		await sleep(1000)();
		const result1 = await queue.check();
		await queue.cancel(consumerTag);
		await sleep(1000)();
		const result2 = await queue.check();
		await queue.delete();
		expect(result1.consumerCount).toEqual(1);
		expect(result2.consumerCount).toEqual(0);
	});

	test('push data', async () => {
		const qName = 'test-queue-push-' + Math.random();
		const queue = new RichQueue(channel, qName);
		await queue.assert();
		const result1 = await queue.check();
		await queue.publish('test');
		await sleep(1000)();
		const result2 = await queue.check();
		await queue.delete();
		expect(result1.messageCount).toEqual(0);
		expect(result2.messageCount).toEqual(1);
	});

	test('consume data', async () => {
		const qName = 'test-queue-consume-' + Math.random();
		const queue = new RichQueue(channel, qName);

		await queue.assert();
		await queue.publish('test');

		return new Promise((resolve, reject) => {
			queue.consume(async (message) => {
				try {
					await message.ack();
					await sleep(1000)();
					const result = await queue.check();

					await queue.delete();

					expect(result).toHaveProperty('messageCount', 0);
					resolve();
				} catch (error) {
					reject(error);
				}
			});
		})
	});

	afterAll(async () => {
		await channel.close();
		await connection.close();
	});
})

