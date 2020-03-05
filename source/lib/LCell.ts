import AsyncLocker from './AsyncLocker';

export class LCell<T> {
	#value?: T;
	#locker: AsyncLocker;

	constructor(value?: T) {
		this.#value = value;
		this.#locker = new AsyncLocker();
		Object.freeze(this);
	}

	get empty(): boolean {
		return this.#value === undefined;
	}

	set = async (value?: T): Promise<this> => {
		const open = await this.#locker.close();
		this.#value = value;
		open();
		return this;
	};

	use = async (fn: (value?: T) => any): Promise<typeof fn extends Function? ReturnType<typeof fn> : undefined> => {
		if (typeof fn === 'function') {
			const open = await this.#locker.close();
			try {
				return fn(this.#value);
			} finally {
				open();
			}
		}
	}

	map = async (fn: (value?: T) => PromiseLike<T | undefined> | T | undefined): Promise<this> => {
		if (typeof fn === 'function') {
			const open = await this.#locker.close();
			try {
				this.#value = await fn(this.#value);
			} finally {
				open();
			}
		}
		return this;
	}

	then = async (fn: (value?: T) => PromiseLike<T | undefined> | T | undefined): Promise<T | undefined> => {
		if (typeof fn === 'function') {
			const open = await this.#locker.close();
			try {
				const result = await fn(this.#value);
				this.#value = result === undefined ? this.#value : result;
			} finally {
				open();
			}
		}
		return this.#value;
	}

	toString() {
		return String(this.#value);
	}

	toJSON() {
		return this.#value;
	}

	static fromJSON<T>(value?: T) {
		return new LCell(value);
	}

	static new<T>(value?: T) {
		return new LCell(value);
	}
}

export default LCell;

