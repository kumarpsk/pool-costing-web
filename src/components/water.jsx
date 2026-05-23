import React, { useState, useEffect } from "react";

export default function Tab5() {
  const [underwater, setUnderwater] = useState([]);
  const [totalUnderwater, setTotalUnderwater] = useState(0);
  const [loadingUnderwater, setLoadingUnderwater] = useState(true);

  const [controlpanel, setControlpanel] = useState([]);
  const [totalcontrolpanel, setTotalcontrolpanel] = useState(0);
  const [loadingControlpanel, setLoadingControlpanel] = useState(true);

  useEffect(() => {
    // Fetch underwater lights
    fetch("http://127.0.0.1:8000/underwater")
      .then((res) => res.json())
      .then((data) => {
        if (data.underwater) {
          setUnderwater(data.underwater);
          setTotalUnderwater(data.total);
        }
        setLoadingUnderwater(false);
      })
      .catch((err) => {
        console.error("Error fetching underwater:", err);
        setLoadingUnderwater(false);
      });

    // Fetch control panel
    fetch("http://127.0.0.1:8000/controlpanels")
      .then((res) => res.json())
      .then((data) => {
        if (data.controlpanel) {
          setControlpanel(data.controlpanel);
          setTotalcontrolpanel(data.total);
        }
        setLoadingControlpanel(false);
      })
      .catch((err) => {
        console.error("Error fetching controlpanel:", err);
        setLoadingControlpanel(false);
      });
  }, []);

  return (
    <div style={{ marginTop: "3rem" }}>
      {/* ------------------ Underwater Lights ------------------ */}
      <h1>Amount For Underwater Lights</h1>
      {loadingUnderwater ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Sl.No</th>
              <th>Description</th>
              <th>QTY</th>
              <th>Unit</th>
              <th>Fixed Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {underwater.map((item, idx) => (
              <tr key={idx}>
                <td>{item.SlNo}</td>
                <td>{item.Description}</td>
                <td>{item.Qty}</td>
                <td>{item.Unit}</td>
                <td>{item.Rate}</td>
                <td>{item.Amount}</td>
              </tr>
            ))}
            <tr>
              <td></td>
              <td><h3>Total Amount</h3></td>
              <td></td>
              <td></td>
              <td></td>
              <td><b>{totalUnderwater}</b></td>
            </tr>
          </tbody>
        </table>
      )}

      {/* ------------------ Control Panels ------------------ */}
      <h1 style={{ marginTop: "3rem" }}>Amount For Control Panels</h1>
      {loadingControlpanel ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="8">
          <thead>
            <tr>
              <th>Sl.No</th>
              <th>Description</th>
              <th>QTY</th>
              <th>Unit</th>
              <th>Fixed Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {controlpanel.map((item, idx) => (
              <tr key={idx}>
                <td>{item.SlNo}</td>
                <td>{item.Description}</td>
                <td>{item.Qty}</td>
                <td>{item.Unit}</td>
                <td>{item.Rate}</td>
                <td>{item.Amount}</td>
              </tr>
            ))}
            <tr>
              <td></td>
              <td><h3>Total Amount</h3></td>
              <td></td>
              <td></td>
              <td></td>
              <td><b>{totalcontrolpanel}</b></td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}
// src/components/boq.jsx
import React, { useState } from "react";

export default function BOQ() {
  const [inputs, setInputs] = useState({
    length: 6,
    width: 3,
    depth: 1.2,
    turnover: 4,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setInputs({ ...inputs, [name]: parseFloat(value) || 0 });
  };

  const calculateBOQ = ({ length, width, depth, turnover }) => {
    const PI = Math.PI;
    const volume = length * width * depth;
    const excavation = volume * 1.25;
    const floorArea = length * width;
    const perimeter = 2 * (length + width);
    const wallArea = perimeter * depth;
    const totalArea = floorArea + wallArea;
    const flow_m3ph = volume / turnover;
    const flow_m3s = flow_m3ph / 3600;

    // Filter sizing
    const filterVelocity = 40; // m³/hr/m²
    const requiredFilterDia_mm =
      Math.sqrt((4 * flow_m3ph) / (PI * filterVelocity)) * 1000;

    const filterCapacity = (dia) =>
      PI * Math.pow(dia / 1000 / 2, 2) * filterVelocity;
    const filterQty = (dia) => Math.ceil(flow_m3ph / filterCapacity(dia));

    // Pumps
    const pumpStandards = [5, 7.5, 10, 15, 20, 25];
    const pumpCapacity =
      pumpStandards.find((p) => p >= flow_m3ph) ||
      pumpStandards[pumpStandards.length - 1];
    const pumpQty = Math.ceil(flow_m3ph / pumpCapacity);

    // Fittings (rules of thumb)
    const inlets = Math.max(1, Math.round(floorArea / 8));
    const mainDrains = Math.max(2, Math.round(floorArea / 25));
    const vacuumInlets = Math.max(1, Math.round(floorArea / 100));
    const lights = Math.max(1, Math.round(floorArea / 20));

    return {
      volume,
      excavation,
      floorArea,
      wallArea,
      totalArea,
      perimeter,
      flow_m3ph,
      requiredFilterDia_mm: Math.round(requiredFilterDia_mm),
      filterQty_600mm: filterQty(600),
      pumpCapacity,
      pumpQty,
      inlets,
      mainDrains,
      vacuumInlets,
      lights,
      skimmers: 1,
      mpv: filterQty(600), // 1 MPV per filter
    };
  };

  const boq = calculateBOQ(inputs);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Swimming Pool BOQ Generator</h1>

      {/* Input form */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {["length", "width", "depth", "turnover"].map((field) => (
          <div key={field}>
            <label className="block text-sm font-medium capitalize">
              {field}
            </label>
            <input
              type="number"
              step="0.1"
              name={field}
              value={inputs[field]}
              onChange={handleChange}
              className="mt-1 p-2 border rounded w-full"
            />
          </div>
        ))}
      </div>

      {/* Results */}
      <table className="w-full border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Component</th>
            <th className="border p-2">Qty / Size</th>
            <th className="border p-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-2">Pool Volume</td>
            <td className="border p-2">{boq.volume.toFixed(2)} m³</td>
            <td className="border p-2">Water capacity</td>
          </tr>
          <tr>
            <td className="border p-2">Filters</td>
            <td className="border p-2">
              {boq.filterQty_600mm} × 600mm dia
            </td>
            <td className="border p-2">
              Req. dia ≈ {boq.requiredFilterDia_mm} mm
            </td>
          </tr>
          <tr>
            <td className="border p-2">Pumps</td>
            <td className="border p-2">
              {boq.pumpQty} × {boq.pumpCapacity} m³/hr
            </td>
            <td className="border p-2">Selected from standards</td>
          </tr>
          <tr>
            <td className="border p-2">Inlets (returns)</td>
            <td className="border p-2">{boq.inlets}</td>
            <td className="border p-2">~1 per 8 m²</td>
          </tr>
          <tr>
            <td className="border p-2">Main Drains</td>
            <td className="border p-2">{boq.mainDrains}</td>
            <td className="border p-2">Min 2</td>
          </tr>
          <tr>
            <td className="border p-2">Vacuum Inlets</td>
            <td className="border p-2">{boq.vacuumInlets}</td>
            <td className="border p-2">1 per 100 m²</td>
          </tr>
          <tr>
            <td className="border p-2">Underwater Lights</td>
            <td className="border p-2">{boq.lights}</td>
            <td className="border p-2">1 per 20 m²</td>
          </tr>
          <tr>
            <td className="border p-2">Skimmers</td>
            <td className="border p-2">{boq.skimmers}</td>
            <td className="border p-2">1 skimmer (small pool)</td>
          </tr>
          <tr>
            <td className="border p-2">MPVs</td>
            <td className="border p-2">{boq.mpv}</td>
            <td className="border p-2">1 per filter</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
