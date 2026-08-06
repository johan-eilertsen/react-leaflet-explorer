"use client";

import { Combobox } from "@base-ui/react/combobox";
import type { Feature, Geometry } from "geojson";
import type { GeoJSON as LeafletGeoJSON, LatLngBounds, Map as LeafletMap, Marker, PathOptions, Tooltip } from "leaflet";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  cancelTooltipClose,
  directGesturePanOptions,
  getPresenceTransition,
  getSelectionPanOptions,
  scheduleTooltipClose,
  selectedOverlayDurationMs,
} from "./motion.js";
import { buildMapSearchIndex, collectVisibleFeatureIds, filterMapSearchIndex, reconcileMapEntries, sameMapFeatureIds, updateSelectedEntries } from "./internals.js";

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
  results: string;
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
  mapLabel?: (feature: MapExplorerFeature) => string | null | undefined;
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
  mapLabel?: (feature: MapExplorerFeature) => string | null | undefined;
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

type FeatureLayerEntry = {
  feature: MapExplorerFeature;
  layer: LeafletGeoJSON;
  bounds: LatLngBounds;
  label: Tooltip | null;
  editMarkers: Marker[];
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
  results: "results",
};

const defaultCenter: [number, number] = [0, 0];
const noEditableFeatureIds: string[] = [];

function defaultPathOptions(_feature: MapExplorerFeature, selected: boolean): PathOptions {
  return {
    color: selected ? "var(--map-explorer-selected)" : "var(--map-explorer-line)",
    fillColor: selected ? "var(--map-explorer-selected-fill)" : "var(--map-explorer-fill)",
    fillOpacity: selected ? 0.45 : 0.25,
    opacity: 1,
    weight: selected ? 2 : 1,
  };
}

function Icon({ name }: { name: "search" | "expand" | "collapse" | "plus" | "minus" | "close" }) {
  const paths = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /></>,
    collapse: <><path d="M9 3v6H3M15 3v6h6M9 21v-6H3M15 21v-6h6" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="map-explorer__icon">{paths[name]}</svg>;
}

function SelectedOverlayPresence({ children }: { children: ReactNode }) {
  const present = children != null;
  const [rendered, setRendered] = useState<ReactNode>(children);
  const [status, setStatus] = useState<"starting" | "open" | "ending">(present ? "starting" : "ending");
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterFrameRef = useRef<number | null>(null);
  const previousPresenceRef = useRef(false);
  const latestChildrenRef = useRef(children);
  latestChildrenRef.current = children;

  useEffect(() => {
    if (present) setRendered(children);
  }, [children, present]);

  useEffect(() => {
    const transition = getPresenceTransition(previousPresenceRef.current, present);
    previousPresenceRef.current = present;
    if (!transition) return;

    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
    if (enterFrameRef.current !== null) {
      cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = null;
    }

    if (transition === "enter") {
      setRendered(latestChildrenRef.current);
      setStatus("starting");
      enterFrameRef.current = requestAnimationFrame(() => {
        setStatus("open");
        enterFrameRef.current = null;
      });
      return;
    }

    setStatus("ending");
    exitTimerRef.current = setTimeout(() => {
      setRendered(null);
      exitTimerRef.current = null;
    }, selectedOverlayDurationMs);
  }, [present]);

  useEffect(() => () => {
    previousPresenceRef.current = false;
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    if (enterFrameRef.current !== null) cancelAnimationFrame(enterFrameRef.current);
  }, []);

  if (rendered == null) return null;

  return (
    <div
      className="map-explorer__selected-presence"
      data-starting-style={status === "starting" ? "" : undefined}
      data-open={status === "open" ? "" : undefined}
      data-ending-style={status === "ending" ? "" : undefined}
    >
      {rendered}
    </div>
  );
}

function ExplorerCombobox({
  features,
  query,
  onQueryChange,
  onSelect,
  selectedId,
  type,
  typeOptions,
  onTypeChange,
  onReset,
  labels,
}: {
  features: MapExplorerFeature[];
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  type: string;
  typeOptions: MapExplorerFilter[];
  onTypeChange: (value: string) => void;
  onReset: () => void;
  labels: Pick<MapExplorerLabels, "search" | "searchPlaceholder" | "filter" | "reset" | "noResults">;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [scrollEdges, setScrollEdges] = useState({ top: false, bottom: false });
  const activeType = typeOptions.find((option) => option.value === type) ?? typeOptions[0];
  const selected = features.find((feature) => feature.properties.id === selectedId) ?? null;
  const hasActiveChoice = query.length > 0 || type !== "all" || selectedId !== null;
  const updateScrollEdges = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    setScrollEdges({
      top: list.scrollTop > 1,
      bottom: list.scrollTop + list.clientHeight < list.scrollHeight - 1,
    });
  }, []);
  const setListElement = useCallback((node: HTMLDivElement | null) => {
    listRef.current = node;
    if (node) requestAnimationFrame(updateScrollEdges);
  }, [updateScrollEdges]);

  useEffect(() => {
    const frame = requestAnimationFrame(updateScrollEdges);
    return () => cancelAnimationFrame(frame);
  }, [features, updateScrollEdges]);

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
      <div ref={containerRef} className="map-explorer__combobox">
        <div className="map-explorer__search">
          <Icon name="search" />
          <div className="map-explorer__input-slot">
            <Combobox.Input
              aria-label={labels.search}
              placeholder={selected && !query ? "" : labels.searchPlaceholder}
            />
            {selected && !query ? (
              <span className="map-explorer__selected-value" aria-hidden="true">
                {selected.properties.label}
              </span>
            ) : null}
          </div>
          <span className="map-explorer__active-filter">{activeType.label}</span>
          {hasActiveChoice ? (
            <button
              type="button"
              className="map-explorer__reset"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                onReset();
              }}
              aria-label={labels.reset}
              title={labels.reset}
            >
              <Icon name="close" />
            </button>
          ) : null}
        </div>
      </div>
      <Combobox.Portal container={containerRef}>
        <Combobox.Positioner anchor={containerRef} sideOffset={6} className="map-explorer__positioner">
          <Combobox.Popup className="map-explorer__popup map-explorer__search-popup">
            <div className="map-explorer__filters" aria-label={labels.filter}>
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="map-explorer__filter-option"
                  data-active={type === option.value ? "true" : undefined}
                  aria-pressed={type === option.value}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onTypeChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <Combobox.Empty className="map-explorer__empty">{labels.noResults}</Combobox.Empty>
            <div
              className="map-explorer__list-shell"
              data-fade-top={scrollEdges.top || undefined}
              data-fade-bottom={scrollEdges.bottom || undefined}
            >
              <Combobox.List ref={setListElement} className="map-explorer__list" onScroll={updateScrollEdges}>
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
            </div>
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
  mapLabel,
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
  const [viewportIds, setViewportIds] = useState<string[] | null>(null);
  const viewportIdsRef = useRef<string[] | null>(null);
  const typeOptions = useMemo(() => {
    if (filters) return [{ value: "all", label: labels.allTypes }, ...filters.filter((item) => item.value !== "all")];
    const types = new Map<string, string>();
    for (const feature of features) types.set(feature.properties.type, feature.properties.typeLabel ?? feature.properties.type);
    return [{ value: "all", label: labels.allTypes }, ...[...types].map(([value, label]) => ({ value, label }))];
  }, [features, filters, labels.allTypes]);
  const searchIndex = useMemo(() => buildMapSearchIndex(features), [features]);
  const visibleRecords = useMemo(() => filterMapSearchIndex(searchIndex, query, type), [query, searchIndex, type]);
  const visibleIds = useMemo(() => new Set(visibleRecords.map((record) => record.id)), [visibleRecords]);
  const visibleFeatures = useMemo(
    () => features.filter((feature) => visibleIds.has(feature.properties.id)),
    [features, visibleIds],
  );
  const visiblePlaces = useMemo(() => visibleRecords.map((record) => record.representative), [visibleRecords]);
  const selected = features.find((feature) => feature.properties.id === selectedId) ?? null;
  const resultCount = viewportIds?.length ?? visibleRecords.length;
  const handleViewportChange = useCallback((ids: string[]) => {
    if (sameMapFeatureIds(viewportIdsRef.current, ids)) return;
    viewportIdsRef.current = ids;
    setViewportIds(ids);
    onViewportChange?.(ids);
  }, [onViewportChange]);
  const setSelected = useCallback((id: string | null) => {
    if (controlledSelectedId === undefined) setInternalSelectedId(id);
    onSelect?.(id);
  }, [controlledSelectedId, onSelect]);
  const reset = () => { setQuery(""); setType("all"); setSelected(null); };
  const changeType = (nextType: string) => {
    setType(nextType);
    if (selected && nextType !== "all" && selected.properties.type !== nextType) setSelected(null);
  };

  return (
    <section className={`map-explorer ${className ?? ""}`} style={style} aria-label={ariaLabel}>
      <MapCanvas
        features={visibleFeatures}
        selectedId={selectedId}
        onSelect={setSelected}
        onViewportChange={handleViewportChange}
        onVertexMove={onVertexMove}
        editableFeatureIds={editableFeatureIds}
        pathOptions={pathOptions}
        mapLabel={mapLabel}
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
              <ExplorerCombobox
                features={visiblePlaces}
                query={query}
                onQueryChange={setQuery}
                onSelect={setSelected}
                selectedId={selectedId}
                type={type}
                typeOptions={typeOptions}
                onTypeChange={changeType}
                onReset={reset}
                labels={labels}
              />
              <span className="map-explorer__result-count" aria-live="polite">
                {resultCount} {labels.results}
              </span>
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
  editableFeatureIds = noEditableFeatureIds,
  pathOptions,
  mapLabel,
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
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const featureLayersRef = useRef(new Map<MapExplorerFeature, FeatureLayerEntry>());
  const currentFeaturesRef = useRef(features);
  const hoverTooltipRef = useRef<Tooltip | null>(null);
  const hoveredFeatureRef = useRef<MapExplorerFeature | null>(null);
  const closeTooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipFrameRef = useRef<number | null>(null);
  const viewportIdsRef = useRef<string[] | null>(null);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const labelRendererRef = useRef(mapLabel);
  const selectedIdRef = useRef(selectedId);
  const styledSelectionRef = useRef<string | null>(null);
  const pathOptionsRef = useRef(pathOptions);
  const fittedRef = useRef(false);
  const previousSelectionRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onSelect, onViewportChange, onVertexMove, pathOptions, mapLabel });
  const [ready, setReady] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  callbacksRef.current = { onSelect, onViewportChange, onVertexMove, pathOptions, mapLabel };
  currentFeaturesRef.current = features;
  selectedIdRef.current = selectedId;
  const fullscreen = nativeFullscreen || fallbackFullscreen;
  const reportsViewport = onViewportChange !== undefined;
  const editableFeatureSignature = [...new Set(editableFeatureIds)].sort().join("\u0000");
  const boundsSignature = bounds ? JSON.stringify(bounds) : "";
  const centerLatitude = center[0];
  const centerLongitude = center[1];

  useEffect(() => {
    let cancelled = false;
    let removeWheel: (() => void) | undefined;
    let frame: number | null = null;
    const element = mapElementRef.current;
    if (!element || mapRef.current) return;
    setReady(false);
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
      leafletRef.current = L;
      L.tileLayer(tileUrl, { attribution, maxZoom }).addTo(map);
      hoverTooltipRef.current = L.tooltip({
        className: "map-explorer__hover-tooltip",
        direction: "top",
        offset: [0, -8],
        opacity: 1,
      });
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
        } else if (event.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
          event.preventDefault(); event.stopPropagation();
          map.panBy([pixelX, pixelY], directGesturePanOptions);
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
      closeTooltipTimerRef.current = cancelTooltipClose(closeTooltipTimerRef.current);
      if (tooltipFrameRef.current !== null) cancelAnimationFrame(tooltipFrameRef.current);
      tooltipFrameRef.current = null;
      featureLayersRef.current.clear();
      mapRef.current?.stop();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      hoverTooltipRef.current = null;
      hoveredFeatureRef.current = null;
      fittedRef.current = false;
      previousSelectionRef.current = null;
      viewportIdsRef.current = null;
    };
  }, [attribution, centerLatitude, centerLongitude, initialZoom, maxZoom, minZoom, tileUrl]);

  const reportViewport = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const mapBounds = map.getBounds();
    const ids = collectVisibleFeatureIds(currentFeaturesRef.current, (feature) => {
      const entry = featureLayersRef.current.get(feature);
      return Boolean(entry?.bounds.isValid() && mapBounds.intersects(entry.bounds));
    });
    if (sameMapFeatureIds(viewportIdsRef.current, ids)) return;
    viewportIdsRef.current = ids;
    callbacksRef.current.onViewportChange?.(ids);
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    reconcileMapEntries(featureLayersRef.current, features, (feature) => {
      const options = callbacksRef.current.pathOptions(feature, feature.properties.id === selectedIdRef.current);
      const layer = L.geoJSON(feature, {
        style: () => options,
        pointToLayer: (_point, latlng) => L.circleMarker(latlng, options),
      });
      layer.on("mouseover", (event) => {
        const tooltip = hoverTooltipRef.current;
        if (!tooltip) return;
        closeTooltipTimerRef.current = cancelTooltipClose(closeTooltipTimerRef.current);
        if (tooltipFrameRef.current !== null) cancelAnimationFrame(tooltipFrameRef.current);
        hoveredFeatureRef.current = feature;
        tooltip.setContent(feature.properties.label).setLatLng(event.latlng);
        if (!map.hasLayer(tooltip)) tooltip.addTo(map);
        tooltipFrameRef.current = requestAnimationFrame(() => {
          tooltip.getElement()?.classList.add("map-explorer__hover-tooltip--visible");
          tooltipFrameRef.current = null;
        });
      });
      layer.on("mousemove", (event) => {
        if (hoveredFeatureRef.current === feature) hoverTooltipRef.current?.setLatLng(event.latlng);
      });
      layer.on("mouseout", () => {
        if (hoveredFeatureRef.current !== feature) return;
        const tooltip = hoverTooltipRef.current;
        if (!tooltip) return;
        hoveredFeatureRef.current = null;
        if (tooltipFrameRef.current !== null) cancelAnimationFrame(tooltipFrameRef.current);
        tooltipFrameRef.current = null;
        tooltip.getElement()?.classList.remove("map-explorer__hover-tooltip--visible");
        closeTooltipTimerRef.current = scheduleTooltipClose(() => {
          if (map.hasLayer(tooltip)) map.removeLayer(tooltip);
          closeTooltipTimerRef.current = null;
        });
      });
      layer.on("click", () => callbacksRef.current.onSelect(feature.properties.id));
      layer.addTo(map);
      return { feature, layer, bounds: layer.getBounds(), label: null, editMarkers: [] };
    }, (entry) => {
      if (hoveredFeatureRef.current === entry.feature) {
        hoveredFeatureRef.current = null;
        closeTooltipTimerRef.current = cancelTooltipClose(closeTooltipTimerRef.current);
        if (tooltipFrameRef.current !== null) cancelAnimationFrame(tooltipFrameRef.current);
        tooltipFrameRef.current = null;
        const tooltip = hoverTooltipRef.current;
        if (tooltip && map.hasLayer(tooltip)) map.removeLayer(tooltip);
      }
      entry.label?.remove();
      for (const marker of entry.editMarkers) marker.remove();
      entry.layer.remove();
    });
    if (reportsViewport) reportViewport();
  }, [features, ready, reportViewport, reportsViewport]);

  useEffect(() => {
    if (!ready) return;
    const updateAll = pathOptionsRef.current !== pathOptions;
    pathOptionsRef.current = pathOptions;
    updateSelectedEntries(
      featureLayersRef.current.values(),
      styledSelectionRef.current,
      selectedId,
      updateAll,
      (entry) => entry.feature.properties.id,
      (entry, selected) => entry.layer.setStyle(pathOptions(entry.feature, selected)),
    );
    styledSelectionRef.current = selectedId;
  }, [pathOptions, ready, selectedId]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const rendererChanged = labelRendererRef.current !== mapLabel;
    labelRendererRef.current = mapLabel;
    for (const entry of featureLayersRef.current.values()) {
      if (rendererChanged) {
        entry.label?.remove();
        entry.label = null;
      } else if (entry.label) {
        continue;
      }
      const text = mapLabel?.(entry.feature)?.trim();
      if (!text || !entry.bounds.isValid()) continue;
      entry.label = L.tooltip({ permanent: true, direction: "center", className: "map-explorer__feature-label", interactive: false, opacity: 1 })
        .setLatLng(entry.bounds.getCenter()).setContent(text).addTo(map);
    }
  }, [features, mapLabel, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const editable = new Set(editableFeatureIds);
    for (const entry of featureLayersRef.current.values()) {
      for (const marker of entry.editMarkers) marker.remove();
      entry.editMarkers = [];
      const feature = entry.feature;
      if (!editable.has(feature.properties.id) || feature.geometry.type !== "Polygon") continue;
      feature.geometry.coordinates[0]?.slice(0, -1).forEach(([lng, lat], index) => {
        const marker = L.marker([lat, lng], { draggable: true, keyboard: true, title: `Move point ${index + 1} in ${feature.properties.label}`, icon: L.divIcon({ className: "map-explorer__edit-handle", html: "<span></span>", iconSize: [20, 20], iconAnchor: [10, 10] }) });
        marker.on("dragend", () => { const point = marker.getLatLng(); callbacksRef.current.onVertexMove?.(feature.properties.editId ?? feature.properties.id, index, [point.lng, point.lat]); });
        marker.addTo(map);
        entry.editMarkers.push(marker);
      });
    }
  }, [editableFeatureSignature, features, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map || fittedRef.current || features.length === 0) return;
    const fitBounds = bounds ? L.latLngBounds(bounds) : L.latLngBounds([]);
    if (!bounds) for (const entry of featureLayersRef.current.values()) fitBounds.extend(entry.bounds);
    if (fitBounds.isValid()) map.fitBounds(fitBounds, { animate: false, padding: [28, 28], maxZoom: maxFitZoom });
    fittedRef.current = true;
  }, [boundsSignature, features, maxFitZoom, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map || selectedId === previousSelectionRef.current) return;
    if (selectedId) {
      const selectedBounds = L.latLngBounds([]);
      for (const entry of featureLayersRef.current.values()) {
        if (entry.feature.properties.id === selectedId) selectedBounds.extend(entry.bounds);
      }
      if (selectedBounds.isValid() && !map.getBounds().intersects(selectedBounds)) {
        map.stop();
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        map.panTo(selectedBounds.getCenter(), getSelectionPanOptions(prefersReducedMotion));
      }
    }
    previousSelectionRef.current = selectedId;
  }, [features, ready, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !reportsViewport) return;
    viewportIdsRef.current = null;
    reportViewport();
    map.on("moveend zoomend", reportViewport);
    return () => { map.off("moveend zoomend", reportViewport); };
  }, [ready, reportViewport, reportsViewport]);

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
  useEffect(() => {
    if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
    invalidateTimerRef.current = setTimeout(() => {
      mapRef.current?.invalidateSize();
      invalidateTimerRef.current = null;
    }, 80);
    return () => {
      if (invalidateTimerRef.current) clearTimeout(invalidateTimerRef.current);
      invalidateTimerRef.current = null;
    };
  }, [fullscreen]);

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
        <SelectedOverlayPresence>{selectedOverlay}</SelectedOverlayPresence>
        {renderControls?.(actions)}
      </div>
    </div>
  );
}
