import {useCallback, useEffect, useState} from "react";
import {normaliseDesktopPath} from "./navigation";

function currentPath() {
  return normaliseDesktopPath(window.location.pathname);
}

export function useDesktopRouter() {
  const [path, setPath] = useState(currentPath);

  const navigate = useCallback((nextPath: string) => {
    const next = normaliseDesktopPath(nextPath);
    if (next === currentPath()) {
      setPath(next);
      return;
    }
    window.history.pushState({}, "", next);
    setPath(next);
    document.getElementById("main-content")?.focus();
  }, []);

  useEffect(() => {
    const onPopState = () => setPath(currentPath());
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//") || anchor.target === "_blank") return;
      event.preventDefault();
      navigate(href);
    };

    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onDocumentClick);
    return () => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onDocumentClick);
    };
  }, [navigate]);

  return {path, navigate};
}
