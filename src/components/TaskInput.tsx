"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import LoadingDecompose from "./LoadingDecompose";

export default function TaskInput() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) {
      setError("Type something you need to do!");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Something went wrong");
      }

      const task = await res.json();
      router.push(`/task/${task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to break down task. Try again!");
      setLoading(false);
    }
  }

  function handlePreload() {
    void import("@/components/StepCard");
    void import("@/components/ProgressBar");
  }

  if (loading) {
    return <LoadingDecompose />;
  }

  return (
    <div className="flex flex-col items-center pt-12">
      <h1 className="text-3xl font-bold text-stone-800 text-center mb-2">
        What do you need to do?
      </h1>
      <p className="text-stone-500 text-center mb-8 max-w-md">
        Type any task that feels overwhelming. We&apos;ll break it into tiny,
        doable steps.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-lg">
        <label htmlFor="task-input" className="sr-only">
          Describe your task
        </label>
        <textarea
          id="task-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Clean my apartment, Write a college essay, Do my taxes..."
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "task-error" : undefined}
          className="w-full h-32 p-4 text-lg border-2 border-stone-200 rounded-2xl resize-none
                     focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100
                     placeholder:text-stone-300 bg-white transition-all"
          autoFocus
        />

        {error && (
          <p id="task-error" role="alert" className="text-red-500 text-sm mt-2 text-center">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          onMouseEnter={handlePreload}
          onFocus={handlePreload}
          className="w-full mt-4 py-4 px-6 bg-amber-500 hover:bg-amber-600 active:bg-amber-700
                     disabled:bg-amber-300 text-white font-semibold text-lg rounded-2xl transition-all
                     hover:shadow-lg active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed"
        >
          Break it down for me
        </button>
      </form>

      <p className="text-stone-400 text-xs mt-6 text-center">
        No signup needed. Your tasks are stored locally.
      </p>
    </div>
  );
}
