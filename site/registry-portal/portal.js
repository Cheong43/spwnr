const config = window.__SPWNR_PORTAL_CONFIG__ ?? {};
const registrySiteUrl = config.registrySiteUrl ?? 'https://cheong43.github.io/spwnr-registry/';

const officialSiteLink = document.getElementById('official-site-link');
const templateGrid = document.getElementById('template-grid');
const summaryCopy = document.getElementById('summary-copy');
const searchInput = document.getElementById('search-input');
const hostFilter = document.getElementById('host-filter');
const domainFilter = document.getElementById('domain-filter');
const tagFilter = document.getElementById('tag-filter');

officialSiteLink.href = registrySiteUrl;

const state = {
  registry: { templates: [] },
  filters: { search: '', host: '', domain: '', tag: '' },
};

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function renderOptions(element, values, label) {
  element.innerHTML = `<option value="">All ${label}</option>`;
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    element.append(option);
  }
}

function matchesFilters(template) {
  const query = state.filters.search.trim().toLowerCase();
  const haystack = [
    template.name,
    template.description,
    ...(template.domains ?? []),
    ...(template.tags ?? []),
    ...(template.compatibilityHosts ?? []),
    ...((template.authors ?? []).map((author) => author.name)),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (query && !haystack.includes(query)) {
    return false;
  }

  if (state.filters.host && !(template.compatibilityHosts ?? []).includes(state.filters.host)) {
    return false;
  }

  if (state.filters.domain && !(template.domains ?? []).includes(state.filters.domain)) {
    return false;
  }

  if (state.filters.tag && !(template.tags ?? []).includes(state.filters.tag)) {
    return false;
  }

  return true;
}

function renderTemplates() {
  const templates = (state.registry.templates ?? []).filter(matchesFilters);
  templateGrid.innerHTML = '';

  if (!templates.length) {
    templateGrid.innerHTML = '<div class="empty-state">No templates match the current filters.</div>';
    summaryCopy.textContent = '0 templates shown from the current registry snapshot.';
    return;
  }

  summaryCopy.textContent = `${templates.length} template${templates.length === 1 ? '' : 's'} shown from ${state.registry.totalTemplates ?? templates.length} indexed entries.`;

  for (const template of templates) {
    const article = document.createElement('article');
    article.className = 'card';

    const hosts = (template.compatibilityHosts ?? [])
      .map((host) => `<span class="pill">${host}</span>`)
      .join('');
    const domains = (template.domains ?? [])
      .map((domain) => `<span class="pill">${domain}</span>`)
      .join('');
    const tags = (template.tags ?? [])
      .map((tag) => `<span class="pill">${tag}</span>`)
      .join('');
    const authors = (template.authors ?? [])
      .map((author) => `<li>${author.github ? `${author.name} (@${author.github})` : author.name}</li>`)
      .join('');
    const dependencies = (template.dependenciesSummary ?? [])
      .map((dependency) => `<li>${dependency}</li>`)
      .join('');

    article.innerHTML = `
      <p class="eyebrow">Latest ${template.latestVersion}</p>
      <h3>${template.name}</h3>
      <p>${template.description ?? 'No description provided.'}</p>
      <div class="pill-row">${domains}${hosts}${tags}</div>
      <p class="meta">Available versions: ${(template.versions ?? []).join(', ')}</p>
      ${authors ? `<ul class="authors">${authors}</ul>` : ''}
      ${dependencies ? `<ul class="dependency-list">${dependencies}</ul>` : ''}
      <div class="hero__actions">
        <a class="button button--primary" href="${registrySiteUrl.replace(/\/$/, '')}/template.html?name=${encodeURIComponent(template.name)}">Open details</a>
        <a class="button button--secondary" href="${template.sourcePath}" target="_blank" rel="noreferrer">Source tree</a>
      </div>
    `;

    templateGrid.append(article);
  }
}

function wireFilters() {
  searchInput.addEventListener('input', (event) => {
    state.filters.search = event.target.value;
    renderTemplates();
  });

  hostFilter.addEventListener('change', (event) => {
    state.filters.host = event.target.value;
    renderTemplates();
  });

  domainFilter.addEventListener('change', (event) => {
    state.filters.domain = event.target.value;
    renderTemplates();
  });

  tagFilter.addEventListener('change', (event) => {
    state.filters.tag = event.target.value;
    renderTemplates();
  });
}

async function boot() {
  const response = await fetch('./registry-index.json');
  state.registry = await response.json();
  renderOptions(hostFilter, unique((state.registry.templates ?? []).flatMap((template) => template.compatibilityHosts ?? [])), 'hosts');
  renderOptions(domainFilter, unique((state.registry.templates ?? []).flatMap((template) => template.domains ?? [])), 'domains');
  renderOptions(tagFilter, unique((state.registry.templates ?? []).flatMap((template) => template.tags ?? [])), 'tags');
  renderTemplates();
}

wireFilters();
boot().catch((error) => {
  summaryCopy.textContent = 'Failed to load registry snapshot.';
  templateGrid.innerHTML = `<div class="empty-state">${error instanceof Error ? error.message : 'Unknown error'}</div>`;
});
