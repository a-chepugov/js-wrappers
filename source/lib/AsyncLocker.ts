export class AsyncLocker {
	#gate: Promise<void>;

	constructor() {
		this.#gate = Promise.resolve();
		Object.seal(this);
	}

	close = () => {
		let nextOpen: (a: void) => void;

		const nextGate = new Promise((resolve: (a: void) => void) => {
			nextOpen = resolve;
		});

		const oldGate = this.#gate;
		// Обновляем состояние затвора
		this.#gate = oldGate.then(() => nextGate);

		return oldGate.then(() => {
			return nextOpen;
		});
	}
}

export default AsyncLocker;

