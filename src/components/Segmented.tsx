import { useLayoutEffect, useRef, useState } from "react";

type SegmentedProps<T extends string> = {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "md" | "sm";
  wide?: boolean;
};

/** Переключатель с «плавающей» подложкой под активным пунктом. */
export function Segmented<T extends string>({ options, value, onChange, label, size = "md", wide = false }: SegmentedProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => {
      const active = root.querySelector<HTMLButtonElement>("button[aria-pressed='true']");
      if (active) setThumb({ left: active.offsetLeft, width: active.offsetWidth });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(root);
    document.fonts?.ready.then(update);
    return () => observer.disconnect();
  }, [value, options.length]);

  return (
    <div ref={rootRef} className={`segmented segmented--${size} ${wide ? "segmented--wide" : ""}`} role="group" aria-label={label}>
      {thumb ? <span className="segmented__thumb" style={{ transform: `translateX(${thumb.left}px)`, width: thumb.width }} aria-hidden="true" /> : null}
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={option.id === value ? "is-active" : ""}
          aria-pressed={option.id === value}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
