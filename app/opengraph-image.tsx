import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "sow.fun - every trade, a real loan, for a real person";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#16261c",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 999,
              backgroundColor: "#2AA967",
              display: "flex",
            }}
          />
          <div style={{ display: "flex", fontSize: 34, color: "#EDF4F1", fontWeight: 600 }}>
            sow.fun
          </div>
          <div style={{ display: "flex", fontSize: 26, color: "#7FC79E", marginLeft: 8 }}>
            × kiva
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 82, color: "#EDF4F1", lineHeight: 1.15 }}>
            Sow a coin,
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 82, color: "#F8CD69", fontStyle: "italic", lineHeight: 1.15 }}>
              grow a life.
            </div>
            <div
              style={{
                width: 420,
                height: 10,
                borderRadius: 999,
                backgroundColor: "#2AA967",
                marginTop: 8,
                display: "flex",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#A9CDB8", marginTop: 34 }}>
            45% of every trade funds a real Kiva borrower - locked at launch.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 28, color: "#A9CDB8" }}>
            Launch a coin for a Kiva borrower
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#EDF4F1" }}>
            sow.fun
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
