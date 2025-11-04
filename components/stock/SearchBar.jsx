import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { useLanguage } from "../../Layout";

export default function SearchBar({ value, onChange, stocks = [] }) {
  const { language } = useLanguage();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  const placeholder = language === 'en' 
    ? "Search stocks (symbol or name)"
    : "搜尋股票（代號或名稱）";

  useEffect(() => {
    if (value.trim() === "") {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const filtered = stocks
      .filter(stock => 
        stock.symbol.toLowerCase().includes(value.toLowerCase()) ||
        stock.name.toLowerCase().includes(value.toLowerCase())
      )
      .slice(0, 5);
    
    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [value, stocks]);

  const handleSelectSuggestion = (stock) => {
    onChange(stock.symbol);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => value && setSuggestions(suggestions)}
        placeholder={placeholder}
        className="w-full pl-12 pr-4 py-4 bg-[#151a21] border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#00ff99] focus:ring-2 focus:ring-[#00ff99]/20 transition-all"
      />
      
      {/* Autocomplete Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-[#151a21] border border-gray-800 rounded-xl shadow-2xl z-50 overflow-hidden">
          {suggestions.map((stock) => (
            <div
              key={stock.id}
              onClick={() => handleSelectSuggestion(stock)}
              className="p-4 hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-800 last:border-b-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-white">{stock.symbol}</div>
                  <div className="text-sm text-gray-400 truncate">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-white">${stock.price.toFixed(2)}</div>
                  <div className={`text-xs ${stock.change_percent >= 0 ? 'text-[#00ff99]' : 'text-[#ff4d4d]'}`}>
                    {stock.change_percent >= 0 ? '+' : ''}{stock.change_percent.toFixed(2)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}