import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';
import { TemplateSelector } from '../components/template-selector';

export default function TemplatesPage() {
  return (
    <AppShell active="Templates">
      <header className="page-header">
        <div>
          <p className="eyebrow">Library</p>
          <h1>Templates</h1>
          <p className="header-copy">
            Choose a template to start creating a Russian children&apos;s book.
          </p>
        </div>
        <span className="status-pill">Ready</span>
      </header>

      <AuthPanel />
      <TemplateSelector />
    </AppShell>
  );
}
