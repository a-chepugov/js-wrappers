import pkg from '../../package.json';
import RichConnection from './RichConnection';

import { Connection, ChannelModel } from 'amqplib';

const opts = { clientProperties: { connection_name: `${pkg.name}:${pkg.version}-connection` } };
const url = 'amqp://guest:guest@127.0.0.1:5672';

describe('Connection', () => {
	const rconnection = new RichConnection(url, opts);
	rconnection.connect();

	test('connect', async () => {
		const rconnection = new RichConnection(url, opts);
		rconnection.connect();
		return new Promise((resolve, reject) => {
			rconnection.use((connection) => expect(connection).toHaveProperty('createChannel'))
			.then(resolve, reject)
			.finally(() => rconnection.close())
		})
	});

	test('close', async () => {
		const rconnection = new RichConnection(url, opts);
		await rconnection.connect();
		await rconnection.close();
		expect(await rconnection.info()).toEqual(undefined);
		await expect(() => rconnection.use()).rejects.toEqual(new Error('amqp connection is not established'));
	});

	test('reconnect', (done) => {
		const rconnection = new RichConnection(url, opts, { reconnect: 1 });
		rconnection.connect();
		rconnection.use((connection) => connection.close())
			.then(() => {
				return rconnection.use( async (connection) => {
					const info = connection?.connection?.serverProperties;
					expect(info).toHaveProperty('product', 'RabbitMQ');
					done();
				})
			})
			.finally(() => rconnection.close())
			.catch(done);
	});

	test('info', async () => {
		expect(await rconnection.info()).toHaveProperty('product', 'RabbitMQ');
	});

	test('use', (done) => {
		rconnection.use(async (connection) => {
			const info = connection?.connection?.serverProperties;
			expect(info).toHaveProperty('product', 'RabbitMQ');
			done();
		})
		.catch(done);
	});

	afterAll(async () => {
		await rconnection.close();
	});
})

