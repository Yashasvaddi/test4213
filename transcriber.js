
(function () {
  const API_BASE = 'https://api.doctorsapp.in/ai';

  let user_id=parseInt(prompt("Enter your user_id"))
  let session_id=parseInt(prompt("Enter your session_id"))

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
    summaryText: document.getElementById('summaryText'),
    medicalSummary: document.getElementById('medicalSummary')
  };

  const chatBtn = document.querySelector('.chatbot-btn');
  const chatWindow = document.querySelector('.chatbot-window');
  const chatBody = document.getElementById('chatBody');
  const userInput = document.getElementById('userInput');
  const imgUpload = document.getElementById('imgUpload');
  const micBtn = document.getElementById('micBtn');
  const chatbot_send_button=document.getElementById('chatbot_send_button');

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {  // Check if Enter was pressed
      e.preventDefault();      // Prevent form submission/reload
      const message = userInput.value.trim();
      if (message !== "") {
        sendMessage(message);  // Your function to handle the message
        userInput.value = "";  // Clear input
      }
    }
  });

  
  chatbot_send_button.addEventListener("click",()=>sendMessage(document.getElementById('userInput').value));

  chatBtn.addEventListener('click', () => {
    chatWindow.style.display =
      chatWindow.style.display === 'flex' ? 'none' : 'flex';
  });

  function appendMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('msg', type === 'user' ? 'user-msg' : 'bot-msg');
    msgDiv.innerText = text;
    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function sendMessage(msgText) {
    const msg = msgText || userInput.value.trim();
    if (!msg) return;
  
    appendMessage(msg, 'user');
    userInput.value = "";
  
    try {
      const res = await fetch(API_BASE+"/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: msg, user_id: user_id, session_id: session_id }),
      });
  
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
  
      const data = await res.json();
  
      // If backend returns plain text instead of JSON
      const reply = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  
      appendMessage(reply, "bot");
    } catch (error) {
      console.error("Error fetching API:", error);
      appendMessage("Error: " + error.message, "bot");
    }
  }
  

  imgUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
      const img = document.createElement('img');
      img.src = event.target.result;
      img.classList.add('user-img', 'msg', 'user-msg');
      chatBody.appendChild(img);

      appendMessage("Nice picture!", "bot");
    }
    reader.readAsDataURL(file);
  });

  async function requestMicPermission() {
    try {
      // Ask for microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // If successful
      console.log("Microphone access granted!");
      
      // You can now use the audio stream
      // Example: attach it to an <audio> element
      const audioElement = document.createElement('audio');
      audioElement.srcObject = stream;
      audioElement.autoplay = true;
      document.body.appendChild(audioElement);
      
    } catch (err) {
      // If user denies or error occurs
      console.error("Microphone access denied or error:", err);
    }
  }

  requestMicPermission();

  // 🎤 Speech Recognition
  let recognition;
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function(event) {
      const transcript = event.results[0][0].transcript;
      sendMessage(transcript);
    };

    recognition.onerror = function(event) {
      appendMessage("Speech error: " + event.error, "bot");
    };

  } else {
    micBtn.disabled = true;
    micBtn.innerText = "🚫";
    appendMessage("Speech recognition not supported in this browser.", "bot");
  }

  micBtn.addEventListener("click", () => {
    if (recognition) {
      recognition.start();
      appendMessage("🎤 Listening...", "bot");
    }
  });


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
      if (els.start.getAttribute('aria-pressed') === 'true') {
          try {
            recog.start();
            listening = true;
            updateStatus('Listening', 'live');
          } catch (e) {
            console.error('Auto-restart error:', e);
          }
        }
    };

    try { recog.start(); } catch {}
  }

  function updateSummary(summary) {
    currentSummary = summary;
  
    if (els.summaryText) {
      els.summaryText.textContent = summary;
    }
    if (els.medicalSummary) {
      els.medicalSummary.value = summary;
    }
    console.log('Summary updated in both locations');
  }
    

  let mediaRecorder;
  let audioChunks = [];

  document.getElementById('btnStart').addEventListener('click', async () => {
      audioChunks = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
  
      mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
              audioChunks.push(event.data);
          }
      };
  
      mediaRecorder.onstop = () => {
          document.getElementById('btnSave').disabled = false;
      };
  
      mediaRecorder.start();
  });
  
  document.getElementById('btnStop').addEventListener('click', () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
      }
  });
  
  document.getElementById('btnSave').addEventListener('click', () => {
      if (audioChunks.length) {
          const blob = new Blob(audioChunks, { type: 'audio/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'recording.webm'; // Change to .wav if you convert format
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      }
  });




  


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
      try {
        const res = await fetch(API_BASE + '/transcription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript }),
        });
      
        if (!res.ok) {
          throw new Error(`HTTP error! Status: ${res.status}`);
        }
      
        const data = await res.json();
        lastApiResponse=data;
      
        // Populate all sections with JSON
        populateFormFromJson(data["JSON"]);
        updateSummary(data["Summary"]);
      
      } catch (error) {
        console.error('Error fetching API:', error);
      }


      function saveAsNestedJSON() {
        if (!lastApiResponse) {
          saveAsNestedJSON()
          return;
        }
      
        const drilledData = unflattenObject(lastApiResponse);
      
        const blob = new Blob([JSON.stringify(drilledData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
      
        const a = document.createElement('a');
        a.href = url;
        a.download = 'entities.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      
        URL.revokeObjectURL(url);
      }
      
      document.getElementById("saveJsonBtn").addEventListener("click", saveAsNestedJSON);
      


      function unflattenObject(data) {
        if (typeof data !== "object" || data === null) return data;
      
        const result = {};
      
        for (let key in data) {
          const keys = key
            .replace(/\[(\w+)\]/g, '.$1') // change [0] to .0
            .split('.');
      
          keys.reduce((acc, k, i) => {
            if (i === keys.length - 1) {
              acc[k] = data[key];
            } else {
              if (!acc[k]) {
                acc[k] = isNaN(keys[i + 1]) ? {} : [];
              }
              return acc[k];
            }
            return acc;
          }, result);
        }
      
        return result;
      }
      



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


  function insertBeforeButton(listId, items, field) {
    const section = document.getElementById(listId).parentElement;
    const button = section.querySelector('.add-btn');
    const listContainer = document.getElementById(listId);
    listContainer.innerHTML = '';
  
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'list-item';
      div.textContent = item[field];
      section.insertBefore(div, button);
    });
  }
  
  function populatePrescriptionForm(data) {
    // Complaints
    insertBeforeButton('complaintsList', data.to_COMPLAINT, 'ComplaintNameCase');
  
    // Symptoms
    insertBeforeButton('symptomsList', data.to_SYMPTOMS, 'SymptomsNameCase');
  
    // Examinations
    insertBeforeButton('examinationsList', data.to_EXAMINATION, 'ExaminationNameCase');
  
    // Allergies
    insertBeforeButton('allergiesList', data.to_ALLERGY, 'AllergyNameCase');
  
    // Medicines
    const section = document.getElementById('medicinesList').parentElement;
    const button = section.querySelector('.add-btn');
    document.getElementById('medicinesList').innerHTML = '';
    data.to_MEDPRESCRIPTION.forEach(med => {
      const medDiv = document.createElement('div');
      medDiv.className = 'medicine-item';
      medDiv.innerHTML = `
        <strong>${med.MedicineNameCase}</strong> - ${med.Dose}${med.DoseUnit} for ${med.Period} ${med.PeriodUnit}<br>
        <em>${med.Remarks}</em>
      `;
      section.insertBefore(medDiv, button);
    });
  }
  
  function populateFormFromJson(data) {
    // Symptoms
    const symptomsContainer = document.querySelector('#symptomsSection .section-content');
    symptomsContainer.innerHTML = ''; // Clear old
    data.to_SYMPTOMS.forEach(symptom => {
      symptomsContainer.innerHTML += `
        <div class="input-row">
          <label>Symptom:</label>
          <input type="text" value="${symptom.SymptomsNameCase}">
        </div>
      `;
    });
  
    // Complaints
    const complaintsContainer = document.querySelector('#complaintsSection .section-content');
    complaintsContainer.innerHTML = '';
    data.to_COMPLAINT.forEach(c => {
      complaintsContainer.innerHTML += `
        <div class="input-row">
          <label>Complaint:</label>
          <input type="text" value="${c.ComplaintNameCase}">
        </div>
      `;
    });
  
    // Prescriptions
    const prescriptionsContainer = document.querySelector('#prescriptionsSection .section-content');
    prescriptionsContainer.innerHTML = '';
    data.to_MEDPRESCRIPTION.forEach(med => {
      prescriptionsContainer.innerHTML += `
        <div class="prescription-item">
          <div class="input-row">
            <label>Medicine:</label>
            <input type="text" value="${med.MedicineNameCase}">
          </div>
          <div class="input-row">
            <label>Dose:</label>
            <input type="text" value="${med.Dose}">
          </div>
          <div class="input-row">
            <label>Period:</label>
            <input type="text" value="${med.Period} ${med.PeriodUnit}">
          </div>
          <div class="input-row">
            <label>Remarks:</label>
            <input type="text" value="${med.Remarks}">
          </div>
        </div>
      `;
    });
  
    // Examinations
    const examsContainer = document.querySelector('#examinationsSection .section-content');
    if (examsContainer && Array.isArray(data.to_EXAMINATION)) {
      examsContainer.innerHTML = '';
      data.to_EXAMINATION.forEach(exam => {
        examsContainer.innerHTML += `
          <div class="input-row">
            <label>Examination:</label>
            <input type="text" value="${exam.ExaminationNameCase}">
          </div>
        `;
      });
    } else {
      console.warn('No examination data found:', data.to_EXAMINATION);
    }
  
    // Allergies
    const allergiesContainer = document.querySelector('#allergiesSection .section-content');
    allergiesContainer.innerHTML = '';
    data.to_ALLERGY.forEach(allergy => {
      allergiesContainer.innerHTML += `
        <div class="input-row">
          <label>Allergy:</label>
          <input type="text" value="${allergy.AllergyNameCase}">
        </div>
      `;
    });
  }
  
  // Make sure this runs after DOM loads
document.addEventListener("DOMContentLoaded", function() {
  // Select the button
  const generateBtn = document.querySelector(".generate-btn");

  // Attach click handler
  generateBtn.onclick = function() {
      savePrescription();
  };
});

// Your function
async function savePrescription() {
  const { jsPDF } = window.jspdf;

  // ✅ use class selector now
  const element = document.querySelector(".prescription-form");  
  if (!element) {
      alert("Prescription form not found!");
      return;
  }

  // capture screenshot of the element
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("p", "mm", "a4");
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save("prescription.pdf");
}

function setTodayDate() {
  const today = new Date();

  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();

  const formattedDate = `${day}-${month}-${year}`;

  document.getElementById("dateField").value = formattedDate;
}

document.addEventListener("DOMContentLoaded", () => {
  // ✅ Attach event to the button
  document.querySelector(".btn-clear").addEventListener("click", () => {
      const elements = document.querySelectorAll(".prescription-form input, .prescription-form textarea, .prescription-form select");
      elements.forEach(el => el.value = ""); // clear values
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('medicalSummary');
  if (!el) return;

  const autoResize = () => {
    el.style.height = 'auto';                 // reset
    el.style.height = el.scrollHeight + 'px'; // fit content
  };

  // Expand as the user types
  el.addEventListener('input', autoResize);

  // Expose method to set content from JS
  window.setMedicalSummary = (text) => {
    el.value = text;   
    autoResize();       // expand after setting text
  };

  // ✅ expand if it already has content (e.g., from server)
  autoResize();
});


window.onload = setTodayDate;

  // Wire events
  els.start.addEventListener('click', startListening);
  els.stop.addEventListener('click', stopListening);
  els.clear.addEventListener('click', clearAll);
  els.process.addEventListener('click', processTranscript);
})();

