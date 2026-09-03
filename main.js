// State
let currentDate = new Date();
let meetings = [];
const API_URL = 'http://localhost:3000/api/meetings';
const STORAGE_KEY = 'agenda_pro_meetings';
let selectedMeetingId = null;

// DOM Elements
const calendarGrid = document.getElementById('calendar-grid');
const currentMonthDisplay = document.getElementById('current-month-display');
const btnPrevMonth = document.getElementById('btn-prev-month');
const btnNextMonth = document.getElementById('btn-next-month');
const btnToday = document.getElementById('btn-today');
const meetingsList = document.getElementById('meetings-list');

// Modals
const modalNewMeeting = document.getElementById('modal-overlay');
const modalDetails = document.getElementById('modal-details');
const btnNewMeeting = document.getElementById('btn-new-meeting');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCloseDetails = document.getElementById('btn-close-details');
const btnCancelMeeting = document.getElementById('btn-cancel-meeting');
const formNewMeeting = document.getElementById('form-new-meeting');
const btnDeleteMeeting = document.getElementById('btn-delete-meeting');

// Formatters
const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function formatDateBR(dateString) {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length < 3) return dateString;
  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}

function getLocalMeetings() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Erro ao ler localStorage:', e);
    return [];
  }
}

function saveLocalMeetings(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar no localStorage:', e);
  }
}

// Initialization
async function init() {
  await fetchMeetings();
  renderCalendar();
  renderUpcomingMeetings();
  setupEventListeners();
}

async function fetchMeetings() {
  // Carrega inicialmente do LocalStorage para resposta instantânea
  meetings = getLocalMeetings();

  try {
    const response = await fetch(API_URL, { signal: credentialsSignalTimeout(3000) });
    if (response.ok) {
      const serverMeetings = await response.json();
      if (Array.isArray(serverMeetings)) {
        meetings = serverMeetings;
        saveLocalMeetings(meetings);
      }
    }
  } catch (error) {
    console.log('Backend offline ou inacessível. Usando armazenamento local:', error.message);
  }
}

function credentialsSignalTimeout(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

// Calendar Logic
function renderCalendar() {
  calendarGrid.innerHTML = '';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  currentMonthDisplay.textContent = `${monthNames[month]} ${year}`;

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const dayDiv = createDayElement(daysInPrevMonth - i, true);
    calendarGrid.appendChild(dayDiv);
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = isCurrentMonth && i === today.getDate();
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

    const dayDiv = createDayElement(i, false, isToday);

    // Check for meetings on this day
    const dayMeetings = meetings.filter(m => m.date === dateString)
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    dayMeetings.forEach(meeting => {
      const eventDiv = document.createElement('div');
      eventDiv.className = 'day-event';
      eventDiv.textContent = `${meeting.time || ''} - ${meeting.client}`;
      eventDiv.onclick = (e) => {
        e.stopPropagation();
        openDetailsModal(meeting);
      };
      dayDiv.appendChild(eventDiv);
    });

    // Allow clicking on day to add meeting quickly
    dayDiv.onclick = () => {
      document.getElementById('meeting-date').value = dateString;
      openModal();
    };

    calendarGrid.appendChild(dayDiv);
  }

  // Next month days to fill grid (35 or 42 cells total)
  const totalCells = firstDayOfMonth + daysInMonth;
  const rowsNeeded = Math.ceil(totalCells / 7);
  const nextMonthDays = (rowsNeeded * 7) - totalCells;

  for (let i = 1; i <= nextMonthDays; i++) {
    const dayDiv = createDayElement(i, true);
    calendarGrid.appendChild(dayDiv);
  }
}

function createDayElement(dayNumber, isOtherMonth, isToday = false) {
  const div = document.createElement('div');
  div.className = `calendar-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;

  const numberDiv = document.createElement('div');
  numberDiv.className = 'day-number';
  numberDiv.textContent = dayNumber;

  div.appendChild(numberDiv);
  return div;
}

// Sidebar logic
function renderUpcomingMeetings() {
  meetingsList.innerHTML = '';

  // Sort by date and time
  const sorted = [...meetings].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.time || '00:00'}`);
    return dateA - dateB;
  });

  // Filter only future or today meetings
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = sorted.filter(m => new Date(`${m.date}T00:00:00`) >= now).slice(0, 5);

  if (upcoming.length === 0) {
    meetingsList.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem;">Nenhuma apresentação futura.</p>';
    return;
  }

  upcoming.forEach(meeting => {
    const card = document.createElement('div');
    card.className = 'meeting-card';
    card.onclick = () => openDetailsModal(meeting);

    const companyPart = meeting.companyInfo ? ` - ${meeting.companyInfo}` : '';

    card.innerHTML = `
      <h4>${meeting.client}${companyPart}</h4>
      <p>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
        ${formatDateBR(meeting.date)}${meeting.time ? ' às ' + meeting.time : ''}
      </p>
    `;
    meetingsList.appendChild(card);
  });
}

// Event Listeners
function setupEventListeners() {
  // Calendar Nav
  btnPrevMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });

  btnNextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });

  btnToday.addEventListener('click', () => {
    currentDate = new Date();
    renderCalendar();
  });

  // Modals
  btnNewMeeting.addEventListener('click', openModal);
  btnCloseModal.addEventListener('click', closeModal);
  btnCancelMeeting.addEventListener('click', closeModal);
  btnCloseDetails.addEventListener('click', closeDetailsModal);

  // Form Submit
  formNewMeeting.addEventListener('submit', handleAddMeeting);

  // Delete Meeting
  btnDeleteMeeting.addEventListener('click', handleDeleteMeeting);
}

// Actions
async function handleAddMeeting(e) {
  e.preventDefault();

  const getCleanVal = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const val = el.value.trim();
    return val.length > 0 ? val : null;
  };

  const clientName = getCleanVal('client-name');
  const clientEmail = getCleanVal('client-email');
  const companyInfo = getCleanVal('company-info');
  const marketOperation = getCleanVal('market-operation');
  const biggestDifficulty = getCleanVal('biggest-difficulty');
  const problemToSolve = getCleanVal('problem-to-solve');
  const howCanWeHelp = getCleanVal('how-can-we-help');
  const date = getCleanVal('meeting-date');
  const time = getCleanVal('meeting-time');

  if (!clientName || !date || !time) {
    alert('Por favor, preencha pelo menos Nome, Data e Horário.');
    return;
  }

  // Objeto apenas com campos preenchidos salvos (campos vazios ficam como null)
  const newMeeting = {
    id: Date.now().toString(),
    client: clientName,
    email: clientEmail,
    companyInfo: companyInfo,
    marketOperation: marketOperation,
    biggestDifficulty: biggestDifficulty,
    problemToSolve: problemToSolve,
    howCanWeHelp: howCanWeHelp,
    date: date,
    time: time,
    createdAt: new Date().toISOString()
  };

  let savedMeeting = newMeeting;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMeeting),
      signal: credentialsSignalTimeout(3000)
    });
    
    if (response.ok) {
      const serverData = await response.json();
      if (serverData && serverData.id) {
        savedMeeting = {
          id: serverData.id,
          client: serverData.client,
          email: serverData.email || clientEmail,
          companyInfo: serverData.company_info || clientEmail ? (serverData.company_info || companyInfo) : companyInfo,
          marketOperation: serverData.market_operation || marketOperation,
          biggestDifficulty: serverData.biggest_difficulty || biggestDifficulty,
          problemToSolve: serverData.problem_to_solve || problemToSolve,
          howCanWeHelp: serverData.how_can_we_help || howCanWeHelp,
          date: serverData.date ? new Date(serverData.date).toISOString().split('T')[0] : date,
          time: serverData.time ? serverData.time.substring(0, 5) : time,
          createdAt: serverData.created_at || newMeeting.createdAt
        };
      }
    }
  } catch (error) {
    console.warn('Backend indisponível no momento. Salvando localmente:', error.message);
  }

  // Sempre adiciona à lista local e persiste no LocalStorage
  meetings.push(savedMeeting);
  saveLocalMeetings(meetings);

  closeModal();
  renderCalendar();
  renderUpcomingMeetings();

  // Abre os detalhes com opções de notificação
  openDetailsModal(savedMeeting);
}

async function handleDeleteMeeting() {
  if (!selectedMeetingId) return;

  if (confirm('Tem certeza que deseja excluir este agendamento?')) {
    try {
      await fetch(`${API_URL}/${selectedMeetingId}`, {
        method: 'DELETE',
        signal: credentialsSignalTimeout(3000)
      });
    } catch (error) {
      console.warn('Erro ou backend offline ao deletar no servidor:', error.message);
    }

    // Remove localmente
    meetings = meetings.filter(m => m.id !== selectedMeetingId);
    saveLocalMeetings(meetings);

    closeDetailsModal();
    renderCalendar();
    renderUpcomingMeetings();
  }
}

// Modal Helpers
function openModal() {
  formNewMeeting.reset();
  if (!document.getElementById('meeting-date').value) {
    document.getElementById('meeting-date').value = new Date().toISOString().split('T')[0];
  }
  modalNewMeeting.classList.remove('hidden');
}

function closeModal() {
  modalNewMeeting.classList.add('hidden');
}

function openDetailsModal(meeting) {
  selectedMeetingId = meeting.id;

  const content = document.getElementById('details-content');
  
  // Exibir SOMENTE as informações que foram preenchidas
  let detailsHTML = `
    <p><strong>Nome:</strong> ${meeting.client}</p>
  `;

  if (meeting.email) {
    detailsHTML += `<p><strong>E-mail:</strong> ${meeting.email}</p>`;
  }

  if (meeting.companyInfo) {
    detailsHTML += `<p><strong>Empresa / Ramo:</strong> ${meeting.companyInfo}</p>`;
  }

  detailsHTML += `
    <p><strong>Data:</strong> ${formatDateBR(meeting.date)}</p>
    <p><strong>Horário:</strong> ${meeting.time || 'A definir'}</p>
  `;

  if (meeting.marketOperation) {
    detailsHTML += `<p><strong>Atuação no mercado:</strong> ${meeting.marketOperation}</p>`;
  }

  if (meeting.biggestDifficulty) {
    detailsHTML += `<p><strong>Maior dificuldade:</strong> ${meeting.biggestDifficulty}</p>`;
  }

  if (meeting.problemToSolve) {
    detailsHTML += `<p><strong>Problema a resolver:</strong> ${meeting.problemToSolve}</p>`;
  }

  if (meeting.howCanWeHelp) {
    detailsHTML += `<p><strong>Como podemos ajudar:</strong> ${meeting.howCanWeHelp}</p>`;
  }

  content.innerHTML = detailsHTML;

  // Montar mensagem para WhatsApp e Email contendo apenas os campos preenchidos
  const btnWhatsapp = document.getElementById('btn-notify-whatsapp');
  const btnEmail = document.getElementById('btn-notify-email');

  let detailsTextList = [];
  if (meeting.email) detailsTextList.push(`- *E-mail:* ${meeting.email}`);
  if (meeting.marketOperation) detailsTextList.push(`- *Como atua:* ${meeting.marketOperation}`);
  if (meeting.biggestDifficulty) detailsTextList.push(`- *Maior dificuldade:* ${meeting.biggestDifficulty}`);
  if (meeting.problemToSolve) detailsTextList.push(`- *Problema a resolver:* ${meeting.problemToSolve}`);
  if (meeting.howCanWeHelp) detailsTextList.push(`- *Como podemos ajudar:* ${meeting.howCanWeHelp}`);

  const detailsSection = detailsTextList.length > 0 
    ? `\n\n*Detalhes do Cliente:*\n${detailsTextList.join('\n')}` 
    : '';

  const companyText = meeting.companyInfo ? ` (${meeting.companyInfo})` : '';
  const messageText = `Boas Notícias! Nova apresentação da empresa agendada com o cliente *${meeting.client}*${companyText} para o dia *${formatDateBR(meeting.date)}* às *${meeting.time || ''}*.${detailsSection}`;

  let emailBodyLines = [
    `Olá Chefe,\n`,
    `Uma nova apresentação da empresa foi agendada:\n`,
    `Nome: ${meeting.client}`
  ];
  if (meeting.email) emailBodyLines.push(`E-mail: ${meeting.email}`);
  if (meeting.companyInfo) emailBodyLines.push(`Empresa: ${meeting.companyInfo}`);
  emailBodyLines.push(`Data: ${formatDateBR(meeting.date)}`);
  emailBodyLines.push(`Horário: ${meeting.time || 'A definir'}`);

  if (detailsTextList.length > 0) {
    emailBodyLines.push(`\nDetalhes do Cliente:`);
    if (meeting.marketOperation) emailBodyLines.push(`- Como atua no mercado: ${meeting.marketOperation}`);
    if (meeting.biggestDifficulty) emailBodyLines.push(`- Maior dificuldade hoje: ${meeting.biggestDifficulty}`);
    if (meeting.problemToSolve) emailBodyLines.push(`- Problema que deseja resolver: ${meeting.problemToSolve}`);
    if (meeting.howCanWeHelp) emailBodyLines.push(`- Como podemos ajudar: ${meeting.howCanWeHelp}`);
  }
  emailBodyLines.push(`\nAtenciosamente.`);

  const emailSubject = `Nova Apresentação Agendada: ${meeting.client}${companyText}`;
  const emailBody = emailBodyLines.join('\n');

  btnWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(messageText)}`;
  btnEmail.href = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;

  modalDetails.classList.remove('hidden');
}

function closeDetailsModal() {
  modalDetails.classList.add('hidden');
  selectedMeetingId = null;
}

// Start
init();

