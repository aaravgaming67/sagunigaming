const form = document.querySelector("#bookingForm");
const setup = document.querySelector("#setup");
const hours = document.querySelector("#hours");
const players = document.querySelector("#players");
const total = document.querySelector("#total");
const dateInput = document.querySelector("#date");
const timeInput = document.querySelector("#time");
const bookingList = document.querySelector("#bookingList");
const toast = document.querySelector("#toast");

const storageKey = "saguni-bookings";
let firestore = null;
let firebaseReady = false;
let firebaseCollectionName = "saguniBookings";

async function setupFirebase() {
  try {
    const { firebaseConfig, firebaseCollection } = await import("./firebase-config.js");
    const hasConfig = Object.values(firebaseConfig).every(Boolean);

    if (!hasConfig) {
      return;
    }

    const [firebaseApp, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js")
    ]);

    const app = firebaseApp.initializeApp(firebaseConfig);
    firestore = {
      db: firestoreModule.getFirestore(app),
      addDoc: firestoreModule.addDoc,
      collection: firestoreModule.collection,
      serverTimestamp: firestoreModule.serverTimestamp
    };
    firebaseCollectionName = firebaseCollection || firebaseCollectionName;
    firebaseReady = true;
  } catch (error) {
    console.warn("Firebase is not connected yet.", error);
  }
}

function todayValue() {
  const today = new Date();
  return today.toISOString().slice(0, 10);
}

function setDefaultSlot() {
  const slot = new Date();
  slot.setMinutes(slot.getMinutes() < 30 ? 30 : 60, 0, 0);

  if (slot.getHours() < 10) {
    slot.setHours(10, 0, 0, 0);
  }

  if (slot.getHours() > 23 || (slot.getHours() === 23 && slot.getMinutes() > 30)) {
    slot.setDate(slot.getDate() + 1);
    slot.setHours(10, 0, 0, 0);
  }

  dateInput.value = slot.toISOString().slice(0, 10);
  timeInput.value = `${String(slot.getHours()).padStart(2, "0")}:${String(slot.getMinutes()).padStart(2, "0")}`;
}

function getSelectedPricing() {
  return setup.selectedOptions[0].dataset;
}

function formatCurrency(value) {
  return `Rs ${value.toLocaleString("en-IN")}`;
}

function getEstimate() {
  const pricing = getSelectedPricing();
  const hourCount = Math.max(1, Number(hours.value || 1));
  const playerCount = Math.max(1, Number(players.value || 1));

  if (pricing.pricing === "ps5") {
    const hourlyRate = playerCount === 1 ? Number(pricing.soloRate) : Number(pricing.duoRate);
    return hourlyRate * hourCount;
  }

  if (pricing.pricing === "flat") {
    return Number(pricing.rate) * hourCount;
  }

  return Number(pricing.rate) * hourCount * playerCount;
}

function updateTotal() {
  total.textContent = formatCurrency(getEstimate());
}

function updatePlayerLimit() {
  if (getSelectedPricing().pricing === "ps5") {
    players.max = "2";

    if (Number(players.value) > 2) {
      players.value = "2";
    }
  } else {
    players.max = "8";
  }

  updateTotal();
}

function readBookings() {
  return JSON.parse(localStorage.getItem(storageKey) || "[]");
}

function writeBookings(bookings) {
  localStorage.setItem(storageKey, JSON.stringify(bookings));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 3200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bookingCode() {
  return `SG-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

function renderBookings() {
  const bookings = readBookings();

  if (!bookings.length) {
    bookingList.innerHTML = '<div class="empty-state">No saved bookings yet. Confirm a slot above and it will appear here.</div>';
    return;
  }

  bookingList.innerHTML = bookings
    .map((booking) => `
      <article class="saved-booking">
        <div>
          <strong>${escapeHtml(booking.code)} - ${escapeHtml(booking.setup)}</strong>
          <small>${escapeHtml(booking.date)} at ${escapeHtml(booking.time)} for ${escapeHtml(booking.hours)} hour(s) - ${escapeHtml(booking.players)} player(s) - ${escapeHtml(booking.game)}</small>
          <small>${escapeHtml(booking.name)} - ${escapeHtml(booking.phone)} - ${escapeHtml(formatCurrency(booking.estimate))}${booking.synced ? " - Firebase synced" : ""}</small>
        </div>
        <div class="booking-actions">
          <button type="button" data-copy="${escapeHtml(booking.code)}">Copy ID</button>
          <button type="button" data-delete="${escapeHtml(booking.code)}">Cancel</button>
        </div>
      </article>
    `)
    .join("");
}

function collectBooking() {
  const data = new FormData(form);
  return {
    code: bookingCode(),
    name: data.get("name").trim(),
    phone: data.get("phone").trim(),
    setup: data.get("setup"),
    game: data.get("game"),
    date: data.get("date"),
    time: data.get("time"),
    hours: Number(data.get("hours")),
    players: Number(data.get("players")),
    notes: data.get("notes").trim(),
    estimate: getEstimate(),
    synced: false,
    createdAt: new Date().toISOString()
  };
}

async function saveBookingOnline(booking) {
  if (!firebaseReady || !firestore) {
    return false;
  }

  await firestore.addDoc(
    firestore.collection(firestore.db, firebaseCollectionName),
    {
      ...booking,
      firebaseCreatedAt: firestore.serverTimestamp()
    }
  );

  return true;
}

function isPastSlot(dateValue, timeValue) {
  const now = new Date();
  const selected = new Date(`${dateValue}T${timeValue}`);
  return selected < now;
}

dateInput.min = todayValue();
setDefaultSlot();

["change", "input"].forEach((eventName) => {
  setup.addEventListener(eventName, updatePlayerLimit);
  hours.addEventListener(eventName, updateTotal);
  players.addEventListener(eventName, updateTotal);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isPastSlot(dateInput.value, timeInput.value)) {
    showToast("Pick a future date and time for your Saguni booking.");
    return;
  }

  const booking = collectBooking();
  const submitButton = form.querySelector(".submit-button");
  submitButton.disabled = true;
  submitButton.textContent = "Saving booking...";

  try {
    booking.synced = await saveBookingOnline(booking);
  } catch (error) {
    console.warn("Firebase booking save failed.", error);
  }

  const bookings = [booking, ...readBookings()].slice(0, 8);
  writeBookings(bookings);
  renderBookings();
  showToast(booking.synced ? `Booked ${booking.setup} online. Your ID is ${booking.code}.` : `Booked ${booking.setup} locally. Add Firebase config for online sync.`);
  form.reset();
  setDefaultSlot();
  updatePlayerLimit();

  submitButton.disabled = false;
  submitButton.innerHTML = '<i data-lucide="calendar-plus"></i>Confirm Booking';

  if (window.lucide) {
    window.lucide.createIcons();
  }
});

bookingList.addEventListener("click", async (event) => {
  const copyCode = event.target.dataset.copy;
  const deleteCode = event.target.dataset.delete;

  if (copyCode) {
    await navigator.clipboard.writeText(copyCode);
    showToast(`Copied booking ID ${copyCode}.`);
  }

  if (deleteCode) {
    writeBookings(readBookings().filter((booking) => booking.code !== deleteCode));
    renderBookings();
    showToast(`Cancelled booking ${deleteCode}.`);
  }
});

await setupFirebase();
updatePlayerLimit();
renderBookings();

if (window.lucide) {
  window.lucide.createIcons();
}
