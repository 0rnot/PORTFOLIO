// APIリクエスト用の関数（CORSプロキシ経由でYahoo Financeを叩く）
export async function fetchStockChart(ticker: string, range: string = '1mo', interval: string = '1d') {
  try {
    const res = await fetch(`https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range}&interval=${interval}`);
    if (!res.ok) throw new Error('Network response was not ok');
    const json = await res.json();
    
    if (!json.chart.result || !json.chart.result[0]) return null;

    const result = json.chart.result[0];
    const timestamps = result.timestamp;
    const quote = result.indicators.quote[0];
    
    if (!timestamps || !quote) return null;

    // lightweight-chartsの形式に変換
    const data = timestamps.map((time: number, index: number) => {
      // 終値がnullの場合はフィルタリング
      if (quote.open[index] === null || quote.close[index] === null) return null;
      
      // time はそのままUNIX秒を返すか、日付文字列にする
      // lightweight-chartsは 1日ごとのデータなら yyyy-mm-dd を推奨するが
      // 分足などの場合は timezone調整済みのUnix timestampが必要
      
      let formattedTime: string | number = time;
      
      // 1d間隔の場合は yyyy-mm-dd に変換して返す
      if (interval === '1d' || interval === '1mo') {
        const d = new Date(time * 1000);
        formattedTime = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        // 5mなどの日中足の場合はローカルタイムのUnixTimestampに補正
        const d = new Date(time * 1000);
        formattedTime = time - (d.getTimezoneOffset() * 60);
      }
      
      return {
        time: formattedTime,
        open: Number(quote.open[index].toFixed(2)),
        high: Number(quote.high[index].toFixed(2)),
        low: Number(quote.low[index].toFixed(2)),
        close: Number(quote.close[index].toFixed(2)),
        value: Number(quote.close[index].toFixed(2)) // 折れ線用
      };
    }).filter(Boolean);
    
    return data;
  } catch (error) {
    console.error(`Error fetching stock data for ${ticker}:`, error);
    return null;
  }
}

// 簡易的に複数銘柄の現在価格を一括取得する
export async function fetchCurrentPrices(tickers: string[]) {
  const prices: Record<string, number> = {};
  await Promise.all(tickers.map(async (ticker) => {
    const data = await fetchStockChart(ticker, '5d', '1d');
    if (data && data.length > 0) {
      prices[ticker] = data[data.length - 1].close;
    }
  }));
  return prices;
}
