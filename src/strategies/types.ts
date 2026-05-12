export type Signal = 'in-stock' | 'out-of-stock' | 'changed' | 'unknown';

export type StrategyResult = {
  signal: Signal;
  evidence: string;
};

export type StrategyInput<C> = {
  url: string;
  html: string;
  config: C;
  fetchFn: typeof fetch;
};

export interface Strategy<C> {
  name: string;
  run(input: StrategyInput<C>): Promise<StrategyResult>;
}
