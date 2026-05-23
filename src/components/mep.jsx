import React, { useEffect, useState } from "react";
import "./mep.css";

const ItemsTable = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    fetch("https://pool-costing-api.intelithon.in/mep")
      .then((res) => res.json())
      .then((data) => setItems(data))
      .catch((err) => console.error("Error fetching items:", err));
  }, []);

  return (
    <div className="items-container">
      <h2>Project Items</h2>
      <table className="items-table">
        <thead>
          <tr>
            <th>Sl No</th>
            <th>Code</th>
            <th>Description</th>
            <th>Qty</th>
            <th>Unit</th>
            <th>Rate (₹)</th>
            <th>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx}>
              <td>{item.SlNo}</td>
              <td>{item.Code}</td>
              <td>{item.Description}</td>
              <td>{item.Qty}</td>
              <td>{item.Unit}</td>
              <td>{item.Rate}</td>
              <td>{(item.Qty * item.Rate).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ItemsTable;
