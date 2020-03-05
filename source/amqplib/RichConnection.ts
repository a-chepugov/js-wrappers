import { Connection, Options, connect } from 'amqplib';

import LCell from '../lib/LCell';
import * as RichChannel from './RichChannel';

export type RichConnectionOptions = { reconnect: number };

export class RichConnection {
	url: string | Options.Connect;
	socketOptions: any;
	#options: RichConnectionOptions;

	#connection: LCell<Connection>;

	constructor(url: string | Options.Connect, socketOptions: any, options?: RichConnectionOptions) {
		this.url = url;

		this.socketOptions = socketOptions;
		if (!socketOptions?.clientProperties?.connection_name) {
			console.info('Provide `clientProperties.connection_name` for better maintenance experience');
		}

		this.#options = { reconnect: Number(options?.reconnect) };

		this.#connection = LCell.new();

		Object.freeze(this);
	}

	info = () => {
		return this.#connection.use((connection) => connection
			?	connection?.connection?.serverProperties
			: undefined);
	}

	connect = () => {
		return this.#connection.map((connection?: Connection) => {
			if (connection) {
				return connection;
			} else {
				return connect(this.url, this.socketOptions).then((connection: Connection) => {
					return connection
						.on('error', console.error)
						.on('close', () => {
							this.#connection.set();
							if (this.#options.reconnect > 0) this.connect();
						});
				})
				.catch((error) => {
					this.#connection.set();
					if (this.#options.reconnect > 0) setTimeout(this.connect, this.#options.reconnect);
					throw(error);
				})
			}
		})
	}

	use = (fn: (connection: Connection) => any) => {
		return this.#connection.use((connection) => {
			if (connection) {
				return fn(connection);
			} else {
				throw new Error('amqp connection is not established');
			}
		});
	}

	close = () => {
		this.#options.reconnect = 0;
		return this.#connection.map((connection?: Connection) => {
			if (connection) connection.close();
			return undefined;
		});
	}

	Channel = (options?: RichChannel.RichChannelOptions) => {
		return new RichChannel.RichChannel(this, options);
	}

	static assert(instance: any) {
		if (instance instanceof RichConnection) {
			return true;
		} else {
			throw new Error(`Invalid instance: ${instance}`);
		}
	}
}



export default RichConnection;

