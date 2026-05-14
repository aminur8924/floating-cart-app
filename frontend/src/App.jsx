import { AppProvider } from "@shopify/polaris";
import SettingsPage from "./pages/SettingsPage.jsx";

export default function App() {
  return (
    <AppProvider i18n={{}}>
      <SettingsPage />
    </AppProvider>
  );
}