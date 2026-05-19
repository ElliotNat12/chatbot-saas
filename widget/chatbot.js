/**
 * ChatbotSaaS — Widget universel
 * Usage: <script src="chatbot.js" data-config="config.js"></script>
 * ou: ChatbotSaaS.init(config)
 */
(function () {
  'use strict';

  const CSS = `
    :root {
      --cb-primary: #1a1a1a;
      --cb-accent: var(--client-accent, #2563eb);
      --cb-accent-light: var(--client-accent-light, #eff6ff);
      --cb-radius: 16px;
      --cb-font: 'DM Sans', system-ui, sans-serif;
    }
    #cb-launcher {
      position: fixed; bottom: 24px; right: 24px;
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--cb-accent); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 24px rgba(0,0,0,.18); z-index: 9998;
      transition: transform .2s, box-shadow .2s;
    }
    #cb-launcher:hover { transform: scale(1.07); box-shadow: 0 6px 28px rgba(0,0,0,.22); }
    #cb-launcher svg { width: 26px; height: 26px; fill: #fff; transition: opacity .2s; }
    #cb-launcher .cb-icon-close { display: none; }
    #cb-launcher.open .cb-icon-chat { display: none; }
    #cb-launcher.open .cb-icon-close { display: block; }
    #cb-badge {
      position: absolute; top: -2px; right: -2px;
      width: 14px; height: 14px; background: #ef4444;
      border-radius: 50%; border: 2px solid #fff; display: none;
    }
    #cb-badge.visible { display: block; }
    #cb-window {
      position: fixed; bottom: 92px; right: 24px;
      width: 360px; max-height: 560px; background: #fff;
      border-radius: var(--cb-radius);
      box-shadow: 0 8px 48px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08);
      display: flex; flex-direction: column; z-index: 9999; overflow: hidden;
      opacity: 0; transform: translateY(12px) scale(.97); pointer-events: none;
      transition: opacity .22s ease, transform .22s ease;
      font-family: var(--cb-font);
    }
    #cb-window.open { opacity: 1; transform: translateY(0) scale(1); pointer-events: all; }
    #cb-header {
      background: var(--cb-accent); color: #fff; padding: 14px 16px;
      display: flex; align-items: center; gap: 10px; flex-shrink: 0;
    }
    #cb-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: rgba(255,255,255,.2); display: flex;
      align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
    }
    #cb-header-info { flex: 1; min-width: 0; }
    #cb-header-name { font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #cb-header-status { font-size: 11px; opacity: .8; display: flex; align-items: center; gap: 4px; }
    #cb-header-status::before { content:''; width: 6px; height: 6px; border-radius: 50%; background: #4ade80; display: inline-block; }
    #cb-close-btn { background: none; border: none; color: rgba(255,255,255,.7); cursor: pointer; font-size: 20px; padding: 2px; line-height: 1; transition: color .15s; }
    #cb-close-btn:hover { color: #fff; }
    #cb-messages {
      flex: 1; overflow-y: auto; padding: 16px;
      display: flex; flex-direction: column; gap: 10px;
      background: #f8f9fb; scroll-behavior: smooth;
    }
    #cb-messages::-webkit-scrollbar { width: 4px; }
    #cb-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
    .cb-msg {
      max-width: 82%; padding: 9px 13px; border-radius: 16px;
      font-size: 13.5px; line-height: 1.55; animation: cb-pop .18s ease;
    }
    @keyframes cb-pop { from { opacity:0; transform: translateY(4px); } to { opacity:1; transform: none; } }
    .cb-msg.bot {
      background: #fff; color: #1a1a1a; align-self: flex-start;
      border-radius: 4px 16px 16px 16px; box-shadow: 0 1px 3px rgba(0,0,0,.06);
    }
    .cb-msg.user {
      background: var(--cb-accent); color: #fff; align-self: flex-end;
      border-radius: 16px 4px 16px 16px;
    }
    .cb-msg.escalate {
      background: #fffbeb; border: 1px solid #fbbf24; color: #78350f;
      align-self: flex-start; border-radius: 4px 16px 16px 16px;
    }
    .cb-msg-time { font-size: 10px; color: #9ca3af; margin-top: 2px; padding: 0 4px; }
    .cb-msg-time.right { text-align: right; }
    .cb-typing {
      display: flex; align-items: center; gap: 4px; padding: 10px 14px;
      background: #fff; border-radius: 4px 16px 16px 16px;
      align-self: flex-start; box-shadow: 0 1px 3px rgba(0,0,0,.06); animation: cb-pop .18s ease;
    }
    .cb-typing span { width: 6px; height: 6px; border-radius: 50%; background: #cbd5e1; animation: cb-bounce 1.2s infinite; }
    .cb-typing span:nth-child(2) { animation-delay: .15s; }
    .cb-typing span:nth-child(3) { animation-delay: .3s; }
    @keyframes cb-bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
    #cb-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 10px; background: #f8f9fb; }
    .cb-chip {
      font-size: 12px; padding: 5px 11px; border-radius: 20px;
      border: 1px solid #e2e8f0; background: #fff; color: #475569;
      cursor: pointer; transition: background .15s, border-color .15s, color .15s;
      font-family: var(--cb-font); white-space: nowrap;
    }
    .cb-chip:hover { background: var(--cb-accent-light); border-color: var(--cb-accent); color: var(--cb-accent); }
    #cb-input-area {
      display: flex; align-items: center; gap: 8px; padding: 12px 14px;
      border-top: 1px solid #f1f5f9; background: #fff; flex-shrink: 0;
    }
    #cb-input {
      flex: 1; border: 1px solid #e2e8f0; border-radius: 22px; padding: 9px 14px;
      font-size: 13.5px; font-family: var(--cb-font); outline: none; color: #1a1a1a;
      background: #f8f9fb; transition: border-color .15s, background .15s;
      resize: none; min-height: 38px; max-height: 100px; overflow-y: auto;
    }
    #cb-input:focus { border-color: var(--cb-accent); background: #fff; }
    #cb-input::placeholder { color: #94a3b8; }
    #cb-send {
      width: 36px; height: 36px; border-radius: 50%; background: var(--cb-accent);
      border: none; cursor: pointer; display: flex; align-items: center;
      justify-content: center; flex-shrink: 0; transition: transform .15s, opacity .15s;
    }
    #cb-send:hover { transform: scale(1.08); }
    #cb-send:disabled { opacity: .4; cursor: default; transform: none; }
    #cb-send svg { width: 16px; height: 16px; fill: #fff; }
    #cb-powered { text-align: center; font-size: 10px; color: #cbd5e1; padding: 6px; background: #fff; font-family: var(--cb-font); }
    #cb-powered a { color: #94a3b8; text-decoration: none; }
    @media (max-width: 420px) {
      #cb-window { width: calc(100vw - 32px); right: 16px; bottom: 80px; }
      #cb-launcher { right: 16px; bottom: 16px; }
    }
  `;

  function buildHTML(cfg) {
    return `
      <button id="cb-launcher" aria-label="Ouvrir le chat">
        <div id="cb-badge"></div>
        <svg class="cb-icon-chat" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2.546 20.5a.5.5 0 0 0 .629.63l3.378-.875A9.96 9.96 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
        <svg class="cb-icon-close" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none"/></svg>
      </button>
      <div id="cb-window" role="dialog" aria-label="Chat ${cfg.botName}">
        <div id="cb-header">
          <div id="cb-avatar">${cfg.avatar || '💬'}</div>
          <div id="cb-header-info">
            <div id="cb-header-name">${cfg.botName}</div>
            <div id="cb-header-status">${cfg.headerStatus || 'En ligne'}</div>
          </div>
          <button id="cb-close-btn" aria-label="Fermer">✕</button>
        </div>
        <div id="cb-messages"></div>
        <div id="cb-suggestions"></div>
        <div id="cb-input-area">
          <textarea id="cb-input" placeholder="${cfg.placeholder || 'Votre message...'}" rows="1"></textarea>
          <button id="cb-send" aria-label="Envoyer">
            <svg viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg>
          </button>
        </div>
        <div id="cb-powered">Propulsé par <a href="#" target="_blank">ChatbotSaaS</a></div>
      </div>
    `;
  }

  function init(cfg) {
    if (!document.querySelector('[data-cb-font]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap';
      link.setAttribute('data-cb-font', '');
      document.head.appendChild(link);
    }
    if (!document.querySelector('[data-cb-style]')) {
      const style = document.createElement('style');
      style.setAttribute('data-cb-style', '');
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    const root = document.documentElement;
    if (cfg.accentColor) {
      root.style.setProperty('--client-accent', cfg.accentColor);
      root.style.setProperty('--client-accent-light', cfg.accentColor + '18');
    }
    const container = document.createElement('div');
    container.setAttribute('data-chatbot-saas', '');
    container.innerHTML = buildHTML(cfg);
    document.body.appendChild(container);

    const launcher   = document.getElementById('cb-launcher');
    const win        = document.getElementById('cb-window');
    const closeBtn   = document.getElementById('cb-close-btn');
    const messages   = document.getElementById('cb-messages');
    const inputEl    = document.getElementById('cb-input');
    const sendBtn    = document.getElementById('cb-send');
    const badge      = document.getElementById('cb-badge');
    const suggestBox = document.getElementById('cb-suggestions');

    let history = [], isOpen = false, isTyping = false, greeted = false;

    function now() {
      return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    function addMsg(text, type) {
      const isEscalate = type === 'bot' && cfg.phone && text.includes(cfg.phone);
      const div = document.createElement('div');
      div.className = 'cb-msg ' + (isEscalate ? 'escalate' : type);
      div.textContent = text;
      messages.appendChild(div);
      const time = document.createElement('div');
      time.className = 'cb-msg-time' + (type === 'user' ? ' right' : '');
      time.textContent = now();
      messages.appendChild(time);
      messages.scrollTop = messages.scrollHeight;
    }
    function showTyping() {
      const d = document.createElement('div');
      d.className = 'cb-typing'; d.id = 'cb-typing';
      d.innerHTML = '<span></span><span></span><span></span>';
      messages.appendChild(d);
      messages.scrollTop = messages.scrollHeight;
    }
    function removeTyping() { const t = document.getElementById('cb-typing'); if (t) t.remove(); }
    function clearSuggestions() { suggestBox.innerHTML = ''; }
    function showSuggestions(chips) {
      clearSuggestions();
      (chips || []).slice(0, 5).forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'cb-chip'; btn.textContent = text;
        btn.onclick = () => sendMsg(text);
        suggestBox.appendChild(btn);
      });
    }

    async function callClaude(userText) {
      history.push({ role: 'user', content: userText });
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cfg.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system: buildSystemPrompt(cfg),
          messages: history
        })
      });
      if (!res.ok) throw new Error('API error ' + res.status);
      const data = await res.json();
      const reply = data.content?.[0]?.text || '...';
      history.push({ role: 'assistant', content: reply });
      return reply;
    }

    async function sendMsg(text) {
      if (!text.trim() || isTyping) return;
      clearSuggestions();
      addMsg(text, 'user');
      inputEl.value = ''; inputEl.style.height = 'auto';
      isTyping = true; sendBtn.disabled = true; showTyping();
      try {
        const reply = await callClaude(text);
        removeTyping(); addMsg(reply, 'bot');
      } catch (e) {
        removeTyping();
        addMsg(cfg.errorMessage || 'Désolé, une erreur s\'est produite.', 'bot');
      } finally {
        isTyping = false; sendBtn.disabled = false; inputEl.focus();
      }
    }

    function openChat() {
      isOpen = true; win.classList.add('open'); launcher.classList.add('open');
      badge.classList.remove('visible'); inputEl.focus();
      if (!greeted) {
        greeted = true;
        setTimeout(() => {
          addMsg(cfg.greeting || `Bonjour ! Je suis ${cfg.botName}. Comment puis-je vous aider ?`, 'bot');
          if (cfg.suggestions?.length) showSuggestions(cfg.suggestions);
        }, 300);
      }
    }
    function closeChat() { isOpen = false; win.classList.remove('open'); launcher.classList.remove('open'); }

    launcher.addEventListener('click', () => isOpen ? closeChat() : openChat());
    closeBtn.addEventListener('click', closeChat);
    sendBtn.addEventListener('click', () => sendMsg(inputEl.value));
    inputEl.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(inputEl.value); } });
    inputEl.addEventListener('input', () => { inputEl.style.height = 'auto'; inputEl.style.height = Math.min(inputEl.scrollHeight, 100) + 'px'; });

    if (cfg.badgeDelay !== false) setTimeout(() => { if (!isOpen) badge.classList.add('visible'); }, cfg.badgeDelay || 4000);
    if (cfg.autoOpen) setTimeout(openChat, cfg.autoOpen);

    return { open: openChat, close: closeChat, reset: () => { history = []; greeted = false; } };
  }

  function buildSystemPrompt(cfg) {
    return `## IDENTITÉ
Tu es ${cfg.botName}, l'assistant de ${cfg.businessName}.
${cfg.businessDescription || ''}

## LANGUE
Détecte automatiquement la langue du visiteur et réponds dans cette même langue.
Ne signale pas ce changement — adapte-toi naturellement.

## CE QUE TU SAIS
${cfg.faq}

## RÈGLES
- Réponses courtes : 1 à 3 phrases maximum
- Ton chaleureux, direct, jamais robotique
- Ne jamais inventer une info
- Si tu ne sais pas : dis-le honnêtement

## QUAND RENVOYER VERS LE TÉLÉPHONE
Redirige vers ${cfg.phone} si :
- La question dépasse tes informations
- Le client veut parler à quelqu'un
- Le client semble frustré
- Commande spéciale, groupe, réclamation, devis

Formulation : "Pour ça, le mieux est de nous appeler : ${cfg.phone}. ${cfg.phoneHours ? `Disponibles ${cfg.phoneHours}.` : ''}"

## CE QUE TU NE FAIS PAS
- Prendre une réservation${cfg.bookingUrl ? ` (renvoie vers ${cfg.bookingUrl})` : ''}
- Inventer des infos ou faire des promesses`;
  }

  window.ChatbotSaaS = { init };

  const scriptTag = document.currentScript;
  if (scriptTag) {
    const configSrc = scriptTag.getAttribute('data-config');
    if (configSrc) { const s = document.createElement('script'); s.src = configSrc; document.head.appendChild(s); }
  }
})();
