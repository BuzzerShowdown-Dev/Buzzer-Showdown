import { useState } from "react";
import { X } from "lucide-react";

/** Set this to the new app's download page URL when ready. */
const DOWNLOAD_URL = "";

/** Announcement popup shown once per visit: this site is the old version. */
export function NewVersionPopup() {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-version-title"
        className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-2xl sm:p-8"
      >
        <button
          aria-label="Close announcement"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 id="new-version-title" className="glow-text font-display text-2xl leading-tight text-primary sm:text-3xl">
          A newer version of Buzzer Showdown is available!
        </h2>

        <p className="mt-4 text-sm text-muted-foreground sm:text-base">
          We've moved to a brand-new app with more features and better performance.
          Download the newer version to keep the games going.
        </p>

        <a
          href={DOWNLOAD_URL || "#"}
          onClick={(e) => {
            if (!DOWNLOAD_URL) e.preventDefault();
          }}
          className="mt-6 inline-block w-full rounded-2xl bg-primary px-6 py-4 font-display text-lg text-primary-foreground shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] sm:w-auto"
        >
          Download Newer Version
        </a>
      </div>
    </div>
  );
}
