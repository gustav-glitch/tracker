export type Signal = 'in-stock' | 'out-of-stock' | 'changed' | 'unknown';

export type StrategyResult = {
  signal: Signal;
  evidence: string;
  catalogItems?: string[]; // for catalog-watch: full list of current items
};

export type StrategyInput<C> = {
  url: string;
  html: string;
  config: C;
  fetchFn: typeof fetch;
  knownItems?: string[]; // for catalog-watch: previously seen items
};

export interface Strategy<C> {
  name: string;
  run(input: StrategyInput<C>): Promise<StrategyResult>;
}
