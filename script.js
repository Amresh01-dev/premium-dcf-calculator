document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('stock-search');
    const autocompleteList = document.getElementById('autocomplete-list');
    
    // Inputs
    const currentFcfInput = document.getElementById('current-fcf');
    const growthRate1to5Input = document.getElementById('growth-rate-1-5');
    const growthRate6to10Input = document.getElementById('growth-rate-6-10');
    const discountRateInput = document.getElementById('discount-rate');
    const terminalGrowthInput = document.getElementById('terminal-growth');
    const sharesOutstandingInput = document.getElementById('shares-outstanding');
    const currentPriceInput = document.getElementById('current-price');
    
    // Outputs
    const intrinsicValueDisplay = document.getElementById('intrinsic-value');
    const valuationStatusDisplay = document.getElementById('valuation-status');
    const pvFcfDisplay = document.getElementById('pv-fcf');
    const terminalValDisplay = document.getElementById('terminal-val');
    const pvTerminalValDisplay = document.getElementById('pv-terminal-val');
    const totalEvDisplay = document.getElementById('total-ev');
    const chartContainer = document.getElementById('cashflow-chart-container');
    
    const calculateBtn = document.getElementById('calculate-btn');

    let stocksData = [];

    // Format currency
    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 2
        }).format(value);
    };

    // Load stocks data
    fetch('stocks.json')
        .then(response => response.json())
        .then(data => {
            stocksData = data;
        })
        .catch(err => console.error("Error loading stocks list:", err));

    // Autocomplete functionality
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase();
        autocompleteList.innerHTML = '';
        
        if (!query) {
            autocompleteList.style.display = 'none';
            return;
        }

        const filtered = stocksData.filter(stock => 
            stock.symbol.toLowerCase().includes(query) || 
            stock.name.toLowerCase().includes(query)
        ).slice(0, 10); // Limit to top 10

        if (filtered.length > 0) {
            autocompleteList.style.display = 'block';
            filtered.forEach(stock => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="symbol">${stock.symbol}</span> <span class="name">${stock.name}</span>`;
                li.addEventListener('click', async () => {
                    searchInput.value = stock.symbol;
                    autocompleteList.style.display = 'none';
                    await fetchStockData(stock.symbol);
                });
                autocompleteList.appendChild(li);
            });
        } else {
            autocompleteList.style.display = 'none';
        }
    });

    searchInput.addEventListener('keypress', async function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            const symbol = searchInput.value.toUpperCase().trim();
            if (symbol) {
                autocompleteList.style.display = 'none';
                await fetchStockData(symbol);
            }
        }
    });

    const fetchStockData = async (symbol) => {
        // Show loading state
        const originalBtnText = calculateBtn.textContent;
        calculateBtn.textContent = 'Fetching Data...';
        calculateBtn.disabled = true;
        
        try {
            // Append .NS if the user didn't type an exchange suffix
            const querySymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
            const response = await fetch(`http://localhost:5050/api/stock/${querySymbol}`);
            if(response.ok) {
                const data = await response.json();
                if (data.error) {
                    alert("Warning: Could not fetch data (Yahoo Finance may be rate-limiting). Please enter values manually.");
                } else {
                    if(data.fcf !== null) currentFcfInput.value = data.fcf;
                    if(data.sharesOutstanding !== null) sharesOutstandingInput.value = data.sharesOutstanding;
                    if(data.currentPrice !== null) currentPriceInput.value = data.currentPrice;
                    
                    // Visual feedback
                    currentFcfInput.style.borderColor = 'var(--success)';
                    sharesOutstandingInput.style.borderColor = 'var(--success)';
                    currentPriceInput.style.borderColor = 'var(--success)';
                    setTimeout(() => {
                        currentFcfInput.style.borderColor = 'var(--input-border)';
                        sharesOutstandingInput.style.borderColor = 'var(--input-border)';
                        currentPriceInput.style.borderColor = 'var(--input-border)';
                    }, 2000);
                }
            } else {
                alert(`Backend failed to fetch data for ${symbol}. Please check if the symbol is correct or enter values manually.`);
            }
        } catch(err) {
            console.error('Failed to fetch stock data from backend', err);
            alert("Backend failed. Please ensure the Python server is running.");
        } finally {
            calculateBtn.textContent = originalBtnText;
            calculateBtn.disabled = false;
        }
    };

    // Hide autocomplete when clicking outside
    document.addEventListener('click', function(e) {
        if (e.target !== searchInput && e.target !== autocompleteList) {
            autocompleteList.style.display = 'none';
        }
    });

    // DCF Calculation Logic
    const calculateDCF = () => {
        const currentFcf = parseFloat(currentFcfInput.value);
        const g1 = parseFloat(growthRate1to5Input.value) / 100;
        const g2 = parseFloat(growthRate6to10Input.value) / 100;
        const r = parseFloat(discountRateInput.value) / 100;
        const tg = parseFloat(terminalGrowthInput.value) / 100;
        const shares = parseFloat(sharesOutstandingInput.value);

        // Validation
        if (isNaN(currentFcf) || isNaN(g1) || isNaN(g2) || isNaN(r) || isNaN(tg) || isNaN(shares)) {
            alert("Please fill in all numerical fields correctly.");
            return;
        }
        
        if (r <= tg) {
            alert("Discount rate must be strictly greater than the terminal growth rate.");
            return;
        }

        let projectedCashFlows = [];
        let presentValues = [];
        let cumulativePV = 0;

        let previousFcf = currentFcf;
        let maxFcfForChart = currentFcf;

        // Years 1-5
        for (let i = 1; i <= 5; i++) {
            let fcf = previousFcf * (1 + g1);
            projectedCashFlows.push(fcf);
            let pv = fcf / Math.pow(1 + r, i);
            presentValues.push(pv);
            cumulativePV += pv;
            previousFcf = fcf;
            if(fcf > maxFcfForChart) maxFcfForChart = fcf;
        }

        // Years 6-10
        for (let i = 6; i <= 10; i++) {
            let fcf = previousFcf * (1 + g2);
            projectedCashFlows.push(fcf);
            let pv = fcf / Math.pow(1 + r, i);
            presentValues.push(pv);
            cumulativePV += pv;
            previousFcf = fcf;
            if(fcf > maxFcfForChart) maxFcfForChart = fcf;
        }

        // Terminal Value
        // TV = FCF_10 * (1 + tg) / (r - tg)
        const fcf10 = projectedCashFlows[9];
        const terminalValue = (fcf10 * (1 + tg)) / (r - tg);
        const pvTerminalValue = terminalValue / Math.pow(1 + r, 10);

        // Enterprise Value
        const totalEnterpriseValue = cumulativePV + pvTerminalValue;

        // Intrinsic Value per Share
        const intrinsicValuePerShare = totalEnterpriseValue / shares;

        // Update UI
        intrinsicValueDisplay.textContent = formatCurrency(intrinsicValuePerShare);
        pvFcfDisplay.textContent = formatCurrency(cumulativePV);
        terminalValDisplay.textContent = formatCurrency(terminalValue);
        pvTerminalValDisplay.textContent = formatCurrency(pvTerminalValue);
        totalEvDisplay.textContent = formatCurrency(totalEnterpriseValue);
        
        // Valuation Status
        if(valuationStatusDisplay) {
            const currentPrice = parseFloat(currentPriceInput.value);
            if(!isNaN(currentPrice) && currentPrice > 0) {
                const upside = ((intrinsicValuePerShare - currentPrice) / currentPrice) * 100;
                if(intrinsicValuePerShare > currentPrice) {
                    valuationStatusDisplay.textContent = `Undervalued (${upside.toFixed(2)}% Upside)`;
                    valuationStatusDisplay.style.color = '#10b981'; // Green
                } else {
                    valuationStatusDisplay.textContent = `Overvalued (${Math.abs(upside).toFixed(2)}% Downside)`;
                    valuationStatusDisplay.style.color = '#ef4444'; // Red
                }
            } else {
                valuationStatusDisplay.textContent = '';
            }
        }

        // Update Chart
        renderChart(projectedCashFlows, maxFcfForChart);
    };

    const renderChart = (cashFlows, maxVal) => {
        chartContainer.innerHTML = ''; // clear
        
        cashFlows.forEach((cf, index) => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            // Calculate height percentage based on max value to fit in container
            // Ensure a min height for visibility
            const heightPercent = Math.max((cf / maxVal) * 100, 5); 
            bar.style.height = `${heightPercent}%`;
            bar.title = `Year ${index + 1}: ₹${cf.toFixed(2)} Cr`;
            
            // Add slight delay for waterfall effect
            bar.style.animationDelay = `${index * 0.05}s`;
            
            chartContainer.appendChild(bar);
        });
    };

    calculateBtn.addEventListener('click', calculateDCF);
    
    // Auto-calculate on enter
    document.querySelectorAll('.input-section input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculateDCF();
            }
        });
    });
});
