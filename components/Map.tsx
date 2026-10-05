"use client";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import { KivaLoan, SECTOR_COLORS, COUNTRY_COORDS, COUNTRY_FLAGS } from "@/lib/types";

export default function ImpactMap({ loans }: { loans: KivaLoan[] }) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Dev StrictMode mounts twice; the async import means cleanup can run
    // before the map exists, so a cancelled flag stops the stale init.
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      const container = containerRef.current;
      if (cancelled || !container || (container as HTMLDivElement & { _leaflet_id?: number })._leaflet_id) return;

      const map = L.map(container, {
        center: [15, 20],
        zoom: 2,
        zoomControl: true,
        scrollWheelZoom: false,
      });

      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 10,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const makeIcon = (color: string) =>
        L.divIcon({
          className: "",
          html: `<div style="width:13px;height:13px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);cursor:pointer;"></div>`,
          iconSize: [13, 13],
          iconAnchor: [6, 6],
          popupAnchor: [0, -8],
        });

      const points: [number, number][] = [];
      const located = loans.filter((l) => COUNTRY_COORDS[l.location.country]);
      // When pins span more than half the globe (e.g. Kenya + Tonga), shift
      // western longitudes east by 360 so the map frames them across the
      // Pacific instead of zooming out to the whole world.
      const lngs = located.map((l) => COUNTRY_COORDS[l.location.country][1]);
      const wrap = lngs.length > 1 && Math.max(...lngs) - Math.min(...lngs) > 180;

      located.forEach((loan) => {
        const coords = COUNTRY_COORDS[loan.location.country];

        // Jitter slightly so pins don't overlap for same country
        const lat = coords[0] + (Math.random() - 0.5) * 2;
        const rawLng = wrap && coords[1] < 0 ? coords[1] + 360 : coords[1];
        const lng = rawLng + (Math.random() - 0.5) * 2;

        const color = SECTOR_COLORS[loan.sector] ?? SECTOR_COLORS.default;
        const flag = COUNTRY_FLAGS[loan.location.country] ?? "";
        const pct = loan.loan_amount > 0
          ? Math.round((loan.funded_amount / loan.loan_amount) * 100)
          : 0;
        const photoTag = loan.image_url
          ? `<img src="${loan.image_url}" onerror="this.style.display='none'" style="width:50px;height:50px;border-radius:12px;object-fit:cover;flex-shrink:0;" alt="${loan.name}"/>`
          : "";

        const popup = `
          <div style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;min-width:220px;font-family:inherit;">
            ${photoTag}
            <div>
              <div style="font-size:14px;font-weight:700;color:#223829;">${loan.name} ${flag}</div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px;">${loan.location.town ? loan.location.town + ", " : ""}${loan.location.country}</div>
              <div style="font-size:12px;margin-top:6px;color:#223829;">${loan.activity} · <strong style="color:#223829;">$${loan.loan_amount}</strong></div>
              <div style="font-size:11px;color:#6b7280;margin-top:3px;">${loan.use}</div>
              <div style="margin-top:6px;height:5px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                <div style="height:100%;width:${pct}%;background:#276A43;border-radius:3px;"></div>
              </div>
              <div style="font-size:10px;color:#6b7280;margin-top:2px;">${pct}% funded of $${loan.loan_amount}</div>
            </div>
          </div>`;

        points.push([lat, lng]);
        L.marker([lat, lng], { icon: makeIcon(color) })
          .addTo(map)
          .bindPopup(popup, { maxWidth: 290 });
      });

      // Frame every funded loan instead of a fixed world view
      if (points.length > 0) {
        map.fitBounds(L.latLngBounds(points), { padding: [48, 48], maxZoom: 4 });
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [loans]);

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height: "380px" }} />
      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur rounded-xl p-2.5 text-xs flex flex-col gap-1.5 z-[400] border border-gray-200 shadow">
        {[
          { color: "#F8CD69", label: "Harvest-funded loan" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-gray-600 font-medium">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
