import React, { useState, useEffect, useMemo, useRef } from "react";

// Static stock registry. Startup values default to null to enforce clean first-sync state
const POPULAR_STOCKS = [
  {
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    price: null,
    prevClose: null,
  },
  {
    symbol: "TCS",
    name: "Tata Consultancy Services Ltd",
    price: null,
    prevClose: null,
  },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd", price: null, prevClose: null },
  { symbol: "INFY", name: "Infosys Ltd", price: null, prevClose: null },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd", price: null, prevClose: null },
  {
    symbol: "HINDUNILVR",
    name: "Hindustan Unilever Ltd",
    price: null,
    prevClose: null,
  },
  { symbol: "SBIN", name: "State Bank of India", price: null, prevClose: null },
  {
    symbol: "BHARTIARTL",
    name: "Bharti Airtel Ltd",
    price: null,
    prevClose: null,
  },
  { symbol: "ITC", name: "ITC Limited", price: null, prevClose: null },
  {
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    price: null,
    prevClose: null,
  },
  { symbol: "WIPRO", name: "Wipro Limited", price: null, prevClose: null },
  {
    symbol: "RELIGARE",
    name: "Religare Enterprises Ltd",
    price: null,
    prevClose: null,
  },
  {
    symbol: "RPOWER",
    name: "Reliance Power Ltd",
    price: null,
    prevClose: null,
  },
  {
    symbol: "RELIANCE-INFRA",
    name: "Reliance Infrastructure",
    price: null,
    prevClose: null,
  },
  { symbol: "TSLA", name: "Tesla Inc.", price: null, prevClose: null },
  { symbol: "AAPL", name: "Apple Inc.", price: null, prevClose: null },
];

const INITIAL_PROFILES = [
  { id: "p1", name: "Nikita", avatar: "NI" },
  { id: "p2", name: "Kabir Sharma", avatar: "KS" },
  { id: "p3", name: "Arjun Das", avatar: "AD" },
];

const INITIAL_TRANSACTIONS = [
  {
    id: "t1",
    profileId: "p1",
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    type: "BUY",
    price: 200.0,
    qty: 10,
    date: "2026-05-14",
  },
  {
    id: "t1-2",
    profileId: "p1",
    symbol: "RELIANCE",
    name: "Reliance Industries Ltd",
    type: "BUY",
    price: 220.0,
    qty: 5,
    date: "2026-05-18",
  },
  {
    id: "t2",
    profileId: "p2",
    symbol: "TATAMOTORS",
    name: "Tata Motors Ltd",
    type: "BUY",
    price: 580.0,
    qty: 15,
    date: "2026-04-10",
  },
  {
    id: "t3",
    profileId: "p2",
    symbol: "TCS",
    name: "Tata Consultancy Services",
    type: "BUY",
    price: 3400.0,
    qty: 5,
    date: "2026-02-14",
  },
];

const INITIAL_GTT = {
  p1: {
    RELIANCE: { type: "SELL", price: 300.0 },
  },
  p2: {
    TATAMOTORS: { type: "SELL", price: 680.0 },
  },
  p3: {},
};

export default function App() {
  // Load data from Local Storage if available, else fallback to initial seeds
  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem("folio_profiles");
    return saved ? JSON.parse(saved) : INITIAL_PROFILES;
  });

  const [activeProfileId, setActiveProfileId] = useState(() => {
    const saved = localStorage.getItem("folio_active_profile");
    return saved || "p1";
  });

  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem("folio_transactions");
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [gttOrders, setGttOrders] = useState(() => {
    const saved = localStorage.getItem("folio_gtt");
    return saved ? JSON.parse(saved) : INITIAL_GTT;
  });

  const [marketPrices, setMarketPrices] = useState(() => {
    const saved = localStorage.getItem("folio_prices");
    return saved ? JSON.parse(saved) : POPULAR_STOCKS;
  });

  const [lastSyncedTime, setLastSyncedTime] = useState(() => {
    return localStorage.getItem("folio_last_synced") || null;
  });

  // UI state managers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfileSwitcher, setShowProfileSwitcher] = useState(false);
  const [showCreateProfileModal, setShowCreateProfileModal] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [consoleLog, setConsoleLog] = useState(() => {
    return localStorage.getItem("folio_last_synced")
      ? [
          `[System] Market pricing loaded from local storage cache. Last synced at ${localStorage.getItem("folio_last_synced")}.`,
        ]
      : [
          "[System] Ready. All assets initialized with null valuation. Click 'Refresh' to trigger a live market sync.",
        ];
  });

  // New transaction state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [txType, setTxType] = useState("BUY");
  const [txQty, setTxQty] = useState("");
  const [txPrice, setTxPrice] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);

  const [gttType, setGttType] = useState("SELL");
  const [gttTriggerPrice, setGttTriggerPrice] = useState("");
  const [gttEnabled, setGttEnabled] = useState(false);

  // Edit states
  const [editingStockSymbol, setEditingStockSymbol] = useState("");
  const [editingLots, setEditingLots] = useState([]);
  const [editGttType, setEditGttType] = useState("SELL");
  const [editGttPrice, setEditGttPrice] = useState("");
  const [editGttEnabled, setEditGttEnabled] = useState(false);

  const [newProfileName, setNewProfileName] = useState("");
  const [notification, setNotification] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiError, setApiError] = useState(null);
  const autocompleteRef = useRef(null);

  // Persistence triggers
  useEffect(() => {
    localStorage.setItem("folio_profiles", JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    localStorage.setItem("folio_active_profile", activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem("folio_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("folio_gtt", JSON.stringify(gttOrders));
  }, [gttOrders]);

  useEffect(() => {
    localStorage.setItem("folio_prices", JSON.stringify(marketPrices));
  }, [marketPrices]);

  useEffect(() => {
    if (lastSyncedTime) {
      localStorage.setItem("folio_last_synced", lastSyncedTime);
    }
  }, [lastSyncedTime]);

  // Debounced search trigger for any stock, ETF, or mutual fund from Yahoo Finance using CORS proxy
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    // Skip trigger if input matches currently selected stock description
    if (selectedStock && searchQuery.includes(selectedStock.symbol)) {
      return;
    }

    const delayDebounceId = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const yahooSearchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}`;
        // Wrap Yahoo search in CORS proxy bypass
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooSearchUrl)}`;

        const response = await fetch(proxyUrl);
        if (response.ok) {
          const wrapperData = await response.json();
          const data = JSON.parse(wrapperData.contents);
          const quotes = (data.quotes || []).map((q) => ({
            symbol: q.symbol,
            name: q.shortname || q.longname || q.symbol,
            exchange: q.exchDisp || q.exchange || "Unknown",
            quoteType: q.quoteType || "EQUITY",
          }));
          setSearchResults(quotes);
        } else {
          console.error("Search fetch failed with status:", response.status);
        }
      } catch (error) {
        console.error("Yahoo Search Network Exception handled:", error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceId);
  }, [searchQuery, selectedStock]);

  const triggerNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addConsoleLog = (text) => {
    setConsoleLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${text}`,
      ...prev.slice(0, 30),
    ]);
  };

  // Handle click-outs for autocomplete searches
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        autocompleteRef.current &&
        !autocompleteRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [autocompleteRef]);

  // FIFO Portfolio Calculation Engine
  const { holdings, realizedPnL, totalCostBasis, totalCurrentValue } =
    useMemo(() => {
      const profileTransactions = transactions.filter(
        (t) => t.profileId === activeProfileId,
      );

      // Process chronologically (oldest first) to establish active lots & FIFO settlements
      const sorted = [...profileTransactions].sort(
        (a, b) => new Date(a.date) - new Date(b.date),
      );

      const activeBuyLots = {}; // key: stockSymbol, value: Array of lots [{ id, date, price, qtyRemaining }]
      let accumulatedRealizedPnL = 0;

      sorted.forEach((tx) => {
        const symbol = tx.symbol;
        if (!activeBuyLots[symbol]) {
          activeBuyLots[symbol] = [];
        }

        if (tx.type === "BUY") {
          // Append a new distinct buy lot to the bottom of the pile
          activeBuyLots[symbol].push({
            id: tx.id,
            date: tx.date,
            price: tx.price,
            qtyOriginal: tx.qty,
            qtyRemaining: tx.qty,
          });
        } else if (tx.type === "SELL") {
          let remainingToSell = tx.qty;

          // Match against buy lots using FIFO queue (First-In, First-Out)
          for (let i = 0; i < activeBuyLots[symbol].length; i++) {
            const lot = activeBuyLots[symbol][i];
            if (lot.qtyRemaining > 0 && remainingToSell > 0) {
              const matchQty = Math.min(lot.qtyRemaining, remainingToSell);

              // Calculate and realize capital return
              const lotCostBasis = lot.price * matchQty;
              const lotRevenue = tx.price * matchQty;
              const profitOrLoss = lotRevenue - lotCostBasis;

              accumulatedRealizedPnL += profitOrLoss;

              // Update lot and remaining sell order requirements
              lot.qtyRemaining -= matchQty;
              remainingToSell -= matchQty;
            }
            if (remainingToSell <= 0) break;
          }
        }
      });

      // Translate remaining active buy lots into distinct holding groups with live market feeds
      const calculatedHoldings = Object.keys(activeBuyLots)
        .map((symbol) => {
          const remainingLots = activeBuyLots[symbol].filter(
            (l) => l.qtyRemaining > 0,
          );
          if (remainingLots.length === 0) return null;

          const totalRemainingQty = remainingLots.reduce(
            (sum, l) => sum + l.qtyRemaining,
            0,
          );
          const totalCost = remainingLots.reduce(
            (sum, l) => sum + l.qtyRemaining * l.price,
            0,
          );
          const avgPrice =
            totalRemainingQty > 0 ? totalCost / totalRemainingQty : 0;

          const mStock = marketPrices.find((s) => s.symbol === symbol) || {
            price: null,
            prevClose: null,
            name: symbol,
          };

          const hasPrice = mStock.price !== null && mStock.price !== undefined;

          const currentVal = hasPrice ? totalRemainingQty * mStock.price : null;
          const totalProfitLoss = hasPrice ? currentVal - totalCost : null;
          const totalProfitLossPct =
            hasPrice && totalCost > 0
              ? (totalProfitLoss / totalCost) * 100
              : null;

          const dayChangeAmtPerShare = hasPrice
            ? mStock.price - mStock.prevClose
            : null;
          const totalDayChangeAmt =
            hasPrice && mStock.prevClose !== null
              ? totalRemainingQty * dayChangeAmtPerShare
              : null;
          const dayChangePct =
            hasPrice && mStock.prevClose
              ? (dayChangeAmtPerShare / mStock.prevClose) * 100
              : null;

          return {
            symbol,
            name: mStock.name,
            qty: totalRemainingQty,
            avgPrice,
            totalCost,
            currentPrice: mStock.price,
            totalCurrentValue: currentVal,
            totalProfitLoss,
            totalProfitLossPct,
            dayChangePct,
            dayChangeAmt: totalDayChangeAmt,
            purchases: remainingLots, // contains exact separated buy lots [{ id, date, price, qtyRemaining }]
          };
        })
        .filter(Boolean);

      const costBasis = calculatedHoldings.reduce(
        (sum, h) => sum + h.totalCost,
        0,
      );

      const hasAnyUnsynced = calculatedHoldings.some(
        (h) => h.currentPrice === null,
      );
      const currValue =
        !hasAnyUnsynced && calculatedHoldings.length > 0
          ? calculatedHoldings.reduce((sum, h) => sum + h.totalCurrentValue, 0)
          : null;

      return {
        holdings: calculatedHoldings,
        realizedPnL: accumulatedRealizedPnL,
        totalCostBasis: costBasis,
        totalCurrentValue: currValue,
      };
    }, [transactions, activeProfileId, marketPrices]);

  const overallPnL =
    totalCurrentValue !== null ? totalCurrentValue - totalCostBasis : null;
  const overallPnLPct =
    totalCostBasis > 0 && overallPnL !== null
      ? (overallPnL / totalCostBasis) * 100
      : 0;

  const activeProfile =
    profiles.find((p) => p.id === activeProfileId) || profiles[0];

  // Robust structured content generator utilizing Yahoo Finance
  const fetchQuotesFromYahoo = async (symbols, retries = 5, delay = 1000) => {
    const makeRequest = async () => {
      const results = [];
      for (const symbol of symbols) {
        try {
          // Attempt .NS for Indian stocks first, fallback to raw if not found
          let ticker = symbol.endsWith(".NS") ? symbol : symbol + ".NS";
          if (symbol === "AAPL" || symbol === "TSLA") {
            ticker = symbol;
          } // some manual US mapping override

          let url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
          let res = await fetch(
            `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
          );
          let text = await res.json();
          let data = JSON.parse(text.contents);

          let result = data?.chart?.result?.[0];

          if (!result && !symbol.endsWith(".NS")) {
            // try raw symbol
            url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
            res = await fetch(
              `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            );
            text = await res.json();
            data = JSON.parse(text.contents);
            result = data?.chart?.result?.[0];
          }

          if (result) {
            results.push({
              symbol: symbol,
              price: result.meta.regularMarketPrice,
              prevClose:
                result.meta.previousClose || result.meta.chartPreviousClose,
            });
          }
        } catch (e) {
          console.error("Error fetching", symbol, e);
        }
      }
      return { quotes: results };
    };

    return makeRequest();
  };

  // Direct Market Data Refresh Handler via Gemini Grounded Search
  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setShowConsole(true);
    setApiError(null);
    addConsoleLog("Fetch started");

    const symbolsToQuery = marketPrices.map((s) => s.symbol);
    if (symbolsToQuery.length === 0) {
      setIsRefreshing(false);
      addConsoleLog("Failed symbol list: No symbols logged in profile.");
      return;
    }

    try {
      addConsoleLog(
        `Constructing grounded search prompt for: ${symbolsToQuery.join(", ")}`,
      );

      const parsedOutput = await fetchQuotesFromYahoo(symbolsToQuery);
      const results = parsedOutput?.quotes || [];

      addConsoleLog(`HTTP status: 200`);
      addConsoleLog(`Number of quotes received: ${results.length}`);

      // Track missing or failed symbols
      const returnedSymbols = new Set(
        results.map((r) => r.symbol.toUpperCase()),
      );
      const failedSymbols = symbolsToQuery.filter(
        (sym) => !returnedSymbols.has(sym.toUpperCase()),
      );

      if (failedSymbols.length > 0) {
        addConsoleLog(`Failed symbol list: ${failedSymbols.join(", ")}`);
      } else {
        addConsoleLog("Failed symbol list: None");
      }

      const updatedMarketList = marketPrices.map((oldStock) => {
        const uppercaseSymbol = oldStock.symbol.toUpperCase();
        const freshQuote = results.find(
          (q) => q.symbol.toUpperCase() === uppercaseSymbol,
        );

        if (freshQuote) {
          return {
            ...oldStock,
            price: parseFloat(freshQuote.price.toFixed(2)),
            prevClose: parseFloat(freshQuote.prevClose.toFixed(2)),
          };
        }
        return oldStock;
      });

      setMarketPrices(updatedMarketList);

      const currentTimeString = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSyncedTime(currentTimeString);
      triggerNotification("Portfolio synchronized with actual market values.");
    } catch (err) {
      addConsoleLog(`Sync Failure: ${err.message}`);
      setApiError(err.message);
      triggerNotification(`Sync failed: ${err.message}`, "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Live Selection Handler: appends matching assets to the registry on select with proxy envelope
  const selectStockFromSearch = async (stock) => {
    const uppercaseSymbol = stock.symbol.toUpperCase();
    const alreadyExists = marketPrices.some(
      (s) => s.symbol.toUpperCase() === uppercaseSymbol,
    );
    let updatedPrices = [...marketPrices];
    let matchedStock = marketPrices.find(
      (s) => s.symbol.toUpperCase() === uppercaseSymbol,
    );

    if (!alreadyExists) {
      matchedStock = {
        symbol: stock.symbol,
        name: stock.name,
        price: null,
        prevClose: null,
      };
      updatedPrices.push(matchedStock);
      setMarketPrices(updatedPrices);
    }

    setSelectedStock(matchedStock);
    setSearchQuery(`${matchedStock.name} (${matchedStock.symbol})`);
    setTxPrice(""); // Allow user to fill custom purchase price
    setShowSuggestions(false);
    setApiError(null);

    // Auto-fetch the current price directly on selection utilizing search-grounded Gemini structured query
    try {
      addConsoleLog(
        `Fetching immediate quote for selected stock: ${stock.symbol}`,
      );
      const singleQuoteOutput = await fetchQuotesFromYahoo([stock.symbol]);
      const freshQuote = singleQuoteOutput?.quotes?.[0];

      if (freshQuote) {
        const livePrice = freshQuote.price;
        const liveClose = freshQuote.prevClose;

        setMarketPrices((prev) =>
          prev.map((s) => {
            if (s.symbol.toUpperCase() === uppercaseSymbol) {
              return { ...s, price: livePrice, prevClose: liveClose };
            }
            return s;
          }),
        );
        setTxPrice(livePrice);
        addConsoleLog(`Acquired stock quote: ${stock.symbol} @ ${livePrice}`);
      }
    } catch (err) {
      addConsoleLog(`Direct Quote Fetch Error: ${err.message}`);
    }
  };

  // Add stock purchase or sell transaction
  const handleAddStock = (e) => {
    e.preventDefault();
    if (!selectedStock) {
      triggerNotification(
        "Please select a stock from the dropdown suggestions.",
        "error",
      );
      return;
    }
    const qty = parseInt(txQty);
    const price = parseFloat(txPrice);
    if (isNaN(qty) || qty <= 0 || isNaN(price) || price <= 0) {
      triggerNotification("Provide a valid quantity and share price.", "error");
      return;
    }

    // Verify inventory for sells
    if (txType === "SELL") {
      const activeHold = holdings.find(
        (h) => h.symbol === selectedStock.symbol,
      );
      const activeQtyAvailable = activeHold ? activeHold.qty : 0;
      if (qty > activeQtyAvailable) {
        triggerNotification(
          `Insufficient holding. You only own ${activeQtyAvailable} shares of ${selectedStock.symbol}.`,
          "error",
        );
        return;
      }
    }

    const newTx = {
      id: "tx-" + Date.now(),
      profileId: activeProfileId,
      symbol: selectedStock.symbol,
      name: selectedStock.name,
      type: txType,
      price: price,
      qty: qty,
      date: txDate,
    };

    setTransactions([newTx, ...transactions]);

    // Apply GTT settings if defined
    if (gttEnabled && gttTriggerPrice) {
      const triggerVal = parseFloat(gttTriggerPrice);
      if (!isNaN(triggerVal) && triggerVal > 0) {
        setGttOrders((prev) => ({
          ...prev,
          [activeProfileId]: {
            ...(prev[activeProfileId] || {}),
            [selectedStock.symbol]: { type: gttType, price: triggerVal },
          },
        }));
      }
    }

    // Reset fields
    setSelectedStock(null);
    setSearchQuery("");
    setTxQty("");
    setTxPrice("");
    setGttEnabled(false);
    setGttTriggerPrice("");
    setShowAddModal(false);
    triggerNotification(
      `Recorded ${txType} transaction for ${qty} shares of ${newTx.symbol}`,
    );
  };

  // Delete profile
  const handleDeleteProfile = () => {
    if (profiles.length <= 1) {
      triggerNotification(
        "You must maintain at least one active profile.",
        "error",
      );
      return;
    }
    const remaining = profiles.filter((p) => p.id !== activeProfileId);
    setProfiles(remaining);
    setActiveProfileId(remaining[0].id);
    triggerNotification(`Successfully deleted profile "${activeProfile.name}"`);
  };

  // Create profile
  const handleCreateProfile = (e) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const newId = "p-" + Date.now();
    const initials = newProfileName.trim().substring(0, 2).toUpperCase();
    const newProf = {
      id: newId,
      name: newProfileName,
      avatar: initials,
    };
    setProfiles([...profiles, newProf]);
    setGttOrders((prev) => ({ ...prev, [newId]: {} }));
    setActiveProfileId(newId);
    setNewProfileName("");
    setShowCreateProfileModal(false);
    triggerNotification(`Created profile: ${newProf.name}`);
  };

  // Edit stock parameters
  const openEditModal = (stock) => {
    setEditingStockSymbol(stock.symbol);
    setEditingLots(stock.purchases); // Passes exact separate buy lots

    const profileGtt = gttOrders[activeProfileId]?.[stock.symbol];
    if (profileGtt) {
      setEditGttEnabled(true);
      setEditGttType(profileGtt.type);
      setEditGttPrice(profileGtt.price);
    } else {
      setEditGttEnabled(false);
      setEditGttType("SELL");
      setEditGttPrice("");
    }
    setShowEditModal(true);
  };

  // Save edits of individual lots and GTT order parameters
  const handleSaveEditStock = (e) => {
    e.preventDefault();

    // Reassemble transactions: preserve other stocks, rebuild edit stock's lots
    let otherTxs = transactions.filter(
      (t) => t.profileId !== activeProfileId || t.symbol !== editingStockSymbol,
    );

    const updatedBuyTxs = editingLots.map((lot) => ({
      id: lot.id,
      profileId: activeProfileId,
      symbol: editingStockSymbol,
      name:
        marketPrices.find((s) => s.symbol === editingStockSymbol)?.name ||
        editingStockSymbol,
      type: "BUY",
      price: parseFloat(lot.price),
      qty: parseInt(lot.qtyOriginal),
      date: lot.date,
    }));

    setTransactions([...updatedBuyTxs, ...otherTxs]);

    // Update GTT target trigger rules
    if (editGttEnabled && editGttPrice) {
      setGttOrders((prev) => ({
        ...prev,
        [activeProfileId]: {
          ...(prev[activeProfileId] || {}),
          [editingStockSymbol]: {
            type: editGttType,
            price: parseFloat(editGttPrice),
          },
        },
      }));
    } else {
      setGttOrders((prev) => {
        const copy = { ...prev };
        if (copy[activeProfileId]) {
          delete copy[activeProfileId][editingStockSymbol];
        }
        return copy;
      });
    }

    setShowEditModal(false);
    triggerNotification(
      `Successfully adjusted parameters for ${editingStockSymbol}`,
    );
  };

  // Remove entire portfolio transactions for a stock
  const handleRemoveStock = (symbol) => {
    const cleanList = transactions.filter(
      (t) => t.profileId !== activeProfileId || t.symbol !== symbol,
    );
    setTransactions(cleanList);
    setGttOrders((prev) => {
      const copy = { ...prev };
      if (copy[activeProfileId]) {
        delete copy[activeProfileId][symbol];
      }
      return copy;
    });
    triggerNotification(`Cleared asset holdings of ${symbol}`);
  };

  // Export transaction history ledger as an Excel-compatible CSV file
  const handleExportCSV = () => {
    const profileTxs = transactions.filter(
      (t) => t.profileId === activeProfileId,
    );
    if (profileTxs.length === 0) {
      triggerNotification("No history logs found to export.", "error");
      return;
    }

    // Compose CSV Headers and rows
    const headers = [
      "Transaction ID",
      "Date",
      "Symbol",
      "Asset Name",
      "Action Type",
      "Price (INR)",
      "Quantity",
      "Net Total (INR)",
    ];
    const rows = profileTxs.map((t) => [
      t.id,
      t.date,
      t.symbol,
      `"${t.name.replace(/"/g, '""')}"`,
      t.type,
      t.price,
      t.qty,
      (t.price * t.qty).toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${activeProfile.name}_portfolio_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Excel-compatible ledger download started!");
  };

  const formatINR = (value) => {
    if (isNaN(value) || value === null || value === undefined) return "—";
    return (
      "₹" +
      parseFloat(value).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-[#e2e8f0] font-sans antialiased p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      {/* Toast Notification Container */}
      {notification && (
        <div className="fixed top-5 right-5 z-50 flex items-center p-4 rounded-xl shadow-2xl bg-[#16222f] border border-teal-500/30 text-teal-400 animate-slideIn">
          <span className="font-semibold text-xs">
            ✓ {notification.message}
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* TOP BAR ACTION RIBBON */}
        <div className="flex items-center justify-between gap-3 bg-[#111622] p-4 rounded-xl border border-[#1e293b] overflow-x-auto whitespace-nowrap scrollbar-thin">
          {/* Profile Badge Area */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowProfileSwitcher(true)}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#1a2333] hover:bg-[#253247] text-white text-xs sm:text-sm font-semibold rounded-lg border border-[#334155] transition-all flex items-center gap-1.5 shrink-0"
            >
              ← Profiles
            </button>

            <div className="flex items-center gap-2 bg-[#1c2436] px-2.5 py-1.5 sm:px-3.5 rounded-full border border-[#334155] shrink-0">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] sm:text-xs font-bold flex items-center justify-center">
                {activeProfile.avatar || "NI"}
              </div>
              <span className="text-xs sm:text-sm font-bold text-white">
                {activeProfile.name}
              </span>
            </div>
          </div>

          {/* Sync Information Text Segment */}
          {lastSyncedTime && (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Last synced market prices:{" "}
              <span className="text-emerald-400 font-bold">
                {lastSyncedTime}
              </span>
            </div>
          )}

          {/* Core Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 bg-[#1a2333] disabled:opacity-55 hover:enabled:bg-[#253247] text-white text-xs sm:text-sm font-medium rounded-lg border border-[#334155] transition-all flex items-center gap-1 sm:gap-1.5 shrink-0`}
            >
              {isRefreshing ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-white rounded-full animate-spin"></span>
              ) : (
                <span className="text-[10px] sm:text-xs">⟳</span>
              )}
              {isRefreshing ? "Syncing..." : "Refresh"}
            </button>
            <button
              onClick={handleDeleteProfile}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#1e1c25] hover:bg-rose-950/20 text-rose-400 text-xs sm:text-sm font-medium rounded-lg border border-rose-900/40 transition-all shrink-0"
            >
              Delete profile
            </button>
            <button
              onClick={() => {
                setTxType("BUY");
                setShowAddModal(true);
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-[#22c55e] hover:bg-[#1ea64f] text-slate-950 text-xs sm:text-sm font-bold rounded-lg transition-all flex items-center gap-1 shrink-0"
            >
              + Add stock
            </button>
          </div>
        </div>

        {/* API SYNC ERROR PANEL */}
        {apiError && (
          <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-4 text-xs text-rose-400 space-y-1">
            <p className="font-bold">
              ⚠️ Market Quote Synchronization Interrupted
            </p>
            <p className="font-mono text-[11px] opacity-85">
              Details: {apiError}
            </p>
          </div>
        )}

        {/* METRICS ROW (4 Cards) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* HOLDINGS */}
          <div className="bg-[#111622] p-5 rounded-xl border border-[#1e293b]">
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Holdings
            </p>
            <p className="text-3xl font-black text-white mt-1.5">
              {holdings.length}
            </p>
          </div>

          {/* INVESTED */}
          <div className="bg-[#111622] p-5 rounded-xl border border-[#1e293b]">
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Invested
            </p>
            <p className="text-3xl font-mono font-black text-white mt-1.5">
              {formatINR(totalCostBasis)}
            </p>
          </div>

          {/* CURRENT VALUE */}
          <div className="bg-[#111622] p-5 rounded-xl border border-[#1e293b]">
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Current Value
            </p>
            <p className="text-2xl font-mono font-black text-white mt-1.5">
              {lastSyncedTime && totalCurrentValue !== null
                ? formatINR(totalCurrentValue)
                : "Not synced yet"}
            </p>
          </div>

          {/* TOTAL P&L */}
          <div className="bg-[#111622] p-5 rounded-xl border border-[#1e293b] relative overflow-hidden">
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
              Total P&amp;L
            </p>
            <div className="mt-1.5 flex items-baseline gap-2">
              {lastSyncedTime && overallPnL !== null ? (
                <>
                  <span
                    className={`text-2xl font-mono font-bold ${overallPnL >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                  >
                    {overallPnL >= 0 ? `+` : ``}
                    {overallPnL.toFixed(2)}
                  </span>
                  <span
                    className={`text-xs font-semibold ${overallPnL >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                  >
                    ({overallPnLPct.toFixed(2)}%)
                  </span>
                </>
              ) : (
                <span className="text-sm font-semibold text-slate-400">
                  Not synced yet
                </span>
              )}
            </div>
            {/* Horizontal status accent bar */}
            {lastSyncedTime && overallPnL !== null && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-1 ${overallPnL >= 0 ? "bg-[#22c55e]" : "bg-[#ef4444]"}`}
              />
            )}
          </div>
        </div>

        {/* LOCAL HANDSHAKE LOG TERMINAL */}
        {showConsole && (
          <div className="bg-[#0e1320] border border-[#1e293b] rounded-xl p-4 font-mono text-[11px] text-slate-400 space-y-2 max-h-40 overflow-y-auto">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-[#1e293b] pb-1.5">
              <span className="text-teal-400 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping"></span>
                LIVE MARKET SYNC LOG (CORS SAFE ADAPTER)
              </span>
              {lastSyncedTime ? (
                <span className="text-[10px] text-slate-400">
                  Last synced market prices: {lastSyncedTime}
                </span>
              ) : (
                <span className="text-[10px] text-slate-500">
                  Not Synced yet
                </span>
              )}
            </div>
            <div className="space-y-1">
              {consoleLog.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* ACTIVE STOCKS GRID CONTAINER */}
        <div className="space-y-4">
          {holdings.length === 0 ? (
            <div className="bg-[#111622] p-12 text-center rounded-xl border border-[#1e293b] space-y-4">
              <span className="text-4xl block">📈</span>
              <h3 className="text-lg font-bold text-white">
                No active assets tracked
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click "+ Add stock" above to log custom purchase details, target
                prices, and live simulated updates.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#1a2333] hover:bg-[#253247] border border-[#334155] text-xs font-bold text-white rounded-lg transition-all"
              >
                Log Initial Asset
              </button>
            </div>
          ) : (
            holdings.map((stock) => {
              const gtt = gttOrders[activeProfileId]?.[stock.symbol];

              // Calculate target parameters
              let gttDistanceStr = "—";
              if (gtt && stock.currentPrice !== null) {
                const diff = gtt.price - stock.currentPrice;
                const pct = (diff / stock.currentPrice) * 100;
                gttDistanceStr = `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}% vs current`;
              } else if (gtt) {
                gttDistanceStr = "Not synced yet";
              }

              const visualInitials = stock.symbol.substring(0, 2).toUpperCase();
              const hasMarketSynced = stock.currentPrice !== null;
              const isProfit = hasMarketSynced && stock.totalProfitLoss >= 0;

              return (
                <div
                  key={stock.symbol}
                  className="bg-[#111622] rounded-xl border border-[#1e293b] overflow-hidden"
                >
                  {/* CARD HEADER */}
                  <div className="p-4 bg-[#141b29] border-b border-[#1e293b] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1c2436] text-[#22c55e] border border-[#334155]/60 flex items-center justify-center font-bold text-xs">
                        {visualInitials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white">
                            {stock.symbol}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          {stock.name}
                          <span className="text-slate-500">•</span>
                          <span className={`font-semibold text-slate-300`}>
                            {formatINR(stock.totalCost)} invested
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(stock)}
                        className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#2d3d52] text-white text-xs font-medium rounded-lg border border-[#334155] transition-all"
                      >
                        Edit / Target
                      </button>
                      <button
                        onClick={() => handleRemoveStock(stock.symbol)}
                        className="px-3.5 py-1.5 bg-[#1e293b] hover:bg-[#ef4444]/10 text-rose-400 hover:text-rose-300 text-xs font-medium rounded-lg border border-transparent hover:border-rose-900/40 transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* 3 COLUMNS BODY */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm divide-y md:divide-y-0 md:divide-x divide-[#1e293b]">
                    {/* COLUMN 1: PURCHASE DETAILS (ITEMIZED MULTIPLE SEPARATE LOTS) */}
                    <div className="space-y-3 pt-0">
                      <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        Purchase Details
                      </p>

                      <div className="space-y-2.5 max-h-40 overflow-y-auto scrollbar-thin pr-1">
                        {stock.purchases.map((lot, index) => (
                          <div
                            key={lot.id || index}
                            className="p-2 bg-[#171e2c] rounded border border-[#232e42] text-xs space-y-1"
                          >
                            <div className="flex justify-between">
                              <span className="text-[10px] font-bold text-[#22c55e]">
                                LOT #{index + 1}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {new Date(lot.date).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono text-slate-300">
                              <span>Price:</span>
                              <span className="text-white font-semibold">
                                {formatINR(lot.price)}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono text-slate-300">
                              <span>Shares remaining:</span>
                              <span className="text-white font-semibold">
                                {lot.qtyRemaining}{" "}
                                <span className="text-[10px] text-slate-500">
                                  / {lot.qtyOriginal}
                                </span>
                              </span>
                            </div>
                            <div className="flex justify-between border-t border-[#232e42] pt-1 font-mono text-[10px] text-slate-400">
                              <span>Lot cost Basis:</span>
                              <span>
                                {formatINR(lot.qtyRemaining * lot.price)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* COLUMN 2: MARKET DATA */}
                    <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                      <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        Market Data
                      </p>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between md:block">
                          <span className="text-slate-500 mr-2">
                            Current price:
                          </span>
                          <span className="font-mono font-bold text-white text-sm block md:inline">
                            {hasMarketSynced
                              ? formatINR(stock.currentPrice)
                              : "Not synced yet"}
                          </span>
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-slate-500 mr-2">
                            Total Returns:
                          </span>
                          {hasMarketSynced && stock.totalProfitLoss !== null ? (
                            <span
                              className={`font-mono font-semibold block md:inline ${isProfit ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                            >
                              {isProfit ? "+" : ""}
                              {stock.totalProfitLoss.toFixed(2)} (
                              {stock.totalProfitLossPct.toFixed(2)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium block md:inline">
                              Not synced yet
                            </span>
                          )}
                        </div>
                        <div className="flex justify-between md:block">
                          <span className="text-slate-500 mr-2">
                            Today's change:
                          </span>
                          {hasMarketSynced && stock.dayChangePct !== null ? (
                            <span
                              className={`font-mono font-semibold block md:inline ${stock.dayChangePct >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                            >
                              {stock.dayChangePct >= 0 ? "▲" : "▼"}{" "}
                              {formatINR(stock.dayChangeAmt)} (
                              {stock.dayChangePct.toFixed(2)}%)
                            </span>
                          ) : (
                            <span className="text-slate-400 font-medium block md:inline">
                              —
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 3: GTT ORDER DETAILS */}
                    <div className="space-y-3 pt-4 md:pt-0 md:pl-6">
                      <p className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        GTT Order
                      </p>

                      {gtt ? (
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between md:block">
                            <span className="text-slate-500 mr-2">Type:</span>
                            <span className="font-bold text-amber-500 uppercase tracking-wide block md:inline">
                              {gtt.type}
                            </span>
                          </div>
                          <div className="flex justify-between md:block">
                            <span className="text-slate-500 mr-2">
                              Trigger price:
                            </span>
                            <span className="font-mono font-bold text-white block md:inline">
                              {formatINR(gtt.price)}
                            </span>
                          </div>
                          <div className="flex justify-between md:block">
                            <span className="text-slate-500 mr-2">
                              vs current:
                            </span>
                            <span className="font-mono text-slate-300 font-semibold block md:inline">
                              {gttDistanceStr}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-1">
                          <p className="text-sm font-black text-rose-500 font-mono tracking-widest uppercase">
                            NA
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            No limit sell trigger active
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* HISTORICAL LEDGER & Realized Gains */}
        <div className="bg-[#111622] rounded-xl border border-[#1e293b] p-5">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Historical Logs
              </h3>
              <p className="text-[11px] text-slate-500">
                Chronological transaction journal and realized gain audits for{" "}
                {activeProfile.name}
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-[#1a2333] hover:bg-[#253247] text-xs font-semibold text-slate-200 border border-[#334155] rounded-lg transition-all"
              >
                Export Excel (CSV)
              </button>
              <div className="bg-[#161d2d] border border-[#334155] px-3 py-1.5 rounded-lg text-xs font-semibold">
                Lifetime Realized P&amp;L:{" "}
                <span
                  className={`font-bold ${realizedPnL >= 0 ? "text-[#22c55e]" : "text-[#ef4444]"}`}
                >
                  {formatINR(realizedPnL)}
                </span>
              </div>
            </div>
          </div>

          {transactions.filter((t) => t.profileId === activeProfileId)
            .length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">
              No transaction history entries logged for this profile.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="border-b border-[#1e293b] text-slate-500">
                    <th className="py-2.5 font-bold">Date</th>
                    <th className="py-2.5 font-bold">Asset</th>
                    <th className="py-2.5 font-bold">Action</th>
                    <th className="py-2.5 font-bold text-right">Shares</th>
                    <th className="py-2.5 font-bold text-right">
                      Price per Share
                    </th>
                    <th className="py-2.5 font-bold text-right">Net total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1c2436]/60">
                  {transactions
                    .filter((t) => t.profileId === activeProfileId)
                    .map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#161d2c]/40">
                        <td className="py-2.5 text-slate-400 font-mono">
                          {tx.date}
                        </td>
                        <td className="py-2.5 font-semibold text-white">
                          {tx.symbol}
                        </td>
                        <td className="py-2.5">
                          <span
                            className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${tx.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-mono font-medium">
                          {tx.qty}
                        </td>
                        <td className="py-2.5 text-right font-mono text-slate-300">
                          {formatINR(tx.price)}
                        </td>
                        <td className="py-2.5 text-right font-mono text-white font-semibold">
                          {formatINR(tx.qty * tx.price)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: ADD NEW STOCK TRANSACTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#07090f]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-[#1e293b] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#1e293b]">
              <h3 className="text-base font-bold text-white">
                Record Stock Transaction
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSearchQuery("");
                  setSelectedStock(null);
                }}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStock} className="space-y-4">
              <div className="flex items-center gap-4 bg-[#161d2d] p-1.5 rounded-lg border border-[#334155]/60">
                <button
                  type="button"
                  onClick={() => setTxType("BUY")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${txType === "BUY" ? "bg-[#22c55e] text-slate-950" : "text-slate-400"}`}
                >
                  BUY ASSET
                </button>
                <button
                  type="button"
                  onClick={() => setTxType("SELL")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${txType === "SELL" ? "bg-[#ef4444] text-white" : "text-slate-400"}`}
                >
                  SELL (FIFO MATCHED)
                </button>
              </div>

              {/* Autocomplete Input symbol fetcher */}
              <div className="relative" ref={autocompleteRef}>
                <label className="text-xs text-slate-400 font-semibold block mb-1">
                  Search Symbol, ETF or Mutual Fund (e.g. TATAGOLD, INFY, TSLA)
                </label>
                <input
                  type="text"
                  placeholder="Type ticker symbols (e.g., RELIANCE)..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                    if (!e.target.value) setSelectedStock(null);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full bg-[#1c2436] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e]"
                />

                {showSuggestions && searchQuery && (
                  <div className="absolute z-30 left-0 right-0 mt-1 bg-[#161d2d] border border-[#334155] rounded-lg max-h-64 overflow-y-auto shadow-2xl divide-y divide-[#1e293b]">
                    {searchLoading ? (
                      <div className="p-4 text-xs text-slate-400 text-center flex items-center justify-center gap-2">
                        <span className="w-4.5 h-4.5 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin"></span>
                        Searching Exchange Registry...
                      </div>
                    ) : searchResults.length > 0 ? (
                      searchResults.map((stock) => (
                        <button
                          key={stock.symbol}
                          type="button"
                          onClick={() => selectStockFromSearch(stock)}
                          className="w-full text-left px-3 py-2.5 hover:bg-[#1e293b] flex justify-between items-center transition-all"
                        >
                          <div>
                            <span className="font-bold text-white text-xs block">
                              {stock.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate max-w-[280px]">
                              {stock.name}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#1e293b] text-teal-400 uppercase tracking-wider block">
                              {stock.exchange}
                            </span>
                            <span className="text-[9px] text-slate-500 block mt-0.5 uppercase tracking-wider">
                              {stock.quoteType}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : searchQuery.length >= 2 ? (
                      <div className="p-4 text-xs text-slate-400 text-center space-y-2">
                        <p>No matching stock found.</p>
                        <button
                          type="button"
                          onClick={() => {
                            const customSymbol = searchQuery
                              .toUpperCase()
                              .trim();
                            const customStock = {
                              symbol: customSymbol,
                              name: customSymbol,
                              price: null,
                              prevClose: null,
                            };
                            setSelectedStock(customStock);
                            setMarketPrices([...marketPrices, customStock]);
                            setSearchQuery(`${customSymbol} (${customSymbol})`);
                            setShowSuggestions(false);
                            addConsoleLog(
                              `Force registered custom lookup symbol: ${customSymbol}`,
                            );
                          }}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded text-[10px] font-bold"
                        >
                          Force Add Symbol "{searchQuery.toUpperCase()}"
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 text-xs text-slate-500 text-center">
                        Type 2 or more characters to search...
                      </div>
                    )}
                  </div>
                )}
              </div>

              {selectedStock && (
                <p className="text-xs text-emerald-400">
                  ✓ Selected:{" "}
                  <strong>
                    {selectedStock.name} ({selectedStock.symbol})
                  </strong>{" "}
                  • Last synced price:{" "}
                  {selectedStock.price !== null
                    ? formatINR(selectedStock.price)
                    : "Not synced yet"}
                </p>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Shares Qty
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={txQty}
                    onChange={(e) => setTxQty(e.target.value)}
                    className="w-full bg-[#1c2436] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Buy Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="200.00"
                    value={txPrice}
                    onChange={(e) => setTxPrice(e.target.value)}
                    className="w-full bg-[#1c2436] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full bg-[#1c2436] border border-[#334155] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* GTT target triggers toggle (only on BUY transactions) */}
              {txType === "BUY" && (
                <div className="p-3 bg-[#161d2d] rounded-lg border border-[#334155]/60 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gttEnabled}
                      onChange={(e) => setGttEnabled(e.target.checked)}
                      className="accent-[#22c55e]"
                    />
                    <span className="text-xs font-semibold text-slate-200">
                      Include Selling GTT Trigger Target
                    </span>
                  </label>

                  {gttEnabled && (
                    <div className="grid grid-cols-2 gap-2 pt-1 animate-fadeIn">
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">
                          Trigger Type
                        </label>
                        <select
                          value={gttType}
                          onChange={(e) => setGttType(e.target.value)}
                          className="w-full bg-[#1c2436] border border-[#334155] rounded-md px-2 py-1 text-xs text-white"
                        >
                          <option value="SELL">SELL LIMIT</option>
                          <option value="BUY">BUY LIMIT</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-0.5">
                          Trigger Price (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="300"
                          value={gttTriggerPrice}
                          onChange={(e) => setGttTriggerPrice(e.target.value)}
                          className="w-full bg-[#1c2436] border border-[#334155] rounded-md px-2 py-1 text-xs text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchQuery("");
                    setSelectedStock(null);
                  }}
                  className="px-4 py-2 bg-[#1e293b] hover:bg-[#2d3d52] text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22c55e] hover:bg-[#1ea64f] text-slate-950 text-xs font-bold rounded-lg transition-all"
                >
                  Log Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT STOCK CARD (Edit individual separated lots + configure GTT trigger prices) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-[#07090f]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-[#1e293b] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#1e293b]">
              <div>
                <h3 className="text-base font-bold text-white">
                  Edit {editingStockSymbol} Parameters
                </h3>
                <p className="text-[11px] text-slate-400">
                  Modify buy lots details or update targets
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditStock} className="space-y-4">
              {/* Individual Lots editor list */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-400">
                  Individual Buy Lots
                </p>
                <div className="max-h-48 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                  {editingLots.map((lot, idx) => (
                    <div
                      key={lot.id || idx}
                      className="p-3 bg-[#172030] rounded-lg border border-[#232e42] space-y-2"
                    >
                      <p className="text-[10px] font-bold text-[#22c55e]">
                        LOT #{idx + 1}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">
                            Shares
                          </label>
                          <input
                            type="number"
                            required
                            value={lot.qtyOriginal}
                            onChange={(e) => {
                              const updated = [...editingLots];
                              updated[idx].qtyOriginal = e.target.value;
                              updated[idx].qtyRemaining = e.target.value; // sync edit
                              setEditingLots(updated);
                            }}
                            className="w-full bg-[#1c2436] border border-[#334155] rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">
                            Price per Share
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={lot.price}
                            onChange={(e) => {
                              const updated = [...editingLots];
                              updated[idx].price = e.target.value;
                              setEditingLots(updated);
                            }}
                            className="w-full bg-[#1c2436] border border-[#334155] rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">
                            Date
                          </label>
                          <input
                            type="date"
                            required
                            value={lot.date}
                            onChange={(e) => {
                              const updated = [...editingLots];
                              updated[idx].date = e.target.value;
                              setEditingLots(updated);
                            }}
                            className="w-full bg-[#1c2436] border border-[#334155] rounded px-2 py-1 text-[10px] text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configure Target Trigger */}
              <div className="p-3 bg-[#161d2d] rounded-lg border border-[#334155] space-y-2.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editGttEnabled}
                    onChange={(e) => setEditGttEnabled(e.target.checked)}
                    className="accent-[#22c55e]"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    GTT Trigger Target Active
                  </span>
                </label>

                {editGttEnabled && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Trigger Type
                      </label>
                      <select
                        value={editGttType}
                        onChange={(e) => setEditGttType(e.target.value)}
                        className="w-full bg-[#1c2436] border border-[#334155] rounded-md px-2 py-1 text-xs text-white"
                      >
                        <option value="SELL">SELL TARGET</option>
                        <option value="BUY">BUY TARGET</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">
                        Trigger Target Price (₹)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editGttPrice}
                        onChange={(e) => setEditGttPrice(e.target.value)}
                        className="w-full bg-[#1c2436] border border-[#334155] rounded-md px-2 py-1 text-xs text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-[#1e293b]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-[#1e293b] text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22c55e] hover:bg-[#1ea64f] text-slate-950 text-xs font-bold rounded-lg"
                >
                  Save parameters
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROFILE SWITCHER */}
      {showProfileSwitcher && (
        <div className="fixed inset-0 z-50 bg-[#07090f]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-[#1e293b] rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#1e293b]">
              <h3 className="text-base font-bold text-white">
                Select active profile
              </h3>
              <button
                onClick={() => setShowProfileSwitcher(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setActiveProfileId(p.id);
                    setShowProfileSwitcher(false);
                    triggerNotification(`Switched profile to ${p.name}`);
                  }}
                  className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${p.id === activeProfileId ? "bg-[#1e293b] border-l-4 border-[#22c55e]" : "hover:bg-[#151c2a]"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#334155] text-white flex items-center justify-center text-xs font-bold">
                      {p.avatar}
                    </div>
                    <span className="text-sm font-semibold text-white">
                      {p.name}
                    </span>
                  </div>
                  {p.id === activeProfileId && (
                    <span className="text-xs text-emerald-400">Active</span>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setShowProfileSwitcher(false);
                setShowCreateProfileModal(true);
              }}
              className="w-full py-2 bg-[#1a2333] hover:bg-[#253247] border border-[#334155] text-xs font-bold text-white rounded-lg transition-all"
            >
              + Create fresh profile
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CREATE NEW PROFILE */}
      {showCreateProfileModal && (
        <div className="fixed inset-0 z-50 bg-[#07090f]/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111622] border border-[#1e293b] rounded-xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#1e293b]">
              <h3 className="text-base font-bold text-white">
                Create portfolio profile
              </h3>
              <button
                onClick={() => setShowCreateProfileModal(false)}
                className="text-slate-400 hover:text-white text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Holder name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kabir"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full bg-[#1c2436] border border-[#334155] rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateProfileModal(false)}
                  className="px-4 py-2 bg-[#1e293b] text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#22c55e] hover:bg-[#1ea64f] text-slate-950 text-xs font-bold rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="text-center text-[11px] text-slate-600 mt-6">
        <p>
          © 2026 folioX Finance Engine. Authenticated NSE/BSE &amp; NYSE quotes
          synced on demand.
        </p>
      </footer>
    </div>
  );
}
