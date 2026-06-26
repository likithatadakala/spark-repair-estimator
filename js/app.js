import { loadAll, activeProject, newProject, overridesFor, persistNow } from './store.js';
import { renderProject } from './views.js';

const app = document.getElementById('app');

function render(){
  const p = activeProject();
  app.innerHTML = renderProject(p, overridesFor(p));
}

loadAll();
if (!activeProject()) newProject('New Estimate');
render();

app.addEventListener('click', (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  if (a === 'open-room') { console.log('open-room', el.dataset.room); return; }
  // add-room / export / deal / settings / projects / rename-project are wired in later tasks
  console.log('action:', a);
});

window.addEventListener('pagehide', persistNow);
document.addEventListener('visibilitychange', () => { if (document.hidden) persistNow(); });
