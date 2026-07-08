"use client";

import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect, useState, useRef } from "react";
import { Maximize, Minimize } from "lucide-react";
import type { LeafletMouseEvent } from "leaflet";
import type { ScoreBand, ScoredCity } from "@/lib/types";

interface DistributionMapProps {
  cities: ScoredCity[];
  selectedCityId: string;
  onCitySelect: (city: ScoredCity) => void;
}

const bandColors: Record<ScoreBand, string> = {
  PRIME: "#00ff88",
  STRONG: "#aaff44",
  MODERATE: "#ffcc00",
  WEAK: "#ff8800",
  AVOID: "#ff3355"
};

function radiusForTier(tier: ScoredCity["tier"]) {
  if (tier === 1) {
    return 14;
  }

  if (tier === 2) {
    return 10;
  }

  return 7;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function MapBehavior({ selectedCityId, cities }: Pick<DistributionMapProps, "selectedCityId" | "cities">) {
  const map = useMap();

  useEffect(() => {
    map.fitBounds(
      [
        [6.5, 68.0],
        [35.5, 97.5]
      ],
      { padding: [18, 18] }
    );
    map.scrollWheelZoom.disable();
  }, [map]);

  useEffect(() => {
    const selected = cities.find((city) => city.id === selectedCityId);

    if (selected) {
      map.flyTo([selected.lat, selected.lng], Math.max(map.getZoom(), 5), {
        duration: 0.6
      });
    }
  }, [cities, map, selectedCityId]);

  useEffect(() => {
    const enableScroll = () => map.scrollWheelZoom.enable();
    map.on("click", enableScroll);

    return () => {
      map.off("click", enableScroll);
    };
  }, [map]);

  return null;
}

export default function DistributionMap({
  cities,
  selectedCityId,
  onCitySelect
}: DistributionMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <button
        onClick={toggleFullscreen}
        className="absolute right-4 top-4 z-[9999] flex h-10 w-10 items-center justify-center bg-transparent text-orange-500 transition-colors hover:text-orange-400"
        title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
      >
        {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
      </button>

      <MapContainer
        center={[22.8, 79.5]}
        zoom={4}
        minZoom={4}
        maxZoom={9}
        className="h-full min-h-[420px] w-full"
        zoomControl={false}
      >
      <TileLayer
        attribution="&copy; CartoDB"
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <MapBehavior cities={cities} selectedCityId={selectedCityId} />

      {cities.map((city) => {
        const color = bandColors[city.band];

        return (
          <CircleMarker
            key={city.id}
            center={[city.lat, city.lng]}
            radius={radiusForTier(city.tier)}
            pathOptions={{
              color,
              weight: city.id === selectedCityId ? 3 : 1,
              fillColor: color,
              fillOpacity: 0.85
            }}
            eventHandlers={{
              click: () => onCitySelect(city),
              mouseover: (event: LeafletMouseEvent) => event.target.openPopup(),
              mouseout: (event: LeafletMouseEvent) => event.target.closePopup()
            }}
          >
            <Popup>
              <div className="w-64">
                <p
                  className="font-heading text-lg font-bold"
                  style={{ color }}
                >
                  {city.name}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted">
                  {city.state} · Tier {city.tier}
                </p>
                <div className="mt-4 space-y-2 text-xs leading-5">
                  <p>Score: {city.score}/100</p>
                  <p>
                    Est. demand: {formatNumber(city.demand)} units/mo
                    <br />
                    <span className="text-muted">
                      P10: {formatNumber(city.demandLow)} — P90:{" "}
                      {formatNumber(city.demandHigh)}
                    </span>
                  </p>
                  <span
                    className="inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.2em]"
                    style={{
                      backgroundColor: `${color}1A`,
                      borderColor: `${color}33`,
                      color
                    }}
                  >
                    {city.band}
                  </span>
                  <p className="text-foreground">
                    Level {city.distributionLevel}, {city.distributionType}, via{" "}
                    {city.distributorProfile}
                  </p>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
      </MapContainer>
    </div>
  );
}
