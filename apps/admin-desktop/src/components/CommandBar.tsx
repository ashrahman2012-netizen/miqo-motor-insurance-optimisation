import {useId, useMemo, useState} from "react";
import type {NavigationItem} from "@miqo/ui";

export function CommandBar({
  items,
  onNavigate,
}: {
  items: ReadonlyArray<NavigationItem>;
  onNavigate: (href: string) => void;
}) {
  const [query, setQuery] = useState("");
  const hintId = useId();
  const matches = useMemo(() => {
    const value = query.trim().toLocaleLowerCase();
    if (!value) return [];
    return items.filter(item => item.label.toLocaleLowerCase().includes(value)).slice(0, 5);
  }, [items, query]);

  return (
    <section className="desktop-command-bar" aria-label="Desktop navigation command">
      <div className="desktop-command-bar__field">
        <label htmlFor="desktop-command-search">Navigate Admin areas</label>
        <input
          id="desktop-command-search"
          type="search"
          value={query}
          aria-describedby={hintId}
          autoComplete="off"
          placeholder="Type a navigation area…"
          onChange={event => setQuery(event.currentTarget.value)}
        />
        <span id={hintId}>Local navigation only — this does not search cases or MIQOS business data.</span>
      </div>
      {matches.length ? (
        <ul className="desktop-command-bar__results" aria-label="Matching navigation areas">
          {matches.map(item => (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  onNavigate(item.href);
                }}
              >
                <span>{item.label}</span>
                <span aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
