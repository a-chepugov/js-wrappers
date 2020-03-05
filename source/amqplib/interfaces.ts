export interface ISubscriber<T> {
	(payload: T, ...args: any[]): any;
}

export interface IPublisher<Payload, SubscriptionID> {
	subscribe(subscriber: ISubscriber<Payload>, ...args: any[]): any;
	unsubscribe(subscription: SubscriptionID, ...args: any[]): any;
	publish(payload: Payload, ...args: any[]): any;
}

export interface IChannel<Payload, Topic, SubscriptionID> {
	subscribe(topic: Topic, subscriber: ISubscriber<Payload>, ...args: any[]): any;
	unsubscribe(topic: Topic, subscription: SubscriptionID, ...args: any[]): any;
	publish(topic: Topic, payload: Payload, ...args: any[]): any;
}

