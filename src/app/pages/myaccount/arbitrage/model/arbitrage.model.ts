export interface ArbitrageOpportunity {
  id: string;
  token: string;
  buyExchange: string;
  sellExchange: string;
  buyPrice: number | null;       
  sellPrice: number | null;       
  spreadPercent: number;         
  spreadAmount: number | null;   
  estimatedProfit: number | null; 
  buyVolume24h?: number;
  sellVolume24h?: number;
  buyLiquidity?: number;
  sellLiquidity?: number;
  updatedAt: string;
  locked: boolean;
  prices: { exchange: string; price: number }[]; 
}

export interface GetOpportunitiesParams {
  token?: string;
  minSpreadPercent?: number;
  limit?: number;
}

export interface PlaceTradeReqBody {
  token: string;
  buyExchange: string;
  sellExchange: string;
  quoteAmount: number;
  expectedMinSpreadPercent?: number;
}

export interface PlaceTradeResBody {
  id: string;
  status: string;
  token: string;
  buyExchange: string;
  sellExchange: string;
  executedBuyPrice: number;
  executedSellPrice: number;
  quoteAmount: number;
  realizedSpreadPercent: number;
  realizedProfit: number;
  createdAt: string;
}

export const EXCHANGE_IDS: string[] = [
  'KuCoin',
  'OKX',
  'GateIo',
  'MEXC',
  'HTX',
  'Bitget',
  'Kraken',
  'Coinbase',
  'Bybit',
];

export interface ExchangeConfig {
  id: string;
  label: string;
  colorPrimary: string;
  colorSecondary: string;
  textOnPrimary: string;
}

export const EXCHANGE_CONFIG: Record<string, ExchangeConfig> = {

  OKX:      { id: 'OKX',      label: 'OKX',      colorPrimary: '#000000', colorSecondary: '#2E2E2E', textOnPrimary: '#ffffff' },
  GateIo:   { id: 'GateIo',   label: 'Gate.io',  colorPrimary: '#2354E6', colorSecondary: '#132C6E', textOnPrimary: '#ffffff' },
  MEXC:     { id: 'MEXC',     label: 'MEXC',     colorPrimary: '#00A971', colorSecondary: '#00593C', textOnPrimary: '#ffffff' },
  HTX:      { id: 'HTX',      label: 'HTX',      colorPrimary: '#2E5CFF', colorSecondary: '#132C6E', textOnPrimary: '#ffffff' },
  Bybit:    { id: 'Bybit',    label: 'Bybit',    colorPrimary: '#F7A600', colorSecondary: '#1A1A1A', textOnPrimary: '#1A1A1A' },
  Bitget:   { id: 'Bitget',   label: 'Bitget',   colorPrimary: '#00CB74', colorSecondary: '#00693C', textOnPrimary: '#ffffff' },
  Kraken:   { id: 'Kraken',   label: 'Kraken',   colorPrimary: '#5741D9', colorSecondary: '#2E2170', textOnPrimary: '#ffffff' },
  Coinbase: { id: 'Coinbase', label: 'Coinbase', colorPrimary: '#0052FF', colorSecondary: '#00287A', textOnPrimary: '#ffffff' },
  KuCoin:   { id: 'KuCoin',   label: 'KuCoin',   colorPrimary: '#24AE8F', colorSecondary: '#0E3F35', textOnPrimary: '#ffffff' },
};

