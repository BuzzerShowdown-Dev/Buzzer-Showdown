import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

/**
 * QR code that points phones straight at the room's join page.
 * The URL needs the browser's origin, so it is only rendered once hydrated.
 */
export function JoinQR({ code, size = 150 }: { code: string; size?: number }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`${window.location.origin}/room/${code}`);
  }, [code]);

  if (!url) return null;

  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="rounded-2xl bg-qr-surface p-3">
        <QRCode value={url} size={size} level="M" />
      </div>
      <figcaption className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Scan to join</figcaption>
    </figure>
  );
}
