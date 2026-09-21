import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't manage scroll position on its own. After an in-app
// navigation, jump to the #section in the URL if there is one, otherwise to
// the top of the new page.
//
// The very first run is skipped: on a normal page load the browser has
// already handled the #hash, or restored the scroll position on refresh,
// and overriding that would be a step backwards.
export default function ScrollManager() {
  const { pathname, hash } = useLocation();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (hash) {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) {
        target.scrollIntoView();
        return;
      }
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}
