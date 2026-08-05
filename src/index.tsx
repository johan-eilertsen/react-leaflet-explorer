"use client";

import { Combobox } from "@base-ui/react/combobox";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { LayerGroup, Map as LeafletMap, PathOptions } from "leaflet";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

export type MapExplorerFeature = Feature<Geometry, {
  id: string;
  label: string;
  type: string;
  typeLabel?: string;
  description?: string;
  searchText?: string;
  editId?: string;
  [key: string]: unknown;
}>;

export type MapExplorerFilter = {
  value: string;
  label: string;
};

export type MapExplorerLabels = {
  search: string;
  searchPlaceholder: string;
  filter: string;
  allTypes: string;
  reset: string;
  noResults: string;
  fullscreen: string;
  exitFullscreen: string;
  zoomIn: string;
  zoomOut: string;
  selectedPlace: string;
};

export type MapExplorerRenderSelected = (
  feature: MapExplorerFeature,
  actions: { clearSelection: () => void },
) => ReactNode;

export type MapExplorerProps = {
  features: MapExplorerFeature[];
  tileUrl?: string;
  attribution?: string;
  ariaLabel?: string;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (id: string | null) => void;
  onViewportChange?: (ids: string[]) => void;
  onVertexMove?: (featureId: string, vertexIndex: number, coordinate: [number, number]) => void;
  editableFeatureIds?: string[];
  pathOptions?: (feature: MapExplorerFeature, selected: boolean) => PathOptions;
  filters?: MapExplorerFilter[];
  labels?: Partial<MapExplorerLabels>;
  bounds?: [[number, number], [number, number]];
  center?: [number, number];
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxFitZoom?: number;
  className?: string;
  style?: CSSProperties;
  renderSelected?: MapExplorerRenderSelected;
  selectedActions?: ReactNode | ((feature: MapExplorerFeature) => ReactNode);
};

export type MapCanvasActions = {
  fullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  zoomIn: () => void;
  zoomOut: () => void;
};

export type MapCanvasProps = {
  features: MapExplorerFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onViewportChange?: (ids: string[]) => void;
  onVertexMove?: (featureId: string, vertexIndex: number, coordinate: [number, number]) => void;
  editableFeatureIds?: string[];
  pathOptions: (feature: MapExplorerFeature, selected: boolean) => PathOptions;
  bounds?: [[number, number], [number, number]];
  center?: [number, number];
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  maxFitZoom?: number;
  tileUrl: string;
  attribution: string;
  ariaLabel: string;
  className?: string;
  frameClassName?: string;
  selectedOverlay?: ReactNode;
  topOverlay?: ReactNode;
  renderControls?: (actions: MapCanvasActions) => ReactNode;
};

const defaultLabels: MapExplorerLabels = {
  search: "Search places",
  searchPlaceholder: "Search by name",
  filter: "Filter by type",
  allTypes: "All types",
  reset: "Reset filters",
  noResults: "No places match your search.",
  fullscreen: "Open map in fullscreen",
  exitFullscreen: "Exit fullscreen",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  selectedPlace: "Selected place",
};

const defaultCenter: [number, number] = [65.762, 11.723];

export function filterMapFeatures(features: MapExplorerFeature[], query: string, type = "all") {
  const needle = query.trim().toLocaleLowerCase();
  return features.filter((feature) => {
    if (type !== "all" && feature.properties.type !== type) return false;
    if (!needle) return true;
    const haystack = `${feature.properties.label} ${feature.properties.typeLabel ?? feature.properties.type} ${feature.properties.searchText ?? ""}`.toLocaleLowerCase();
    return haystack.includes(needle);
  });
}

function collection(features: MapExplorerFeature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

function defaultPathOptions(_feature: MapExplorerFeature, selected: boolean): PathOptions {
  return {
    color: selected ? "var(--map-explorer-selected)" : "var(--map-explorer-line)",
    fillColor: selected ? "var(--map-explorer-selected-fill)" : "var(--map-explorer-fill)",
    fillOpacity: selected ? 0.45 : 0.25,
    opacity: 1,
    weight: selected ? 2 : 1,
  };
}

function Icon({ name }: { name: "search" | "chevron" | "expand" | "collapse" | "plus" | "minus" | "close" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    chevron: <path d="m7 10 5 5 5-5" />,
    expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></>,
    collapse: <><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="map-explorer__icon">{paths[name]}</svg>;
}

function FilterCombobox({
  value,
  onValueChange,
  options,
  label,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: MapExplorerFilter[];
  label: string;
}) {
  const selected = options.find((option) => option.value === value) ?? options[0];
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <Combobox.Root<MapExplorerFilter>
      items={options}
      value={selected}
      onValueChange={(next) => next && onValueChange(next.value)}
      itemToStringLabel={(item) => item.label}
      isItemEqualToValue={(item, current) => item.value === current.value}
    >
      <div ref={containerRef} className="map-explorer__filter">
        <Combobox.Input aria-label={label} className="map-explorer__filter-input" />
        <Combobox.Trigger aria-label={label} className="map-explorer__filter-trigger"><Icon name="chevron" /></Combobox.Trigger>
      </div>
      <Combobox.Portal container={containerRef}>
        <Combobox.Positioner sideOffset={6} className="map-explorer__positioner">
          <Combobox.Popup className="map-explorer__popup">
            <Combobox.Empty className="map-explorer__empty">No options</Combobox.Empty>
            <Combobox.List className="map-explorer__list">
              {options.map((option) => (
                <Combobox.Item key={option.value} value={option} className="map-explorer__item">
                  <span>{option.label}</span><Combobox.ItemIndicator aria-hidden="true">✓</Combobox.ItemIndicator>
                </Combobox.Item>
              ))}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function PlaceCombobox({
  features,
  query,
  onQueryChange,
  onSelect,
  labels,
}: {
  features: MapExplorerFeature[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  labels: Pick<MapExplorerLabels, "search" | "searchPlaceholder" | "noResults">;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  return (
    <Combobox.Root<MapExplorerFeature>
      items={features}
      value={null}
      inputValue={query}
      onInputValueChange={(value, eventDetails) => {
        if (eventDetails.reason === "input-change" || eventDetails.reason === "input-clear") {
          onQueryChange(value);
        }
      }}
      onValueChange={(feature) => {
        if (!feature) return;
        onSelect(feature.properties.id);
        onQueryChange("");
      }}
      itemToStringLabel={(feature) => feature.properties.label}
      isItemEqualToValue={(feature, current) => feature.properties.id === current.properties.id}
    >
      <div ref={containerRef} className="map-explorer__search">
        <Icon name="search" />
        <Combobox.Input aria-label={labels.search} placeholder={labels.searchPlaceholder} />
      </div>
      <Combobox.Portal container={containerRef}>
        <Combobox.Positioner sideOffset={6} className="map-explorer__positioner">
          <Combobox.Popup className="map-explorer__popup map-explorer__search-popup">
            <Combobox.Empty className="map-explorer__empty">{labels.noResults}</Combobox.Empty>
            <Combobox.List className="map-explorer__list">
              {features.map((feature) => (
                <Combobox.Item
                  key={feature.properties.id}
                  value={feature}
                  className="map-explorer__item"
                  data-feature-id={feature.properties.id}
                >
                  <span>{feature.properties.label}</span>
                  <span className="map-explorer__item-meta">{feature.properties.typeLabel ?? feature.properties.type}</span>
                </Combobox.Item>
              ))}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

export function MapExplorer({
  features,
  tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  ariaLabel = "Interactive map",
  selectedId: controlledSelectedId,
  defaultSelectedId = null,
  onSelect,
  onViewportChange,
  onVertexMove,
  editableFeatureIds,
  pathOptions = defaultPathOptions,
  filters,
  labels: labelsOverride,
  bounds,
  center,
  initialZoom,
  minZoom,
  maxZoom,
  maxFitZoom,
  className,
  style,
  renderSelected,
  selectedActions,
}: MapExplorerProps) {
  const labels = { ...defaultLabels, ...labelsOverride };
  const [internalSelectedId, setInternalSelectedId] = useState(defaultSelectedId);
  const selectedId = controlledSelectedId === undefined ? internalSelectedId : controlledSelectedId;
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const typeOptions = useMemo(() => {
    if (filters) return [{ value: "all", label: labels.allTypes }, ...filters.filter((item) => item.value !== "all")];
    const types = new Map<string, string>();
    for (const feature of features) types.set(feature.properties.type, feature.properties.typeLabel ?? feature.properties.type);
    return [{ value: "all", label: labels.allTypes }, ...[...types].map(([value, label]) => ({ value, label }))];
  }, [features, filters, labels.allTypes]);
  const visibleFeatures = useMemo(() => filterMapFeatures(features, query, type), [features, query, type]);
  const visiblePlaces = useMemo(() => {
    const places = new Map<string, MapExplorerFeature>();
    for (const feature of visibleFeatures) {
      if (!places.has(feature.properties.id)) places.set(feature.properties.id, feature);
    }
    return [...places.values()];
  }, [visibleFeatures]);
  const selected = features.find((feature) => feature.properties.id === selectedId) ?? null;
  const setSelected = useCallback((id: string | null) => {
    if (controlledSelectedId === undefined) setInternalSelectedId(id);
    onSelect?.(id);
  }, [controlledSelectedId, onSelect]);
  const reset = () => { setQuery(""); setType("all"); };
  const hasFilters = query.length > 0 || type !== "all";

  return (
    <section className={`map-explorer ${className ?? ""}`} style={style} aria-label={ariaLabel}>
      <MapCanvas
        features={visibleFeatures}
        selectedId={selectedId}
        onSelect={setSelected}
        onViewportChange={onViewportChange}
        onVertexMove={onVertexMove}
        editableFeatureIds={editableFeatureIds}
        pathOptions={pathOptions}
        bounds={bounds}
        center={center}
        initialZoom={initialZoom}
        minZoom={minZoom}
        maxZoom={maxZoom}
        maxFitZoom={maxFitZoom}
        tileUrl={tileUrl}
        attribution={attribution}
        ariaLabel={ariaLabel}
        topOverlay={(
          <div className="map-explorer__toolbar-region">
            <div className="map-explorer__toolbar">
              <PlaceCombobox
                features={visiblePlaces}
                query={query}
                onQueryChange={setQuery}
                onSelect={setSelected}
                labels={labels}
              />
              <FilterCombobox value={type} onValueChange={setType} options={typeOptions} label={labels.filter} />
              <button type="button" className="map-explorer__reset" onClick={reset} disabled={!hasFilters}>{labels.reset}</button>
            </div>
            {visiblePlaces.length === 0 ? <p className="map-explorer__status" role="status">{labels.noResults}</p> : null}
          </div>
        )}
        selectedOverlay={selected ? (
          renderSelected ? renderSelected(selected, { clearSelection: () => setSelected(null) }) : (
            <aside className="map-explorer__selected" aria-label={labels.selectedPlace}>
              <button type="button" className="map-explorer__selected-close" onClick={() => setSelected(null)} aria-label={`Close ${selected.properties.label}`}><Icon name="close" /></button>
              <p className="map-explorer__eyebrow">{selected.properties.typeLabel ?? selected.properties.type}</p>
              <h2>{selected.properties.label}</h2>
              {selected.properties.description ? <p>{selected.properties.description}</p> : null}
              {typeof selectedActions === "function" ? selectedActions(selected) : selectedActions}
            </aside>
          )
        ) : null}
        renderControls={(actions) => (
          <>
            <button type="button" className="map-explorer__map-button map-explorer__fullscreen" onClick={() => void actions.toggleFullscreen()} aria-label={actions.fullscreen ? labels.exitFullscreen : labels.fullscreen} title={actions.fullscreen ? labels.exitFullscreen : labels.fullscreen}><Icon name={actions.fullscreen ? "collapse" : "expand"} /></button>
            <div className="map-explorer__zoom" aria-label="Zoom controls">
              <button type="button" onClick={actions.zoomIn} aria-label={labels.zoomIn} title={labels.zoomIn}><Icon name="plus" /></button>
              <button type="button" onClick={actions.zoomOut} aria-label={labels.zoomOut} title={labels.zoomOut}><Icon name="minus" /></button>
            </div>
          </>
        )}
      />
    </section>
  );
}

export function MapCanvas({
  features,
  selectedId,
  onSelect,
  onViewportChange,
  onVertexMove,
  editableFeatureIds = [],
  pathOptions,
  bounds,
  center = defaultCenter,
  initialZoom = 13,
  minZoom = 2,
  maxZoom = 20,
  maxFitZoom = 17,
  tileUrl,
  attribution,
  ariaLabel,
  className,
  frameClassName,
  selectedOverlay,
  topOverlay,
  renderControls,
}: MapCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const fittedRef = useRef(false);
  const previousSelectionRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onSelect, onViewportChange, onVertexMove, pathOptions });
  const [ready, setReady] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  callbacksRef.current = { onSelect, onViewportChange, onVertexMove, pathOptions };
  const fullscreen = nativeFullscreen || fallbackFullscreen;
  const centerLatitude = center[0];
  const centerLongitude = center[1];

  useEffect(() => {
    let cancelled = false;
    let removeWheel: (() => void) | undefined;
    let frame: number | null = null;
    const element = mapElementRef.current;
    if (!element || mapRef.current) return;
    void import("leaflet").then((module) => {
      if (cancelled || !mapElementRef.current) return;
      const L = module.default;
      const map = L.map(mapElementRef.current, {
        center: [centerLatitude, centerLongitude],
        zoom: initialZoom,
        minZoom,
        maxZoom,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        keyboard: true,
        zoomSnap: 0,
        zoomAnimation: false,
        fadeAnimation: false,
        markerZoomAnimation: false,
      });
      mapRef.current = map;
      L.tileLayer(tileUrl, { attribution, maxZoom }).addTo(map);
      layersRef.current = L.layerGroup().addTo(map);
      let zoomDelta = 0;
      let zoomPoint = L.point(0, 0);
      const applyZoom = () => {
        const next = Math.max(minZoom, Math.min(maxZoom, map.getZoom() - zoomDelta * 0.012));
        frame = null; zoomDelta = 0;
        map.setZoomAround(zoomPoint, next, { animate: false });
      };
      const handleWheel = (event: WheelEvent) => {
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? element.clientHeight : 1;
        const pixelX = event.deltaX * unit;
        const pixelY = event.deltaY * unit;
        if (event.ctrlKey) {
          event.preventDefault(); event.stopPropagation();
          zoomDelta += pixelY;
          zoomPoint = map.mouseEventToContainerPoint(event);
          if (frame === null) frame = requestAnimationFrame(applyZoom);
        } else if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && Math.abs(pixelX) > Math.abs(pixelY)) {
          event.preventDefault(); event.stopPropagation();
          map.panBy([pixelX, pixelY], { animate: false });
        }
      };
      element.addEventListener("wheel", handleWheel, { passive: false });
      removeWheel = () => element.removeEventListener("wheel", handleWheel);
      setReady(true);
    });
    return () => {
      cancelled = true;
      removeWheel?.();
      if (frame !== null) cancelAnimationFrame(frame);
      mapRef.current?.stop();
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, [attribution, centerLatitude, centerLongitude, initialZoom, maxZoom, minZoom, tileUrl]);

  useEffect(() => {
    if (!ready || !mapRef.current || !layersRef.current) return;
    let cancelled = false;
    void import("leaflet").then((module) => {
      const L = module.default;
      const map = mapRef.current;
      const group = layersRef.current;
      if (cancelled || !map || !group) return;
      group.clearLayers();
      const editable = new Set(editableFeatureIds);
      for (const feature of features) {
        const selected = feature.properties.id === selectedId;
        const options = callbacksRef.current.pathOptions(feature, selected);
        const layer = L.geoJSON(feature, { style: () => options, pointToLayer: (_point, latlng) => L.circleMarker(latlng, options) });
        layer.bindTooltip(feature.properties.label, { sticky: true });
        layer.on("click", () => callbacksRef.current.onSelect(feature.properties.id));
        layer.addTo(group);
        if (editable.has(feature.properties.id) && feature.geometry.type === "Polygon") {
          feature.geometry.coordinates[0]?.slice(0, -1).forEach(([lng, lat], index) => {
            const marker = L.marker([lat, lng], { draggable: true, keyboard: true, title: `Move point ${index + 1} in ${feature.properties.label}`, icon: L.divIcon({ className: "map-explorer__edit-handle", html: "<span></span>", iconSize: [20, 20], iconAnchor: [10, 10] }) });
            marker.on("dragend", () => { const point = marker.getLatLng(); callbacksRef.current.onVertexMove?.(feature.properties.editId ?? feature.properties.id, index, [point.lng, point.lat]); });
            marker.addTo(group);
          });
        }
      }
      if (!fittedRef.current && features.length) {
        const fitBounds = bounds ? L.latLngBounds(bounds) : L.geoJSON(collection(features)).getBounds();
        if (fitBounds.isValid()) map.fitBounds(fitBounds, { animate: false, padding: [28, 28], maxZoom: maxFitZoom });
        fittedRef.current = true;
      }
      if (selectedId && selectedId !== previousSelectionRef.current) {
        const selected = features.filter((feature) => feature.properties.id === selectedId);
        if (selected.length) {
          const selectedBounds = L.geoJSON(collection(selected)).getBounds();
          if (selectedBounds.isValid()) map.fitBounds(selectedBounds, { animate: false, padding: [48, 48], maxZoom: maxFitZoom });
        }
        previousSelectionRef.current = selectedId;
      }
      callbacksRef.current.onViewportChange?.(features.filter((feature) => map.getBounds().intersects(L.geoJSON(feature).getBounds())).map((feature) => feature.properties.id));
    });
    return () => { cancelled = true; };
  }, [bounds, editableFeatureIds, features, maxFitZoom, ready, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onViewportChange) return;
    const report = () => void import("leaflet").then(({ default: L }) => callbacksRef.current.onViewportChange?.(features.filter((feature) => map.getBounds().intersects(L.geoJSON(feature).getBounds())).map((feature) => feature.properties.id)));
    map.on("moveend zoomend", report);
    return () => { map.off("moveend zoomend", report); };
  }, [features, onViewportChange, ready]);

  useEffect(() => {
    const listener = () => setNativeFullscreen(document.fullscreenElement === surfaceRef.current);
    document.addEventListener("fullscreenchange", listener);
    return () => document.removeEventListener("fullscreenchange", listener);
  }, []);
  useEffect(() => {
    if (!fallbackFullscreen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setFallbackFullscreen(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [fallbackFullscreen]);
  useEffect(() => { window.setTimeout(() => mapRef.current?.invalidateSize(), 80); }, [fullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (fallbackFullscreen) { setFallbackFullscreen(false); return; }
    try { await surfaceRef.current?.requestFullscreen(); } catch { setFallbackFullscreen(true); }
  }, [fallbackFullscreen]);
  const actions = useMemo<MapCanvasActions>(() => ({ fullscreen, toggleFullscreen, zoomIn: () => mapRef.current?.zoomIn(), zoomOut: () => mapRef.current?.zoomOut() }), [fullscreen, toggleFullscreen]);

  return (
    <div ref={surfaceRef} className={`map-explorer__surface ${fullscreen ? "map-explorer__surface--fullscreen" : ""} ${className ?? ""}`}>
      {topOverlay}
      <div className={`map-explorer__frame ${frameClassName ?? ""}`}>
        <div ref={mapElementRef} className="map-explorer__canvas" role="application" aria-label={ariaLabel} tabIndex={0} />
        {selectedOverlay}
        {renderControls?.(actions)}
      </div>
    </div>
  );
}

/** @deprecated Use MapCanvas for the low-level map primitive. */
export const MapWorkspace = MapCanvas;
export type MapWorkspaceFeature = MapExplorerFeature;
export type MapWorkspaceProps = MapCanvasProps;
export type MapWorkspaceControlActions = MapCanvasActions;
