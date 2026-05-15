import { AppShell } from '../components/app-shell';
import { AuthPanel } from '../components/auth-panel';
import { ChildrenManager } from '../components/children-manager';

export default function ChildrenPage() {
  return (
    <AppShell active="Children">
      <header className="page-header">
        <div>
          <p className="eyebrow">Profiles</p>
          <h1>Children</h1>
          <p className="header-copy">
            Manage child profiles used to personalize Russian story generation.
          </p>
        </div>
        <span className="status-pill">Parent-owned</span>
      </header>

      <AuthPanel />
      <ChildrenManager />
    </AppShell>
  );
}
