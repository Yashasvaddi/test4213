
(function () {
    const API_BASE = 'https://keywordextractor-95fn.onrender.com';
  
    const els = {
      start: document.getElementById('btnStart'),
      stop: document.getElementById('btnStop'),
      clear: document.getElementById('btnClear'),
      process: document.getElementById('btnProcess'),
      copyAll: document.getElementById('btnCopyAll'),
      status: document.getElementById('statusBadge'),
      chat: document.getElementById('chatLog'),
      transcriptText: document.getElementById('transcriptText'),
      entitiesList: document.getElementById('entitiesList'),
      entitiesEmpty: document.getElementById('entitiesEmpty'),
      toast: document.getElementById('toast'),
    };
  
    // Magnetic hover effect for hero/primary buttons
    document.addEventListener('pointermove', (e) => {
      for (const btn of document.querySelectorAll('.btn-primary, .btn-hero')) {
        const r = btn.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * 100;
        const y = ((e.clientY - r.top) / r.height) * 100;
        btn.style.setProperty('--mx', x + '%');
        btn.style.setProperty('--my', y + '%');
      }
    });
  
    // Toast helper
    let toastTimer;
    function showToast(msg) {
      els.toast.textContent = msg;
      els.toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2200);
    }
  
    // Chat log state
    const chatLines = [];
    function addChatLine(text, final = true) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const item = document.createElement('div');
      item.className = 'chat-item';
      item.innerHTML = `
        <div class="chat-ava" aria-hidden="true"></div>
        <div class="chat-body">
          <div class="chat-text"></div>
          <div class="chat-meta">${final ? 'Final' : 'Listening…'} • ${time}</div>
        </div>
      `;
      item.querySelector('.chat-text').textContent = text;
      els.chat.appendChild(item);
      els.chat.scrollTop = els.chat.scrollHeight;
      chatLines.push({ text, time, final });
      updateTranscriptText();
      return item;
    }
    function updateTranscriptText() {
      const full = chatLines.filter(l => l.final).map(l => l.text).join(' ').trim();
      els.transcriptText.value = full;
    }
  
    // Web Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recog = null;
    let listening = false;
    let interimEl = null;
  
    function updateStatus(label, tone = 'idle') {
      els.status.textContent = label;
      const map = {
        idle: 'hsl(var(--accent)/0.15)',
        live: 'hsl(var(--success)/0.18)',
        sending: 'hsl(var(--warning)/0.2)',
        error: 'hsl(var(--danger)/0.15)',
      };
      els.status.style.background = map[tone] || map.idle;
    }
  
    function startListening() {
      if (!SpeechRecognition) {
        showToast('Speech recognition not supported in this browser.');
        return;
      }
      if (listening) return;
      recog = new SpeechRecognition();
      recog.lang = 'en-US';
      recog.interimResults = true;
      recog.continuous = true;
  
      recog.onstart = () => {
        listening = true;
        els.start.setAttribute('aria-pressed', 'true');
        els.start.disabled = true;
        els.stop.disabled = false;
        updateStatus('Listening', 'live');
        interimEl = addChatLine('', false);
      };
  
      recog.onresult = (event) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            const finalText = res[0].transcript.trim();
            if (interimEl) {
              interimEl.remove();
              interimEl = null;
            }
            addChatLine(finalText, true);
            interimEl = addChatLine('', false);
          } else {
            interim += res[0].transcript;
          }
        }
        if (interimEl) {
          interimEl.querySelector('.chat-text').textContent = interim;
        }
      };
  
      recog.onerror = (e) => {
        updateStatus('Error', 'error');
        showToast('Mic error: ' + (e.error || 'unknown'));
      };
  
      recog.onend = () => {
        listening = false;
        els.start.setAttribute('aria-pressed', 'false');
        els.start.disabled = false;
        els.stop.disabled = true;
        updateStatus('Idle');
        if (interimEl) {
          // Remove empty interim line on end
          const text = interimEl.querySelector('.chat-text').textContent.trim();
          if (!text) interimEl.remove();
          interimEl = null;
        }
      };
  
      try { recog.start(); } catch {}
    }
  
    function updateSummary(text) {
        const summaryEl = document.getElementById('summaryText');
        summaryEl.textContent = text || 'No summary available.';
      }
      
      // Example usage after you fetch/process data:
    
    


    function stopListening() {
      if (recog && listening) {
        try { recog.stop(); } catch {}
      }
    }
  
    function clearAll() {
      els.chat.innerHTML = '';
      chatLines.length = 0;
      updateTranscriptText();
    }
  
    // API helpers
    function toAbsoluteUrl(p) {
      try { return new URL(p).href; } catch { return API_BASE + (p.startsWith('/') ? '' : '/') + p; }
    }
  
    async function processTranscript() {
    const transcript = els.transcriptText.value.trim();
    if (!transcript) {
        showToast('Transcript is empty.');
        return;
    }
    updateStatus('Sending…', 'sending');
    els.process.disabled = true;

    try {
        // 1️⃣ First API Call: Entity extraction
        const res = await fetch(API_BASE + '/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript }),
        });

        if (!res.ok) throw new Error('HTTP ' + res.status);

        const data = await res.json();
        let payload;

        const path = (data && (data.json_path || data.path || data.file)) || '';
        if (path) {
        const jsonUrl = toAbsoluteUrl(path);
        const jres = await fetch(jsonUrl, { cache: 'no-store' });
        if (!jres.ok) throw new Error('JSON fetch failed ' + jres.status);
        payload = await jres.json();
        } else if (data && (typeof data === 'object' || Array.isArray(data))) {
        payload = data;
        } else {
        throw new Error('Unexpected API response shape');
        }

        // Render extracted entities
        renderEntities(payload);

        // 2️⃣ Second API Call: Summary
        const summaryRes = await fetch(API_BASE + '/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript }), // you can also pass `payload` if needed
        });

        if (!summaryRes.ok) throw new Error('Summary API HTTP ' + summaryRes.status);

        const summaryData = await summaryRes.json();

        // Update summary panel
        if (summaryData && summaryData.summary) {
            updateSummary(summaryData.summary)
        }

        updateStatus('Done', 'done');

    } catch (err) {
        console.error('Error processing transcript:', err);
        showToast('Error: ' + err.message, 'error');
        updateStatus('Error', 'error');
    } finally {
        els.process.disabled = false;
    }
    }

    function normalizeEntities(data, parentKey = '') {
      const items = [];
    
      if (Array.isArray(data)) {
        data.forEach((item, index) => {
          if (item && typeof item === 'object') {
            // Recursively flatten objects inside arrays
            items.push(...normalizeEntities(item, `${parentKey}[${index}]`));
          } else {
            items.push({
              key: `${parentKey}[${index}]`,
              value: String(item ?? '')
            });
          }
        });
      } else if (data && typeof data === 'object') {
        Object.entries(data).forEach(([k, v]) => {
          const newKey = parentKey ? `${parentKey}.${k}` : k;
          if (v && typeof v === 'object') {
            // Go deeper if still object or array
            items.push(...normalizeEntities(v, newKey));
          } else {
            items.push({
              key: newKey,
              value: String(v ?? '')
            });
          }
        });
      } else {
        items.push({
          key: parentKey,
          value: String(data ?? '')
        });
      }
    
      return items;
    }

      
    function renderEntities(data) {
      const items = normalizeEntities(data);
      els.entitiesList.innerHTML = '';
      if (!items.length) {
        els.entitiesList.appendChild(Object.assign(document.createElement('div'), { className: 'empty', textContent: 'No entities found in JSON.' }));
        return;
      }
      for (const { key, value } of items) {
        const row = document.createElement('div');
        row.className = 'entity';
        row.innerHTML = `
          <div>
            <div class="entity-head">${escapeHtml(key)}</div>
            <input class="entity-input" value="${escapeAttr(value ?? '')}" aria-label="${escapeAttr(key)} value" />
          </div>
          <div class="entity-actions">
            <button class="icon-btn" title="Copy value" aria-label="Copy ${escapeAttr(key)} value">
              ${icons.copy}
            </button>
            <button class="icon-btn" title="Save value" aria-label="Save ${escapeAttr(key)} value">
              ${icons.save}
            </button>
          </div>
        `;
        const input = row.querySelector('.entity-input');
        const btnCopy = row.querySelectorAll('.icon-btn')[0];
        const btnSave = row.querySelectorAll('.icon-btn')[1];
  
        btnCopy.addEventListener('click', async () => {
          try { await navigator.clipboard.writeText(input.value); showToast('Copied'); } catch {}
        });
        btnSave.addEventListener('click', () => {
          // local-only save for now
          row.dataset.saved = 'true';
          showToast('Saved (local)');
        });
  
        els.entitiesList.appendChild(row);
      }
    }
  
    function copyAllEntities() {
      const rows = Array.from(els.entitiesList.querySelectorAll('.entity'));
      if (!rows.length) { showToast('Nothing to copy.'); return; }
      const out = {};
      for (const r of rows) {
        const key = r.querySelector('.entity-head').textContent.trim();
        const val = r.querySelector('.entity-input').value;
        out[key] = val;
      }
      const text = JSON.stringify(out, null, 2);
      navigator.clipboard.writeText(text).then(() => showToast('Copied all as JSON'));
    }
  
    // Small utils
    function escapeHtml(s) { return String(s).replace(/[&<>]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
    function escapeAttr(s) { return String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  
    const icons = {
      copy: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>',
      save: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h11l5 5v9a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>'
    };
  
    // Wire events
    els.start.addEventListener('click', startListening);
    els.stop.addEventListener('click', stopListening);
    els.clear.addEventListener('click', clearAll);
    els.process.addEventListener('click', processTranscript);
    els.copyAll.addEventListener('click', copyAllEntities);
  })();
  
