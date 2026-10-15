import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MapExplorer, type MapExplorerFeature } from "react-leaflet-explorer";
import "react-leaflet-explorer/styles.css";

const features: MapExplorerFeature[] = [{
  type: "Feature",
  properties: { id: "route", label: "Test route", type: "route" },
  geometry: { type: "LineString", coordinates: [[0, 0], [0.02, 0]] },
}];
const pathOptions = () => ({ weight: 2.5, color: "#315c40" });

function Fixture() {
  const [mounted, setMounted] = useState(true);
  const [selection, setSelection] = useState<string | null>(null);
  const [calls, setCalls] = useState(0);
  return <>
    <button onClick={() => { setMounted(!mounted); setSelection(null); }}>Toggle map</button>
    <button onClick={() => setSelection(null)}>Clear selection</button>
    <p role="status">{selection ?? "Nothing selected"}; callbacks: {calls}</p>
    {mounted && <MapExplorer
      features={features}
      ariaLabel="Test map"
      mode="browse"
      tileUrl="/tiles/{z}/{x}/{y}.png"
      attribution="Test fixture"
      lineHitAreaWidth={16}
      pathOptions={pathOptions}
      selectedId={selection}
      onSelect={(id) => { setSelection(id); setCalls((count) => count + 1); }}
      style={{ height: 480, width: 800 }}
    />}
  </>;
}

createRoot(document.getElementById("root")!).render(<Fixture />);
