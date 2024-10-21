import { useState, useEffect } from "react";
import { Dropdown } from "react-bootstrap";
import { currencies, getSelectedCurrency, setSelectedCurrency } from "../../../utils/price.utils";

export default function CurrencySettings() {
  const [selectedCurrency, setSelectedCurrencyState] = useState("usd");

  useEffect(() => {
    getSelectedCurrency().then(currency => {
      setSelectedCurrencyState(currency || "usd");
    });
  }, []);

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrencyState(currency);
    setSelectedCurrency(currency);
  };

  return (
    <Dropdown>
      <Dropdown.Toggle variant="outline-primary" id="dropdown-currency" className="btn-primary">
        {selectedCurrency.toUpperCase()}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {currencies.map(currency => (
          <Dropdown.Item 
            key={currency} 
            onClick={() => handleCurrencyChange(currency)}
            active={currency === selectedCurrency}
          >
            {currency.toUpperCase()}
          </Dropdown.Item>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}