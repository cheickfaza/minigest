/* ═══════════════════════ MiniGest — application React v1.1 ═══════════════════════
 * v1.0 — ajout, affichage, recherche, suppression, total, validation, doublons,
 *         sauvegarde locale (tests T01 à T10).
 * v1.1 — évolutions du chapitre 9 du cahier des charges :
 *         · édition d'une fiche client existante (mêmes règles de validation)
 *         · tri de la liste : nom (A→Z) ou date d'ajout (plus récents d'abord)
 *         · statut « contacté » par client + filtre complémentaire
 *         · export et import de la liste au format CSV
 *         · confirmation avant suppression + annulation temporaire
 *         · synchronisation serveur : appels API déclenchés par useEffect
 *         · tableau de bord : statistiques et évolution des clients
 * Principe : UI = f(state) — aucune manipulation directe du DOM.
 * ══════════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var useState = React.useState;
  var useEffect = React.useEffect;
  var useMemo = React.useMemo;
  var useRef = React.useRef;
  var html = htm.bind(React.createElement);

  var STORAGE_KEY = 'minigest.clients.v1';
  var THEME_KEY = 'minigest.theme';
  var SYNC_KEY = 'minigest.sync.url';
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var EMPTY_FORM = { nom: '', email: '', telephone: '' };

  /* ── Persistance (RG-06 : données illisibles → liste vide ; migration v1.0) ── */
  function genId() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
    } catch (e) { /* fallback ci-dessous */ }
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function normalizeClient(c) {
    return {
      id: String(c.id || genId()),
      nom: String(c.nom || ''),
      email: String(c.email || ''),
      telephone: String(c.telephone || ''),
      contacte: Boolean(c.contacte),
      creeLe: (c.creeLe && !isNaN(new Date(c.creeLe).getTime())) ? new Date(c.creeLe).toISOString() : new Date().toISOString()
    };
  }

  function loadClients() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      if (!Array.isArray(data)) return [];
      return data
        .filter(function (c) { return c && typeof c === 'object' && typeof c.nom === 'string'; })
        .map(normalizeClient);
    } catch (e) {
      return [];
    }
  }

  function saveClients(list) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) { /* stockage indisponible : l'application continue en mémoire */ }
  }

  /* ── Aides de dates ── */
  function dayKey(d) {
    var dt = (d instanceof Date) ? d : new Date(d);
    return dt.getFullYear() + '-' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2);
  }

  function lastDays(n) {
    var out = [];
    var now = new Date();
    for (var i = n - 1; i >= 0; i--) {
      var dd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push({ key: dayKey(dd), label: ('0' + dd.getDate()).slice(-2) + '/' + ('0' + (dd.getMonth() + 1)).slice(-2), count: 0 });
    }
    return out;
  }

  /* ── CSV (RG-07 : export et import) ── */
  function csvEscape(v) {
    v = String(v);
    return /[;"\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }

  function buildCsv(list) {
    var head = ['id', 'nom', 'email', 'telephone', 'contacte', 'creeLe'];
    var lines = [head.join(';')];
    list.forEach(function (c) {
      lines.push([c.id, c.nom, c.email, c.telephone, c.contacte ? 'oui' : 'non', c.creeLe || ''].map(csvEscape).join(';'));
    });
    return '\uFEFF' + lines.join('\r\n') + '\r\n';
  }

  function detectSep(line) {
    var semi = (line.match(/;/g) || []).length;
    var comma = (line.match(/,/g) || []).length;
    return semi >= comma ? ';' : ',';
  }

  function parseCsvLine(line, sep) {
    var out = [], cur = '', inQ = false, i, ch;
    for (i = 0; i < line.length; i++) {
      ch = line.charAt(i);
      if (inQ) {
        if (ch === '"') {
          if (line.charAt(i + 1) === '"') { cur += '"'; i++; } else { inQ = false; }
        } else { cur += ch; }
      } else if (ch === '"') { inQ = true; }
      else if (ch === sep) { out.push(cur); cur = ''; }
      else { cur += ch; }
    }
    out.push(cur);
    return out;
  }

  function parseCsv(text) {
    text = String(text).replace(/^\uFEFF/, '');
    var lines = text.split(/\r\n|\n|\r/).filter(function (l) { return l.trim() !== ''; });
    if (lines.length === 0) return { headers: [], rows: [] };
    var sep = detectSep(lines[0]);
    var headers = parseCsvLine(lines[0], sep).map(function (h) { return h.trim().toLowerCase(); });
    var rows = lines.slice(1).map(function (l) { return parseCsvLine(l, sep); });
    return { headers: headers, rows: rows, sep: sep };
  }

  var CSV_ALIASES = {
    nom: ['nom', 'name', 'fullname', 'nom complet'],
    email: ['email', 'mail', 'courriel', 'e-mail'],
    telephone: ['telephone', 'téléphone', 'tel', 'phone'],
    contacte: ['contacte', 'contacté', 'contact'],
    creele: ['creele', 'créé le', 'cree_le', 'date', 'createdat', 'created_at'],
    id: ['id']
  };

  function findCol(headers, field) {
    var aliases = CSV_ALIASES[field];
    for (var a = 0; a < aliases.length; a++) {
      var i = headers.indexOf(aliases[a]);
      if (i !== -1) return i;
    }
    return -1;
  }

  function importFromCsv(text, existing) {
    var data = parseCsv(text);
    if (data.rows.length === 0) return { error: 'Le fichier ne contient aucune ligne de données.' };
    var idx = {};
    var missing = [];
    ['nom', 'email', 'telephone', 'contacte', 'creele', 'id'].forEach(function (f) {
      idx[f] = findCol(data.headers, f);
      if ((f === 'nom' || f === 'email') && idx[f] === -1) missing.push(f);
    });
    if (missing.length > 0) return { error: 'Colonnes requises absentes : ' + missing.join(', ') + '.' };
    var seen = {};
    existing.forEach(function (c) { seen[c.email.toLowerCase()] = true; });
    var added = [], ignored = 0;
    data.rows.forEach(function (r) {
      var nom = (idx.nom !== -1 && r[idx.nom] ? r[idx.nom] : '').trim();
      var email = (idx.email !== -1 && r[idx.email] ? r[idx.email] : '').trim();
      var tel = idx.telephone !== -1 && r[idx.telephone] ? r[idx.telephone].trim() : '';
      if (nom.length < 2 || nom.length > 60 || !EMAIL_RE.test(email)) { ignored++; return; }
      var key = email.toLowerCase();
      if (seen[key]) { ignored++; return; }
      seen[key] = true;
      var contacte = idx.contacte !== -1 && r[idx.contacte] ? /^(oui|true|1|x|y|yes)$/i.test(r[idx.contacte].trim()) : false;
      var rawDate = idx.creele !== -1 && r[idx.creele] ? r[idx.creele].trim() : '';
      var parsed = rawDate ? new Date(rawDate) : null;
      var creeLe = (parsed && !isNaN(parsed.getTime())) ? parsed.toISOString() : new Date().toISOString();
      var id = idx.id !== -1 && r[idx.id] ? r[idx.id].trim() : '';
      added.push({ id: id || genId(), nom: nom, email: email, telephone: tel, contacte: contacte, creeLe: creeLe });
    });
    return { added: added, ignored: ignored };
  }

  /* Exposé pour les tests automatisés (build/parse CSV) */
  window.__mg = { buildCsv: buildCsv, parseCsv: parseCsv, importFromCsv: importFromCsv };

  /* ── Aides d'affichage ── */
  function initials(nom) {
    var words = nom.trim().split(/\s+/);
    if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  }

  var AVATAR_COLORS = [
    ['#eda06c', '#cf7040'],
    ['#82aaea', '#587fc5'],
    ['#6cc49b', '#3f9e77'],
    ['#b78de2', '#8d5ebe'],
    ['#e88fa4', '#c4637d'],
    ['#8fb7cb', '#5f8ea9']
  ];

  function avatarStyle(id) {
    var hash = 0;
    for (var i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
    var pair = AVATAR_COLORS[hash % AVATAR_COLORS.length];
    return { background: 'linear-gradient(135deg, ' + pair[0] + ', ' + pair[1] + ')' };
  }

  /* ── Icônes (Feather, MIT) ── */
  var I = {
    Search: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`; },
    User: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`; },
    Mail: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>`; },
    Phone: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`; },
    Trash: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`; },
    Plus: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`; },
    X: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; },
    Alert: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`; },
    Check: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`; },
    Lock: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`; },
    Sun: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`; },
    Moon: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`; },
    Users: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`; },
    SearchX: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8.5" y1="8.5" x2="13.5" y2="13.5"/><line x1="13.5" y1="8.5" x2="8.5" y2="13.5"/></svg>`; },
    Download: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`; },
    Upload: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`; },
    Edit: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>`; },
    Refresh: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`; },
    Server: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>`; },
    Calendar: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`; },
    Chart: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`; },
    CheckSq: function (p) { return html`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" ...${p}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`; }
  };

  /* ── Composant : en-tête (compteur F1.5 + thème) ── */
  function Header(props) {
    var total = props.total;
    return html`<header className="hero">
      <div className="hero-top">
        <div className="brand">
          <div className="logo" aria-hidden="true">MG</div>
          <div>
            <h1>MiniGest</h1>
            <p className="tagline">Gestion de clients · React</p>
          </div>
        </div>
        <button type="button" className="theme-btn" onClick=${props.onToggleTheme}
          aria-label=${props.theme === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre'}
          title=${props.theme === 'dark' ? 'Thème clair' : 'Thème sombre'}>
          ${props.theme === 'dark' ? html`<${I.Sun}/>` : html`<${I.Moon}/>`}
        </button>
      </div>
      <div className="hero-stats">
        <p className="stat" aria-live="polite">
          <span className="stat-num">${total}</span>
          <span className="stat-label">${total > 1 ? 'clients enregistrés' : 'client enregistré'}</span>
        </p>
        <p className="privacy"><${I.Lock}/>Données dans ce navigateur${props.syncUrl ? ' + serveur' : ''}</p>
      </div>
    </header>`;
  }

  /* ── Composant : onglets Liste / Tableau de bord ── */
  function Tabs(props) {
    return html`<div className="tabs" role="tablist" aria-label="Sections de l'application">
      <button type="button" role="tab" aria-selected=${props.view === 'liste'}
        className=${'tab' + (props.view === 'liste' ? ' active' : '')}
        onClick=${function () { props.setView('liste'); }}>
        <${I.Users} className="tab-ic"/>Clients
      </button>
      <button type="button" role="tab" aria-selected=${props.view === 'dashboard'}
        className=${'tab' + (props.view === 'dashboard' ? ' active' : '')}
        onClick=${function () { props.setView('dashboard'); }}>
        <${I.Chart} className="tab-ic"/>Tableau de bord
      </button>
    </div>`;
  }

  /* ── Composant : graphique d'évolution (barres, 14 derniers jours) ── */
  function Chart(props) {
    var days = props.days;
    var max = 1;
    days.forEach(function (d) { if (d.count > max) max = d.count; });
    var W = 560, H = 190, pad = 14, bw = 26;
    var step = (W - pad * 2) / days.length;
    return html`<svg viewBox="0 0 560 190" className="chart-svg" role="img"
      aria-label="Nouveaux clients par jour sur les 14 derniers jours">
      <line x1="0" y1="150" x2="560" y2="150" className="chart-axis"/>
      ${days.map(function (d, i) {
        var h = d.count ? Math.max(5, Math.round(d.count / max * 116)) : 0;
        var x = Math.round(pad + i * step + (step - bw) / 2);
        var y = 150 - h;
        return html`<g key=${d.key}>
          ${d.count ? html`<text x=${x + bw / 2} y=${y - 7} textAnchor="middle" className="chart-val">${d.count}</text>` : null}
          ${d.count ? html`<rect x=${x} y=${y} width=${bw} height=${h} rx="5" className="chart-bar"/>` : html`<rect x=${x} y=${147} width=${bw} height="3" rx="1.5" className="chart-zero"/>`}
          ${i % 2 === 0 ? html`<text x=${x + bw / 2} y="170" textAnchor="middle" className="chart-day">${d.label}</text>` : null}
        </g>`;
      })}
    </svg>`;
  }

  /* ── Composant : panneau de synchronisation ── */
  function statusInfo(status, syncAt) {
    if (status === 'envoi') return { cls: 'envoi', label: 'Envoi en cours…' };
    if (status === 'ok') return { cls: 'ok', label: 'Synchronisé' + (syncAt ? ' à ' + syncAt.toLocaleTimeString('fr-FR') : '') };
    if (status === 'erreur') return { cls: 'erreur', label: 'Serveur injoignable' };
    return { cls: 'local', label: 'Mode local — aucun serveur configuré' };
  }

  function SyncCard(props) {
    var info = statusInfo(props.status, props.syncAt);
    return html`<div className="card sync-card">
      <div className="card-head">
        <span className="head-icon"><${I.Server}/></span>
        <h2>Synchronisation serveur</h2>
      </div>
      <p className="card-sub">Chaque modification est envoyée automatiquement à l’adresse configurée (effet useEffect, POST JSON). Sans serveur configuré, tout reste en local.</p>
      <div className="sync-row">
        <${I.Server} className="input-icon"/>
        <input type="url" value=${props.url} placeholder="https://mon-api.vercel.app/clients"
          aria-label="Adresse de l'API de synchronisation"
          onChange=${function (e) { props.setUrl(e.target.value); }}/>
        <button type="button" className="btn-ghost" onClick=${props.toggleSync}>
          ${props.url ? 'Déconnecter' : 'Connecter'}
        </button>
      </div>
      <div className="sync-status">
        <span className=${'badge ' + info.cls}><span className="dot" aria-hidden="true"></span>${info.label}</span>
        ${props.url ? html`<button type="button" className="btn-mini" onClick=${props.pushNow}><${I.Refresh} className="btn-mini-ic"/>Envoyer maintenant</button>
        <button type="button" className="btn-mini" onClick=${props.pullServer}><${I.Download} className="btn-mini-ic"/>Importer du serveur</button>` : null}
      </div>
      <p className="hint">Contrat d’API : GET renvoie {"{"}"clients": [……]{"}"} ; POST reçoit la liste complète (détail au §5 du cahier des charges).</p>
    </div>`;
  }

  /* ── Composant : tableau de bord ── */
  function Dashboard(props) {
    var s = props.stats;
    return html`<section className="dash" aria-label="Tableau de bord">
      <div className="dash-stats">
        <div className="card stat-card">
          <span className="stat-ic a"><${I.Users}/></span>
          <p className="stat-big">${s.total}</p>
          <p className="stat-lab">Clients au total</p>
        </div>
        <div className="card stat-card">
          <span className="stat-ic b"><${I.CheckSq}/></span>
          <p className="stat-big">${s.contactes}</p>
          <p className="stat-lab">Contactés (${s.pct} %)</p>
        </div>
        <div className="card stat-card">
          <span className="stat-ic c"><${I.User}/></span>
          <p className="stat-big">${s.total - s.contactes}</p>
          <p className="stat-lab">À contacter</p>
        </div>
        <div className="card stat-card">
          <span className="stat-ic d"><${I.Calendar}/></span>
          <p className="stat-big">${s.week}</p>
          <p className="stat-lab">Ajoutés ces 7 derniers jours</p>
        </div>
      </div>

      <div className="dash-grid2">
        <div className="card chart-card">
          <div className="card-head">
            <span className="head-icon"><${I.Chart}/></span>
            <h2>Évolution des clients</h2>
          </div>
          <p className="card-sub">Nouveaux enregistrements par jour — 14 derniers jours.</p>
          ${s.total === 0 ? html`<p className="hint chart-empty">Aucune donnée pour l’instant : ajoutez des clients pour visualiser leur évolution.</p>` : html`<${Chart} days=${s.days}/>`}
        </div>

        <div className="dash-side">
          <div className="card ratio-card">
            <div className="card-head">
              <span className="head-icon"><${I.CheckSq}/></span>
              <h2>Clients contactés</h2>
            </div>
            <p className="card-sub">Répartition du suivi commercial.</p>
            <div className="ratio-bar" role="img" aria-label=${s.pct + ' % de clients contactés'}>
              <span className="ratio-seg on" style=${{ width: s.pct + '%' }}></span>
              <span className="ratio-seg off" style=${{ width: (100 - s.pct) + '%' }}></span>
            </div>
            <div className="ratio-legend">
              <span><i className="lg on" aria-hidden="true"></i>Contactés — ${s.contactes}</span>
              <span><i className="lg off" aria-hidden="true"></i>À contacter — ${s.total - s.contactes}</span>
            </div>
          </div>

          <${SyncCard} url=${props.syncUrl} setUrl=${props.setSyncDraft} status=${props.syncStatus}
            syncAt=${props.syncAt} toggleSync=${props.toggleSync} pushNow=${props.pushNow} pullServer=${props.pullServer}/>
        </div>
      </div>
    </section>`;
  }

  /* ── Composant principal ── */
  function App() {
    var clientsState = useState(loadClients);
    var clients = clientsState[0];
    var setClients = clientsState[1];

    var formState = useState(EMPTY_FORM);
    var form = formState[0];
    var setForm = formState[1];

    var errorsState = useState({});
    var errors = errorsState[0];
    var setErrors = errorsState[1];

    var queryState = useState('');
    var query = queryState[0];
    var setQuery = queryState[1];

    var toastState = useState(null);
    var toast = toastState[0];
    var setToast = toastState[1];

    var themeState = useState(function () {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    });
    var theme = themeState[0];
    var setTheme = themeState[1];

    var viewState = useState('liste');
    var view = viewState[0];
    var setView = viewState[1];

    var sortState = useState('nom');
    var sortMode = sortState[0];
    var setSortMode = sortState[1];

    var filterState = useState('tous');
    var filterContact = filterState[0];
    var setFilterContact = filterState[1];

    var editingState = useState(null);
    var editingId = editingState[0];
    var setEditingId = editingState[1];

    var modalState = useState(null);
    var modal = modalState[0];
    var setModal = modalState[1];

    var pendingState = useState(null);
    var pendingDeleted = pendingState[0];
    var setPendingDeleted = pendingState[1];

    var syncUrlState = useState(function () {
      try { return window.localStorage.getItem(SYNC_KEY) || ''; } catch (e) { return ''; }
    });
    var syncUrl = syncUrlState[0];
    var setSyncUrl = syncUrlState[1];
    var syncDraftState = useState(syncUrl);
    var syncDraft = syncDraftState[0];
    var setSyncDraft = syncDraftState[1];
    var syncStatusState = useState(syncUrl ? 'envoi' : 'local');
    var syncStatus = syncStatusState[0];
    var setSyncStatus = syncStatusState[1];
    var syncAtState = useState(null);
    var syncAt = syncAtState[0];
    var setSyncAt = syncAtState[1];
    var nonceState = useState(0);
    var nonce = nonceState[0];
    var setNonce = nonceState[1];

    var fileRef = useRef(null);
    var cancelRef = useRef(null);
    var formRef = useRef(null);

    /* Sauvegarde automatique après chaque modification (F2.3) */
    useEffect(function () { saveClients(clients); }, [clients]);

    /* Thème : attribut + persistance */
    useEffect(function () {
      document.documentElement.setAttribute('data-theme', theme);
      try { window.localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignoré */ }
    }, [theme]);

    /* Fermeture automatique du toast (plus longue si action « Annuler ») */
    useEffect(function () {
      if (!toast) return undefined;
      var t = setTimeout(function () { setToast(null); }, toast.undoable ? 7000 : 3200);
      return function () { clearTimeout(t); };
    }, [toast]);

    /* Échap. ferme la boîte de confirmation */
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape') setModal(null); }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); };
    }, []);

    /* Focus sur « Annuler » à l'ouverture de la boîte */
    useEffect(function () {
      if (modal && cancelRef.current) cancelRef.current.focus();
    }, [modal]);

    /* Synchronisation serveur : POST de la liste à chaque changement (RG-09) */
    useEffect(function () {
      if (!syncUrl) { setSyncStatus('local'); return undefined; }
      if (!/^https?:\/\/.+/i.test(syncUrl)) { setSyncStatus('erreur'); return undefined; }
      setSyncStatus('envoi');
      var ctrl = new AbortController();
      var timer = setTimeout(function () {
        fetch(syncUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clients: clients, exportedAt: new Date().toISOString() }),
          signal: ctrl.signal
        }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          setSyncStatus('ok');
          setSyncAt(new Date());
        }).catch(function () { setSyncStatus('erreur'); });
      }, 600);
      return function () { clearTimeout(timer); ctrl.abort(); };
    }, [clients, syncUrl, nonce]);

    /* Recherche (RG-03) + filtre contacté (RG-08) + tri (RG-08) */
    var q = query.trim().toLowerCase();
    var shown = useMemo(function () {
      var list = clients.filter(function (c) {
        return (!q || c.nom.toLowerCase().indexOf(q) !== -1);
      }).filter(function (c) {
        if (filterContact === 'contactes') return c.contacte;
        if (filterContact === 'non') return !c.contacte;
        return true;
      });
      if (sortMode === 'recents') {
        list = list.slice().sort(function (a, b) {
          return (Date.parse(b.creeLe) || 0) - (Date.parse(a.creeLe) || 0);
        });
      } else {
        list = list.slice().sort(function (a, b) {
          return a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' });
        });
      }
      return list;
    }, [clients, q, filterContact, sortMode]);

    var total = clients.length;
    var nbShown = shown.length;

    var countText;
    if (total === 0) countText = 'La liste est vide';
    else if (!q && filterContact === 'tous') countText = total > 1 ? total + ' clients dans la liste' : '1 client dans la liste';
    else countText = nbShown + (nbShown > 1 ? ' résultats' : ' résultat') + ' sur ' + total + (total > 1 ? ' clients' : ' client');

    /* ── Statistiques du tableau de bord ── */
    var stats = useMemo(function () {
      var contactes = clients.filter(function (c) { return c.contacte; }).length;
      var days = lastDays(14);
      var weekLimit = new Date(); weekLimit.setDate(weekLimit.getDate() - 6); weekLimit.setHours(0, 0, 0, 0);
      var week = 0;
      clients.forEach(function (c) {
        var d = new Date(c.creeLe);
        if (!isNaN(d.getTime())) {
          var k = dayKey(d);
          for (var i = 0; i < days.length; i++) { if (days[i].key === k) { days[i].count++; break; } }
          if (d >= weekLimit) week++;
        }
      });
      return {
        total: total,
        contactes: contactes,
        pct: total ? Math.round(contactes / total * 100) : 0,
        week: week,
        days: days
      };
    }, [clients]);

    /* ── Validation (RG-02, RG-04) — exclut la fiche en cours d'édition ── */
    function validate(vals, excludeId) {
      var errs = {};
      if (!vals.nom) errs.nom = 'Le nom est obligatoire.';
      else if (vals.nom.length < 2) errs.nom = 'Le nom doit contenir au moins 2 caractères.';
      else if (vals.nom.length > 60) errs.nom = 'Le nom ne peut pas dépasser 60 caractères.';

      if (!vals.email) errs.email = 'L’adresse e-mail est obligatoire.';
      else if (!EMAIL_RE.test(vals.email)) errs.email = 'L’adresse e-mail n’est pas valide.';
      else if (clients.some(function (c) {
        return c.id !== excludeId && c.email.toLowerCase() === vals.email.toLowerCase();
      })) {
        errs.email = 'Un client utilise déjà cette adresse e-mail.';
      }
      return errs;
    }

    function submit(e) {
      e.preventDefault();
      var vals = { nom: form.nom.trim(), email: form.email.trim(), telephone: form.telephone.trim() };
      var errs = validate(vals, editingId);
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        var first = ['nom', 'email', 'telephone'].filter(function (k) { return errs[k]; })[0];
        var el = document.getElementById('f-' + first);
        if (el) el.focus();
        return;
      }
      if (editingId) {
        /* Édition : mêmes règles de validation, réenregistrement de la fiche */
        setClients(function (list) {
          return list.map(function (c) {
            return c.id === editingId ? { id: c.id, nom: vals.nom, email: vals.email, telephone: vals.telephone, contacte: c.contacte, creeLe: c.creeLe } : c;
          });
        });
        setToast({ id: genId(), type: 'success', text: 'Fiche de ' + vals.nom + ' mise à jour.' });
        setEditingId(null);
        setForm(EMPTY_FORM);
        setErrors({});
      } else {
        var client = { id: genId(), nom: vals.nom, email: vals.email, telephone: vals.telephone, contacte: false, creeLe: new Date().toISOString() };
        setClients(function (list) { return list.concat([client]); });
        setToast({ id: genId(), type: 'success', text: vals.nom + ' a été ajouté à la liste.' });
        setForm(EMPTY_FORM);
        setErrors({});
        setQuery('');
        setFilterContact('tous');
      }
      var nameInput = document.getElementById('f-nom');
      if (nameInput) nameInput.focus();
    }

    function startEdit(c) {
      setEditingId(c.id);
      setForm({ nom: c.nom, email: c.email, telephone: c.telephone });
      setErrors({});
      setView('liste');
      setFilterContact('tous');
      setTimeout(function () {
        if (formRef.current && formRef.current.scrollIntoView) formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        var el = document.getElementById('f-nom');
        if (el) el.focus();
      }, 60);
    }

    function cancelEdit() {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setErrors({});
    }

    /* ── Suppression : confirmation puis annulation temporaire (RG-05 v1.1) ── */
    function askDelete(c) {
      setModal({
        title: 'Supprimer ce client ?',
        text: 'La fiche de « ' + c.nom + ' » sera retirée de la liste. Vous pourrez annuler pendant quelques secondes après la suppression.',
        confirmLabel: 'Supprimer',
        danger: true,
        onConfirm: function () { doDelete(c); }
      });
    }

    function doDelete(c) {
      var index = -1;
      clients.forEach(function (x, i) { if (x.id === c.id) index = i; });
      setClients(function (list) { return list.filter(function (x) { return x.id !== c.id; }); });
      setPendingDeleted({ client: c, index: index });
      setToast({ id: genId(), type: 'info', text: c.nom + ' a été supprimé.', undoable: true });
    }

    function undoDelete() {
      if (!pendingDeleted) return;
      var c = pendingDeleted.client;
      var index = pendingDeleted.index;
      setClients(function (list) {
        var copy = list.slice();
        copy.splice(Math.max(0, Math.min(index, copy.length)), 0, c);
        return copy;
      });
      setPendingDeleted(null);
      setToast({ id: genId(), type: 'success', text: 'Suppression annulée — ' + c.nom + ' est de retour dans la liste.' });
    }

    function toggleContacte(c) {
      setClients(function (list) {
        return list.map(function (x) { return x.id === c.id ? { id: x.id, nom: x.nom, email: x.email, telephone: x.telephone, contacte: !x.contacte, creeLe: x.creeLe } : x; });
      });
    }

    /* ── Export / import CSV (RG-07) ── */
    function exportCsv() {
      var blob = new Blob([buildCsv(clients)], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'minigest_clients_' + dayKey(new Date()) + '.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 800);
      setToast({ id: genId(), type: 'success', text: 'Export CSV téléchargé (' + total + (total > 1 ? ' clients' : ' client') + ').' });
    }

    function onFileChosen(e) {
      var file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var res = importFromCsv(String(reader.result), clients);
        if (res.error) { setToast({ id: genId(), type: 'error', text: 'Import annulé — ' + res.error }); return; }
        if (res.added.length === 0) { setToast({ id: genId(), type: 'error', text: 'Import terminé : aucun client valide trouvé (' + res.ignored + ' ignoré(s)).' }); return; }
        setClients(function (list) { return list.concat(res.added); });
        setToast({ id: genId(), type: 'success', text: 'Import : ' + res.added.length + ' client(s) ajouté(s), ' + res.ignored + ' ignoré(s) (doublon ou invalide).' });
      };
      reader.readAsText(file, 'utf-8');
    }

    /* ── Synchronisation : connexion, envoi manuel, récupération ── */
    function toggleSync() {
      if (syncUrl) {
        setSyncUrl('');
        setSyncDraft('');
        try { window.localStorage.removeItem(SYNC_KEY); } catch (e) { /* ignoré */ }
      } else {
        var url = syncDraft.trim();
        if (!/^https?:\/\/.+/i.test(url)) {
          setToast({ id: genId(), type: 'error', text: 'Adresse invalide : commence par http:// ou https://' });
          return;
        }
        setSyncUrl(url);
        try { window.localStorage.setItem(SYNC_KEY, url); } catch (e) { /* ignoré */ }
      }
    }

    function pushNow() { setNonce(nonce + 1); }

    function pullServer() {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 8000);
      fetch(syncUrl, { signal: ctrl.signal }).then(function (r) {
        clearTimeout(timer);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (json) {
        var arr = Array.isArray(json) ? json : (json && Array.isArray(json.clients) ? json.clients : null);
        if (!arr) throw new Error('format');
        var list = arr.filter(function (c) { return c && typeof c === 'object' && typeof c.nom === 'string'; }).map(normalizeClient);
        setModal({
          title: 'Importer depuis le serveur ?',
          text: 'La liste locale (' + total + ' client(s)) sera remplacée par celle du serveur (' + list.length + ' client(s)).',
          confirmLabel: 'Remplacer',
          danger: false,
          onConfirm: function () {
            setClients(list);
            setToast({ id: genId(), type: 'success', text: 'Liste récupérée depuis le serveur (' + list.length + ' client(s)).' });
          }
        });
      }).catch(function () {
        setToast({ id: genId(), type: 'error', text: 'Récupération impossible — serveur injoignable ou réponse invalide.' });
      });
    }

    function toggleTheme() { setTheme(theme === 'dark' ? 'light' : 'dark'); }

    /* ── Zones de liste ── */
    var listArea;
    if (total === 0) {
      listArea = html`<div className="card empty">
        <span className="empty-ill"><${I.Users}/></span>
        <h3>Aucun client pour le moment</h3>
        <p>Ajoutez votre premier client avec le formulaire. Votre liste est conservée automatiquement dans ce navigateur.</p>
      </div>`;
    } else if (nbShown === 0) {
      if (q) {
        listArea = html`<div className="card empty">
          <span className="empty-ill"><${I.SearchX}/></span>
          <h3>Aucun résultat</h3>
          <p>Aucun client ne correspond à « ${query} ». Vérifiez l’orthographe ou essayez un autre nom.</p>
          <button type="button" className="btn-ghost" onClick=${function () { setQuery(''); }}>
            <${I.X}/>Effacer la recherche
          </button>
        </div>`;
      } else {
        listArea = html`<div className="card empty">
          <span className="empty-ill"><${I.SearchX}/></span>
          <h3>Aucun client dans ce filtre</h3>
          <p>Le filtre « ${filterContact === 'contactes' ? 'Contactés' : 'Non contactés'} » ne renvoie aucun client. Affichez tous les clients pour retrouver la liste complète.</p>
          <button type="button" className="btn-ghost" onClick=${function () { setFilterContact('tous'); }}>
            <${I.X}/>Afficher tous les clients
          </button>
        </div>`;
      }
    } else {
      listArea = html`<div className="card list-card">
        <ul className="client-list">
          ${shown.map(function (c, i) {
            return html`<li key=${c.id} className=${'client-row' + (editingId === c.id ? ' editing' : '')} style=${{ animationDelay: Math.min(i * 40, 240) + 'ms' }}>
              <div className="avatar" style=${avatarStyle(c.id)} aria-hidden="true">${initials(c.nom)}</div>
              <div className="client-info">
                <p className="client-name">${c.nom}</p>
                <p className="client-meta">
                  <span className="meta-item"><${I.Mail} className="meta-icon"/><span>${c.email}</span></span>
                  ${c.telephone ? html`<span className="meta-item"><${I.Phone} className="meta-icon"/><span>${c.telephone}</span></span>` : null}
                </p>
              </div>
              <div className="row-actions">
                <label className="switch" title=${c.contacte ? 'Marquer comme non contacté' : 'Marquer comme contacté'}>
                  <input type="checkbox" checked=${c.contacte} onChange=${function () { toggleContacte(c); }}
                    aria-label=${'Marquer ' + c.nom + (c.contacte ? ' comme non contacté' : ' comme contacté')}/>
                  <span className="track" aria-hidden="true"></span>
                  <span className="switch-lab">Contacté</span>
                </label>
                <button type="button" className="btn-del" onClick=${function () { startEdit(c); }}
                  aria-label=${'Modifier ' + c.nom} title="Modifier la fiche">
                  <${I.Edit}/>
                </button>
                <button type="button" className="btn-del" onClick=${function () { askDelete(c); }}
                  aria-label=${'Supprimer ' + c.nom} title="Supprimer">
                  <${I.Trash}/>
                </button>
              </div>
            </li>`;
          })}
        </ul>
      </div>`;
    }

    /* ── Rendu global ── */
    return html`<div className="container">
      <${Header} total=${total} theme=${theme} onToggleTheme=${toggleTheme} syncUrl=${syncUrl}/>

      <${Tabs} view=${view} setView=${setView}/>

      ${view === 'dashboard' ? html`<${Dashboard} stats=${stats} syncUrl=${syncUrl} setSyncDraft=${setSyncDraft}
        syncStatus=${syncStatus} syncAt=${syncAt} toggleSync=${toggleSync} pushNow=${pushNow} pullServer=${pullServer}/>` : html`<main className="layout">
        <section className="card form-card" aria-labelledby="form-title" ref=${formRef}>
          <div className="card-head">
            <span className="head-icon"><${editingId ? I.Edit : I.User}/></span>
            <h2 id="form-title">${editingId ? 'Modifier le client' : 'Nouveau client'}</h2>
          </div>
          <p className="card-sub">${editingId ? 'Modifiez les champs puis enregistrez — les mêmes règles de validation s’appliquent.' : 'Les champs marqués d’une étoile sont obligatoires.'}</p>

          <form onSubmit=${submit} noValidate>
            <div className="field">
              <label htmlFor="f-nom">Nom complet <span className="req" aria-hidden="true">*</span></label>
              <div className=${'input-wrap' + (errors.nom ? ' has-error' : '')}>
                <${I.User} className="input-icon"/>
                <input id="f-nom" name="nom" type="text" value=${form.nom}
                  placeholder="Ex. : Fatou Ndiaye" autoComplete="name"
                  onChange=${function (e) { setForm({ nom: e.target.value, email: form.email, telephone: form.telephone }); }}
                  aria-invalid=${errors.nom ? 'true' : undefined}
                  aria-describedby=${errors.nom ? 'err-nom' : undefined}/>
              </div>
              ${errors.nom ? html`<p className="field-error" id="err-nom"><${I.Alert}/>${errors.nom}</p>` : null}
            </div>

            <div className="field">
              <label htmlFor="f-email">Adresse e-mail <span className="req" aria-hidden="true">*</span></label>
              <div className=${'input-wrap' + (errors.email ? ' has-error' : '')}>
                <${I.Mail} className="input-icon"/>
                <input id="f-email" name="email" type="email" value=${form.email}
                  placeholder="Ex. : fatou.ndiaye@email.com" autoComplete="email" inputMode="email"
                  onChange=${function (e) { setForm({ nom: form.nom, email: e.target.value, telephone: form.telephone }); }}
                  aria-invalid=${errors.email ? 'true' : undefined}
                  aria-describedby=${errors.email ? 'err-email' : undefined}/>
              </div>
              ${errors.email ? html`<p className="field-error" id="err-email"><${I.Alert}/>${errors.email}</p>` : null}
            </div>

            <div className="field">
              <label htmlFor="f-tel">Téléphone <span className="opt">(facultatif)</span></label>
              <div className="input-wrap">
                <${I.Phone} className="input-icon"/>
                <input id="f-tel" name="telephone" type="tel" value=${form.telephone}
                  placeholder="Ex. : +221 77 123 45 67" autoComplete="tel" inputMode="tel"
                  onChange=${function (e) { setForm({ nom: form.nom, email: form.email, telephone: e.target.value }); }}/>
              </div>
            </div>

            <div className="form-actions">
              ${editingId ? html`<button type="button" className="btn-ghost btn-cancel" onClick=${cancelEdit}>
                <${I.X}/>Annuler
              </button>` : null}
              <button type="submit" className="btn-primary">
                ${editingId ? html`<${I.Check}/>Enregistrer les modifications` : html`<${I.Plus}/>Ajouter le client`}
              </button>
            </div>
          </form>
        </section>

        <section className="list-col" aria-label="Liste des clients">
          <div className="card toolbar">
            <div className="toolbar-top">
              <div className="search-wrap">
                <${I.Search} className="input-icon"/>
                <input id="f-search" type="text" value=${query}
                  placeholder="Rechercher un client par son nom…"
                  aria-label="Rechercher un client par son nom"
                  onChange=${function (e) { setQuery(e.target.value); }}/>
                ${query ? html`<button type="button" className="clear-btn" onClick=${function () { setQuery(''); }} aria-label="Effacer la recherche"><${I.X}/></button>` : null}
              </div>
              <p className="count" aria-live="polite">${countText}</p>
            </div>
            <div className="toolbar-row">
              <div className="chips" role="group" aria-label="Filtrer par statut de contact">
                <button type="button" className=${'chip' + (filterContact === 'tous' ? ' on' : '')} onClick=${function () { setFilterContact('tous'); }}>Tous</button>
                <button type="button" className=${'chip' + (filterContact === 'contactes' ? ' on' : '')} onClick=${function () { setFilterContact('contactes'); }}>Contactés</button>
                <button type="button" className=${'chip' + (filterContact === 'non' ? ' on' : '')} onClick=${function () { setFilterContact('non'); }}>Non contactés</button>
              </div>
              <label className="sort-label">Trier
                <select value=${sortMode} onChange=${function (e) { setSortMode(e.target.value); }} aria-label="Ordre de tri de la liste">
                  <option value="nom">Nom (A → Z)</option>
                  <option value="recents">Ajout récent d’abord</option>
                </select>
              </label>
              <div className="tool-actions">
                <button type="button" className="icon-btn" onClick=${exportCsv} title="Exporter la liste en CSV (Excel)" aria-label="Exporter la liste en CSV"><${I.Download}/></button>
                <button type="button" className="icon-btn" onClick=${function () { if (fileRef.current) fileRef.current.click(); }} title="Importer un fichier CSV" aria-label="Importer un fichier CSV"><${I.Upload}/></button>
                <input type="file" accept=".csv,text/csv" ref=${fileRef} className="hidden-file" onChange=${onFileChosen} aria-hidden="true" tabIndex=${-1}/>
              </div>
            </div>
          </div>

          ${listArea}
        </section>
      </main>`}

      <footer className="foot">
        <p><strong>MiniGest v1.1</strong> · Application React · Cahier des charges : tests T01 à T18</p>
        <p>Vos données restent dans ce navigateur — la synchronisation ne s’active que si vous connectez un serveur.</p>
      </footer>

      ${toast ? html`<div key=${toast.id} className=${'toast ' + toast.type} role="status" aria-live="polite">
        <${toast.type === 'success' ? I.Check : toast.type === 'error' ? I.Alert : I.Trash} className="toast-icon"/>
        <span>${toast.text}</span>
        ${toast.undoable ? html`<button type="button" className="toast-action" onClick=${undoDelete}>Annuler</button>` : null}
      </div>` : null}

      ${modal ? html`<div className="overlay" onClick=${function (e) { if (e.target === e.currentTarget) setModal(null); }}>
        <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div className=${'modal-ic' + (modal.danger ? ' danger' : '')}>
            <${modal.danger ? I.Alert : I.Download}/>
          </div>
          <h3 id="modal-title">${modal.title}</h3>
          <p>${modal.text}</p>
          <div className="modal-actions">
            <button type="button" className="btn-ghost" ref=${cancelRef} onClick=${function () { setModal(null); }}>Annuler</button>
            <button type="button" className=${modal.danger ? 'btn-danger' : 'btn-primary'}
              onClick=${function () { var fn = modal.onConfirm; setModal(null); fn(); }}>
              ${modal.confirmLabel || 'Confirmer'}
            </button>
          </div>
        </div>
      </div>` : null}
    </div>`;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(html`<${App}/>`);
})();
