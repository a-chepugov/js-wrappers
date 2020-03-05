import {connect, Connection, Channel} from 'amqplib';

export type Config = {
    user: string,
    password: string,
    host: string,
    port: string
}

export type Options = {
    [name: string]: any
}

export type Queue = {
    name: string,
    options: Options
}

export type Exchange = {
    name: string,
    type: string,
    options: Options
}

export default class RabbitMQWrapper {
    private readonly config: Config;

    // @ts-ignore
    private _connection: Connection;
    // @ts-ignore
    private _channel: Channel;

    constructor(config: Config) {
        this.config = config;

        process.once('SIGINT', () => {
            return this.disconnect();
        });
    }

    private async disconnect() {
        try {
            await this._channel.close();
        } catch (error) {
            console.error(error);
        }
        await this._connection.close();
    }

    private async _connect(): Promise<Connection> {
        const {user, password, host, port}: Config = this.config;
        const url = `amqp://${user}:${password}@${host}:${port}`;

        const connection = await connect(url);
        connection.on('error', () => {
            return connection.close();
        });
        return connection;
    }


    async connect(): Promise<Connection> {
        this._connection = this._connection ?
            this._connection :
            this._connection = await this._connect();

        this._connection.on('close', () => {
            delete this._connection;
        });

        return this._connection;
    }


    get connection(): Promise<Connection> {
        return this.connect();
    }

    private async _createChannel(): Promise<Channel> {
        const connection: Connection = await this.connection;
        const channel = await connection.createChannel();

        channel.on('error', () => {
            return channel.close();
        });

        return channel;
    }

    async createChannel() {
        this._channel = this._channel ?
            this._channel :
            this._channel = await this._createChannel();

        this._channel.on('close', () => {
            delete this._channel;
        });

        return this._channel;
    }

    get channel(): Promise<Channel> {
        return this.createChannel();
    }

    async prefetch(count: number) {
        const channel = await this.channel;
        return channel.prefetch(count);
    }

    async assertQueue(queue: Queue) {
        const channel = await this.channel;
        const {name, options} = queue;
        return channel.assertQueue(name, options);
    }

    async sendToQueue(queue: Queue, message: string, options: Options) {
        await this.assertQueue(queue);
        const channel = await this.channel;
        return channel.sendToQueue(queue.name, Buffer.from(message), options);
    }

    async assertExchange(exchange: Exchange) {
        const channel = await this.channel;
        const {name, type, options} = exchange;
        return channel.assertExchange(name, type, options);
    }

    async publish(exchange: Exchange, routingKey = '', message: string, options: Options) {
        await this.assertExchange(exchange);
        const channel = await this.channel;
        return channel.publish(exchange.name, routingKey, Buffer.from(message), options);
    }

    async bindQueue(queue: Queue, exchange: Exchange, pattern: string, args?: any) {
        await Promise.all([
            this.assertQueue(queue),
            this.assertExchange(exchange)
        ]);
        const channel = await this.channel;
        return channel.bindQueue(queue.name, exchange.name, pattern, args);
    }

    async consume(queue: Queue, handler: Function, options: Options) {
        await this.assertQueue(queue);
        const channel = await this.channel;
        return channel.consume(queue.name, handler(channel), options);
    }
};
