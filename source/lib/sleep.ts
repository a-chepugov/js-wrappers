export const sleep = (ms = 0) => (d: any) => new Promise((resolve) => setTimeout(resolve, ms, d));

export default sleep;
