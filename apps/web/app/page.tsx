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

const navItems = ['Dashboard', 'Children', 'Templates', 'Books', 'Settings'];

export default function HomePage() {
  return (
    <main className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <p className="brand">Storycraft</p>
        <p className="brand-subtitle">AI books for children</p>
        <nav className="nav">
          {navItems.map((item) => (
            <span
              className="nav-item"
              data-active={item === 'Dashboard'}
              key={item}
            >
              {item}
            </span>
          ))}
        </nav>
      </aside>

      <section className="content">
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
      </section>
    </main>
  );
}
