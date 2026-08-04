"use client";

import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { LayerGroup, Map as LeafletMap, PathOptions } from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type MapWorkspaceFeature = Feature<Geometry, {
  id: string;
  editId?: string;
  label: string;
  type: string;
  [key: string]: unknown;
}>;

export type MapWorkspaceControlActions = {
  fullscreen: boolean;
  toggleFullscreen: () => Promise<void>;
  zoomIn: () => void;
  zoomOut: () => void;
};

export type MapWorkspaceProps = {
  features: MapWorkspaceFeature[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onViewportChange?: (ids: string[]) => void;
  onVertexMove?: (featureId: string, vertexIndex: number, coordinate: [number, number]) => void;
  editableFeatureIds?: string[];
  pathOptions: (feature: MapWorkspaceFeature, selected: boolean) => PathOptions;
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
  renderControls?: (actions: MapWorkspaceControlActions) => ReactNode;
};

function collection(features: MapWorkspaceFeature[]): FeatureCollection {
  return { type: "FeatureCollection", features };
}

export function MapWorkspace({
  features,
  selectedId,
  onSelect,
  onViewportChange,
  onVertexMove,
  editableFeatureIds = [],
  pathOptions,
  bounds,
  center = [65.762, 11.723],
  initialZoom = 13,
  minZoom = 10,
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
}: MapWorkspaceProps) {
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

  useEffect(() => {
    let cancelled = false;
    const element = mapElementRef.current;
    if (!element || mapRef.current) return;

    void import("leaflet").then((module) => {
      if (cancelled || !mapElementRef.current) return;
      const L = module.default;
      const map = L.map(mapElementRef.current, {
        center,
        zoom: initialZoom,
        minZoom,
        maxZoom,
        zoomControl: false,
        scrollWheelZoom: false,
        dragging: true,
        touchZoom: true,
        zoomSnap: 0,
      });
      mapRef.current = map;
      L.tileLayer(tileUrl, { attribution, maxZoom }).addTo(map);
      layersRef.current = L.layerGroup().addTo(map);

      let frame: number | null = null;
      let zoomDelta = 0;
      let zoomPoint = L.point(0, 0);
      const applyZoom = () => {
        const next = Math.max(minZoom, Math.min(maxZoom, map.getZoom() - zoomDelta * 0.012));
        frame = null;
        zoomDelta = 0;
        map.setZoomAround(zoomPoint, next, { animate: false });
      };
      const handleWheel = (event: WheelEvent) => {
        event.preventDefault();
        event.stopPropagation();
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? element.clientHeight : 1;
        const pixelX = event.deltaX * unit;
        const pixelY = event.deltaY * unit;
        const mouseWheel = event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL || (Math.abs(pixelX) < 1 && Math.abs(pixelY) >= 40);
        if (event.ctrlKey || mouseWheel) {
          zoomDelta += pixelY;
          zoomPoint = map.mouseEventToContainerPoint(event);
          if (frame === null) frame = requestAnimationFrame(applyZoom);
        } else {
          map.panBy([pixelX, pixelY], { animate: false });
        }
      };
      element.addEventListener("wheel", handleWheel, { passive: false });
      setReady(true);
      return () => element.removeEventListener("wheel", handleWheel);
    });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, [attribution, center, initialZoom, maxZoom, minZoom, tileUrl]);

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
        const layer = L.geoJSON(feature, {
          style: () => callbacksRef.current.pathOptions(feature, selected),
          pointToLayer: (_point, latlng) => L.circleMarker(latlng, callbacksRef.current.pathOptions(feature, selected)),
        });
        layer.bindTooltip(feature.properties.label, { sticky: true });
        layer.on("click", () => callbacksRef.current.onSelect(feature.properties.id));
        layer.addTo(group);

        if (editable.has(feature.properties.id) && feature.geometry.type === "Polygon") {
          feature.geometry.coordinates[0]?.slice(0, -1).forEach(([lng, lat], index) => {
            const marker = L.marker([lat, lng], {
              draggable: true,
              keyboard: true,
              title: `Flytt punkt ${index + 1} i ${feature.properties.label}`,
              icon: L.divIcon({ className: "map-workspace__edit-handle", html: "<span></span>", iconSize: [20, 20], iconAnchor: [10, 10] }),
            });
            marker.on("dragend", () => {
              const point = marker.getLatLng();
              callbacksRef.current.onVertexMove?.(feature.properties.editId ?? feature.properties.id, index, [point.lng, point.lat]);
            });
            marker.addTo(group);
          });
        }
      }
      if (!fittedRef.current && features.length) {
        const fitBounds = bounds ? L.latLngBounds(bounds) : L.geoJSON(collection(features)).getBounds();
        if (fitBounds.isValid()) map.fitBounds(fitBounds, { padding: [28, 28], maxZoom: maxFitZoom });
        fittedRef.current = true;
      }
      if (selectedId && selectedId !== previousSelectionRef.current) {
        const selected = features.filter((feature) => feature.properties.id === selectedId);
        const selectedBounds = L.geoJSON(collection(selected)).getBounds();
        if (selectedBounds.isValid()) map.fitBounds(selectedBounds, { padding: [48, 48], maxZoom: maxFitZoom });
        previousSelectionRef.current = selectedId;
      }
      callbacksRef.current.onViewportChange?.(features.filter((feature) => map.getBounds().intersects(L.geoJSON(feature).getBounds())).map((feature) => feature.properties.id));
    });
    return () => { cancelled = true; };
  }, [bounds, editableFeatureIds, features, maxFitZoom, ready, selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onViewportChange) return;
    const report = () => {
      void import("leaflet").then(({ default: L }) => {
        const ids = features.filter((feature) => map.getBounds().intersects(L.geoJSON(feature).getBounds())).map((feature) => feature.properties.id);
        callbacksRef.current.onViewportChange?.(ids);
      });
    };
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

  useEffect(() => {
    window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
  }, [fullscreen]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) return document.exitFullscreen();
    if (fallbackFullscreen) { setFallbackFullscreen(false); return; }
    try { await surfaceRef.current?.requestFullscreen(); } catch { setFallbackFullscreen(true); }
  }, [fallbackFullscreen]);
  const actions = useMemo<MapWorkspaceControlActions>(() => ({
    fullscreen,
    toggleFullscreen,
    zoomIn: () => mapRef.current?.zoomIn(),
    zoomOut: () => mapRef.current?.zoomOut(),
  }), [fullscreen, toggleFullscreen]);

  return (
    <div ref={surfaceRef} className={`map-workspace ${fullscreen ? "map-workspace--fullscreen" : ""} ${className ?? ""}`}>
      {topOverlay}
      <div className={`map-workspace__frame ${frameClassName ?? ""}`}>
        <div ref={mapElementRef} className="map-workspace__canvas" aria-label={ariaLabel} />
        {selectedOverlay}
        {renderControls?.(actions)}
      </div>
    </div>
  );
}
