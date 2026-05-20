from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

@app.route('/api/stock/<symbol>', methods=['GET'])
def get_stock_data(symbol):
    try:
        # Fetch data using yfinance
        stock = yf.Ticker(symbol)
        
        # Get free cash flow (most recent)
        cash_flow = stock.cash_flow
        fcf = None
        if cash_flow is not None and not cash_flow.empty:
            if 'Free Cash Flow' in cash_flow.index:
                # Get the most recent FCF and convert to Crores (yfinance usually returns raw numbers)
                recent_fcf = cash_flow.loc['Free Cash Flow'].iloc[0]
                if recent_fcf is not None and str(recent_fcf) != 'nan':
                    fcf = recent_fcf / 10000000  # Convert to Crores
        
        # Get shares outstanding
        info = stock.info
        shares = info.get('sharesOutstanding', None)
        if shares is not None:
            shares = shares / 10000000  # Convert to Crores
            
        current_price = info.get('currentPrice', None)

        return jsonify({
            'symbol': symbol,
            'fcf': round(fcf, 2) if fcf else None,
            'sharesOutstanding': round(shares, 2) if shares else None,
            'currentPrice': current_price
        })

    except Exception as e:
        print(f"Error fetching data for {symbol}: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5050, debug=True)
