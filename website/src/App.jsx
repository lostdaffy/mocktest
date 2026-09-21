import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Page from "./components/Page";
import ScrollManager from "./components/ScrollManager";
import Home, { meta as homeMeta } from "./pages/Home";
import Contact, { meta as contactMeta } from "./pages/Contact";
import PrivacyPolicy, { meta as privacyMeta } from "./pages/PrivacyPolicy";
import Terms, { meta as termsMeta } from "./pages/Terms";
import RefundPolicy, { meta as refundMeta } from "./pages/RefundPolicy";
import DeliveryPolicy, { meta as deliveryMeta } from "./pages/DeliveryPolicy";
import DeleteAccount, { meta as deleteAccountMeta } from "./pages/DeleteAccount";
import NotFound, { meta as notFoundMeta } from "./pages/NotFound";

// Every public page. prerender.js walks this same list to write one real
// HTML file per page, so adding a page here is all it takes to ship it.
// Paths have no trailing slash - React Router matches /terms and /terms/
// alike, and the prerendered file lives at /terms/index.html.
export const routes = [
  { path: "/", Component: Home, meta: homeMeta },
  { path: "/contact", Component: Contact, meta: contactMeta },
  { path: "/privacy-policy", Component: PrivacyPolicy, meta: privacyMeta },
  { path: "/terms", Component: Terms, meta: termsMeta },
  { path: "/refund-policy", Component: RefundPolicy, meta: refundMeta },
  { path: "/delivery-policy", Component: DeliveryPolicy, meta: deliveryMeta },
  { path: "/delete-account", Component: DeleteAccount, meta: deleteAccountMeta },
];

export const notFound = { Component: NotFound, meta: notFoundMeta };

// Unlike the admin panel, the router itself lives outside <App />: the
// browser wraps it in <BrowserRouter> (main.jsx) and the build-time
// prerender wraps it in <StaticRouter> (entry-server.jsx).
export default function App() {
  return (
    <>
      <ScrollManager />
      <Header />
      <main id="main">
        <Routes>
          {routes.map(({ path, Component, meta }) => (
            <Route
              key={path}
              path={path}
              element={
                <Page meta={meta}>
                  <Component />
                </Page>
              }
            />
          ))}
          <Route
            path="*"
            element={
              <Page meta={notFound.meta}>
                <NotFound />
              </Page>
            }
          />
        </Routes>
      </main>
      <Footer />
    </>
  );
}
