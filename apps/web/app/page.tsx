const sections = [
  {
    title: 'Child profiles',
    body: 'Create parent-owned child profiles that will drive book personalization.',
    status: 'Planned',
  },
  {
    title: 'Book templates',
    body: 'Seed Russian templates with story and illustration prompts for the MVP flow.',
    status: 'Planned',
  },
  {
    title: 'Generation jobs',
    body: 'Track asynchronous book, illustration, and PDF generation through persistent jobs.',
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
            <h1>Russian children book generation workspace</h1>
            <p className="header-copy">
              This first screen marks the product shell for the parent workflow:
              profiles, templates, asynchronous generation, and downloadable
              PDFs.
            </p>
          </div>
          <span className="status-pill">Free plan first</span>
        </header>

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
