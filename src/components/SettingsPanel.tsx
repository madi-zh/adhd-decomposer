"use client";

import { useState } from "react";

interface SettingsPanelProps {
  settings: {
    eveningCutoffHour: number;
    eveningCutoffMin: number;
    enableEveningMode: boolean;
    enableFocusTimer: boolean;
  };
}

export default function SettingsPanel({ settings: initial }: SettingsPanelProps) {
  const [enableEveningMode, setEnableEveningMode] = useState(initial.enableEveningMode);
  const [enableFocusTimer, setEnableFocusTimer] = useState(initial.enableFocusTimer);
  const [cutoffHour, setCutoffHour] = useState(initial.eveningCutoffHour);
  const [cutoffMin, setCutoffMin] = useState(initial.eveningCutoffMin);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setIsSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enableEveningMode,
          enableFocusTimer,
          eveningCutoffHour: cutoffHour,
          eveningCutoffMin: cutoffMin,
        }),
      });

      if (!res.ok) throw new Error();
      setMessage("Settings saved");
    } catch {
      setMessage("Could not save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="pt-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-8">Settings</h1>

      <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-6">
        {/* Focus Timer Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-stone-700 font-medium">Focus timer</p>
            <p className="text-stone-400 text-sm">
              Set a time limit before starting tasks
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enableFocusTimer}
            onClick={() => setEnableFocusTimer(!enableFocusTimer)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              enableFocusTimer ? "bg-amber-500" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                enableFocusTimer ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Evening Mode Toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-stone-700 font-medium">Evening mode</p>
            <p className="text-stone-400 text-sm">
              Gentle reminder to stop working and protect your sleep
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enableEveningMode}
            onClick={() => setEnableEveningMode(!enableEveningMode)}
            className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
              enableEveningMode ? "bg-amber-500" : "bg-stone-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                enableEveningMode ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Evening Cutoff Time */}
        {enableEveningMode && (
          <div>
            <p className="text-stone-700 font-medium mb-2">Evening cutoff time</p>
            <div className="flex items-center gap-2">
              <label htmlFor="cutoff-hour" className="sr-only">
                Hour
              </label>
              <select
                id="cutoff-hour"
                value={cutoffHour}
                onChange={(e) => setCutoffHour(parseInt(e.target.value, 10))}
                className="px-3 py-2 border-2 border-stone-200 rounded-xl text-stone-700
                           focus:border-amber-400 focus:outline-none"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, "0")}
                  </option>
                ))}
              </select>
              <span className="text-stone-400 font-medium">:</span>
              <label htmlFor="cutoff-min" className="sr-only">
                Minute
              </label>
              <select
                id="cutoff-min"
                value={cutoffMin}
                onChange={(e) => setCutoffMin(parseInt(e.target.value, 10))}
                className="px-3 py-2 border-2 border-stone-200 rounded-xl text-stone-700
                           focus:border-amber-400 focus:outline-none"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, "0")}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="py-3 px-6 bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                       disabled:bg-amber-300 text-white font-semibold rounded-2xl
                       transition-all hover:shadow-lg active:scale-[0.98] cursor-pointer
                       disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          {message && (
            <p
              className={`text-sm ${
                message.includes("saved")
                  ? "text-emerald-600"
                  : "text-red-500"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
