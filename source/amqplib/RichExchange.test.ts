import pkg from '../../package.json';
import RichConnection from './RichConnection';
import RichExchange from './RichExchange';
import RichQueue from './RichQueue';

import sleep from '../lib/sleep';

describe('RichExchange', () => {
	const opts = { clientProperties: { connection_name: `${pkg.name}:${pkg.version}-exchange` } };
	const	connection = new RichConnection('amqp://guest:guest@127.0.0.1:5672', opts);
	connection.connect();
	const channel = connection.Channel();
	channel.open();

	test('create/delete', async () => {
		const exchange = new RichExchange(channel, 'test');
		await exchange.assert();
		const result = await exchange.check();
		await exchange.delete();
		expect(result).not.toEqual(null);
	});

	test('push data', async () => {
		const eName = 'test-exhange-push-' + Math.random();
		const qName = 'test-exhange-push-' + Math.random();
		const exchange = new RichExchange(channel, eName, 'direct');
		await exchange.assert();
		const queue = new RichQueue(channel, qName);
		await queue.assert();
		await queue.bind(exchange, 'topic1');
		await exchange.publish('topic1', 'test');
		await sleep(1000)();
		const result = await queue.check();
		await queue.delete();
		await exchange.delete();
		expect(result).toHaveProperty('messageCount', 1);
	});

	test('bind', async () => {
		const eName1 = 'test-exhange-push-' + Math.random();
		const eName2 = 'test-exhange-push-' + Math.random();
		const qName = 'test-exhange-push-' + Math.random();
		const exchange1 = new RichExchange(channel, eName1, 'direct');
		await exchange1.assert();
		const exchange2 = new RichExchange(channel, eName2, 'direct');
		await exchange2.assert();

		const queue = new RichQueue(channel, qName);
		await queue.assert();
		await queue.bind(exchange2, 'topic2');

		await exchange2.bind(exchange1, 'topic2');

		await exchange1.publish('topic2', Buffer.from('test'));
		await sleep(1000)();

		const result = await queue.check();
		await queue.delete();
		await exchange1.delete();
		await exchange2.delete();
		expect(result).toHaveProperty('messageCount', 1);
	});

	afterAll(async () => {
		await channel.close();
		await connection.close();
	});
})

