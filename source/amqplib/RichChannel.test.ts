import pkg from '../../package.json';
import RichConnection from './RichConnection';

const opts = { clientProperties: { connection_name: `${pkg.name}:${pkg.version}-channel` } };
const url = 'amqp://guest:guest@127.0.0.1:5672';

describe('Channel', () => {
	const rconnection = new RichConnection(url, opts);
	rconnection.connect();

	test('open', async () => {
		const rchannel = rconnection.Channel();
		rchannel.open();
		return rchannel.use((channel) => {
			expect(channel.consumers).toHaveProperty('size', 0)
		})
		.finally(() => rchannel.close())
	});

	test('close', async() => {
		const rchannel = rconnection.Channel();
		rchannel.open();
		await rchannel.close();
		await expect(() => rchannel.use()).rejects.toEqual(new Error('amqp channel is not established'));
	});


	test('reconnect', (done) => {
		const rchannel = rconnection.Channel({ reconnect: 1 });
		rchannel.open();
		rchannel.use((channel) => channel.close())
		.then(() => {
			return rchannel.use((channel) => {
				expect(channel.consumers).toHaveProperty('size', 0)
				done();
			})
		})
		.catch(done)
		.finally(() => rchannel.close())
	});

	afterAll(async () => {
		await rconnection.close();
	});
})

