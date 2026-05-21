// This script runs before hydration to avoid theme flash.
// It must be kept in sync with ThemeToggle logic.
export function ThemeScript() {
  const script = `
    (function() {
      var stored = localStorage.getItem('storycraft-theme');
      var theme = 'light';
      if (stored === 'light' || stored === 'dark') {
        theme = stored;
      } else {
        theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', theme);
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
