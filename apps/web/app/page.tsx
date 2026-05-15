import { AppShell } from './components/app-shell';
import { AuthPanel } from './components/auth-panel';

const sections = [
  {
    title: 'Child profiles',
    body: 'Profiles for children connected to the signed-in parent account.',
    status: 'Planned',
  },
  {
    title: 'Book templates',
    body: 'Russian story structures with generation and illustration prompts.',
    status: 'Planned',
  },
  {
    title: 'Generation jobs',
    body: 'Persistent async state for books, illustrations, and PDFs.',
    status: 'Planned',
  },
];

export default function HomePage() {
  return (
    <AppShell active="Dashboard">
      <header className="page-header">
        <div>
          <p className="eyebrow">MVP foundation</p>
          <h1>Storycraft workspace</h1>
          <p className="header-copy">
            Russian children books, parent profiles, generation jobs, and
            downloadable PDFs.
          </p>
        </div>
        <span className="status-pill">Free plan first</span>
      </header>

      <AuthPanel />

      <div className="grid">
        {sections.map((section) => (
          <article className="panel" key={section.title}>
            <h2>{section.title}</h2>
            <p>{section.body}</p>
            <div className="panel-status">{section.status}</div>
          </article>
        ))}
      </div>
    </AppShell>
  );
}
