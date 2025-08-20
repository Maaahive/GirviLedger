// --- DOM Elements ---
const listSection = document.getElementById("list-section");
const addSection = document.getElementById("add-section");
const searchSection = document.getElementById("search-section");
const printSection = document.getElementById("print-section");

const entryCountSpan = document.getElementById("entry-count");
const listTotalFinishedAmountP = document.getElementById(
  "list-total-finished-amount"
);

const addEntryForm = document.getElementById("add-entry-form");
const addMessage = document.getElementById("add-message");
const addUpdateButton = document.getElementById("add-update-button");

const searchInput = document.getElementById("search-input");
const searchResultsTableBody = document.querySelector(
  "#search-results-table tbody"
);
const searchMessage = document.getElementById("search-message");

const entriesListTableBody = document.querySelector(
  "#entries-list-table tbody"
);
const printAllTableBody = document.querySelector("#print-all-table tbody");
const totalFinishedAmountP = document.getElementById("total-finished-amount");

// --- Global Variables ---
let entries = []; // Array to hold all entries
const TODAY = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format for today
let editingEntryId = null; // To track if we are editing an existing entry

// --- Initial Setup ---
document.addEventListener("DOMContentLoaded", () => {
  loadEntries();
  showSection("list"); // Show the list section by default
  setDatePickerMaxDates();
});

// --- Data Management (Local Storage) ---
function loadEntries() {
  const storedEntries = localStorage.getItem("interestCalculatorEntries");
  if (storedEntries) {
    entries = JSON.parse(storedEntries);
  }
  renderList(); // Render the initial list
}

function saveEntries() {
  localStorage.setItem("interestCalculatorEntries", JSON.stringify(entries));
  renderList(); // Re-render list after any change
  filterEntries(); // This will call renderSearchTable with filtered data
  renderPrintTable(); // Re-render print table
}

// --- Navigation ---
function showSection(sectionId) {
  // Hide all sections
  listSection.classList.remove("active");
  addSection.classList.remove("active");
  searchSection.classList.remove("active");
  printSection.classList.remove("active");

  // Show the requested section
  document.getElementById(`${sectionId}-section`).classList.add("active");

  // Perform specific actions when showing a section
  if (sectionId === "list") {
    renderList();
  } else if (sectionId === "add") {
    // When navigating to add section, reset form and button if not currently editing
    if (editingEntryId === null) {
      addEntryForm.reset();
      addUpdateButton.textContent = "Add Entry";
    }
    addMessage.textContent = "";
  } else if (sectionId === "search") {
    filterEntries();
    searchMessage.textContent = "";
  } else if (sectionId === "print") {
    renderPrintTable();
  }
}

// --- Date Picker Setup ---
function setDatePickerMaxDates() {
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    input.setAttribute("max", TODAY);
    input.addEventListener("click", () => {
      if (typeof input.showPicker === "function") {
        input.showPicker();
      }
    });
  });
}

// --- Core Calculation Logic ---
function calculateInterest(
  principal,
  byaajRatePerMonth,
  denDateStr,
  lenDateStr
) {
  const denDate = new Date(denDateStr);
  let lenDate = new Date(lenDateStr);

  if (!lenDateStr || isNaN(lenDate.getTime())) {
    lenDate = new Date(TODAY);
  }

  const diffTime = lenDate.getTime() - denDate.getTime();
  let totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (totalDays < 0) totalDays = 0;

  const byaajPerDay = (principal * byaajRatePerMonth) / (30 * 100);
  const finalByaaj = byaajPerDay * totalDays;

  return {
    totalDays: totalDays,
    finalByaaj: finalByaaj,
    calculatedLenDate: lenDate.toISOString().split("T")[0],
  };
}

// --- Add/Update Entry Functionality ---
addEntryForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("add-name").value.trim();
  const fatherName = document.getElementById("add-father-name").value.trim();
  const amount = parseFloat(document.getElementById("add-amount").value);
  const amountGiven =
    parseFloat(document.getElementById("add-amount-given").value) || 0;
  let byaaj = parseFloat(document.getElementById("add-byaaj").value);
  const denDate = document.getElementById("add-den-date").value;
  let lenDate = document.getElementById("add-len-date").value;
  const code = document.getElementById("add-code").value;

  if (!name || !fatherName || isNaN(amount) || !denDate) {
    addMessage.textContent =
      "Please fill in all required fields (Name, Father's Name, Principal Amount, Den Date).";
    addMessage.style.color = "red";
    return;
  }
  if (isNaN(byaaj)) byaaj = 2;

  const { finalByaaj, calculatedLenDate } = calculateInterest(
    amount,
    byaaj,
    denDate,
    lenDate
  );
  const finalAmount = amount + finalByaaj;
  let remainingAmount = finalAmount - amountGiven;

  // Determine 'finished' status based on amountGiven
  let finishedStatus = false;
  if (amountGiven === finalAmount) {
    finishedStatus = true;
  } else if (amountGiven > finalAmount) {
    addMessage.textContent =
      "Error: Amount Given cannot be greater than Final Amount.";
    addMessage.style.color = "red";
    return; // Stop submission
  }

  const newEntryData = {
    // Data for new or updated entry
    name,
    fatherName,
    amount,
    amountGiven,
    byaaj,
    denDate,
    lenDate: lenDate || "Pending",
    code,
    finalByaaj: finalByaaj,
    finalAmount: finalAmount,
    remainingAmount: remainingAmount,
    finished: finishedStatus, // Set finished status here
    calculatedLenDate: calculatedLenDate,
  };

  if (editingEntryId) {
    // Update existing entry
    const entryIndex = entries.findIndex(
      (entry) => entry.id === editingEntryId
    );
    if (entryIndex !== -1) {
      // Preserve 'id'
      entries[entryIndex] = { ...entries[entryIndex], ...newEntryData };
      addMessage.textContent = "Entry updated successfully!";
    } else {
      addMessage.textContent = "Error: Entry to update not found.";
      addMessage.style.color = "red";
      return;
    }
    editingEntryId = null; // Reset editing state
    addUpdateButton.textContent = "Add Entry"; // Reset button text
    saveEntries(); // Save changes
    addEntryForm.reset(); // Clear form
    addMessage.style.color = "green";
    setTimeout(() => {
      addMessage.textContent = "";
      showSection("search"); // Redirect to search page after successful update
    }, 1000); // Give a moment for message to be seen
  } else {
    // Add new entry
    newEntryData.id = Date.now(); // Assign new ID
    entries.push(newEntryData);
    saveEntries(); // Save changes
    addEntryForm.reset(); // Clear form
    addMessage.textContent = "Entry added successfully!";
    addMessage.style.color = "green";
    setTimeout(() => (addMessage.textContent = ""), 3000);
  }
});

// --- Render List Section ---
function renderList() {
  entriesListTableBody.innerHTML = "";
  entryCountSpan.textContent = entries.length;

  let totalFinishedAmount = 0;

  if (entries.length === 0) {
    entriesListTableBody.innerHTML =
      '<tr><td colspan="12">No entries yet. Add some!</td></tr>';
    listTotalFinishedAmountP.textContent = "";
    return;
  }

  entries.forEach((entry) => {
    const row = entriesListTableBody.insertRow();
    row.innerHTML = `
            <td>${entry.name}</td>
            <td>${entry.fatherName}</td>
            <td>₹${entry.amount.toFixed(2)}</td>
            <td>₹${entry.amountGiven.toFixed(2)}</td>
            <td>₹${entry.remainingAmount.toFixed(2)}</td>
            <td>${entry.byaaj}%</td>
            <td>₹${entry.finalByaaj.toFixed(2)}</td>
            <td>₹${entry.finalAmount.toFixed(2)}</td>
            <td>${entry.denDate}</td>
            <td>${entry.lenDate === "Pending" ? "Pending" : entry.lenDate}</td>
            <td>${entry.finished ? "Finished" : "Active"}</td>
            <td>${entry.code}</td>
        `;
    if (entry.finished) {
      totalFinishedAmount += entry.finalAmount;
    }
  });
  listTotalFinishedAmountP.textContent = `Total Final Amount from Finished Entries: ₹${totalFinishedAmount.toFixed(
    2
  )}`;
}

// --- Search & Modify Section ---
function filterEntries() {
  const searchTerm = searchInput.value.toLowerCase();
  const filtered = entries.filter(
    (entry) =>
      entry.name.toLowerCase().includes(searchTerm) ||
      entry.fatherName.toLowerCase().includes(searchTerm) ||
      entry.code.toLowerCase().includes(searchTerm)
  );
  renderSearchTable(filtered);
}

function renderSearchTable(data) {
  searchResultsTableBody.innerHTML = "";

  if (data.length === 0) {
    searchResultsTableBody.innerHTML =
      '<tr><td colspan="13">No matching entries found.</td></tr>';
    return;
  }

  data.forEach((entry) => {
    const row = searchResultsTableBody.insertRow();
    row.innerHTML = `
            <td>${entry.name}</td>
            <td>${entry.fatherName}</td>
            <td>₹${entry.amount.toFixed(2)}</td>
            <td>₹${entry.amountGiven.toFixed(2)}</td>
            <td>₹${entry.remainingAmount.toFixed(2)}</td>
            <td>${entry.byaaj}%</td>
            <td>₹${entry.finalByaaj.toFixed(2)}</td>
            <td>₹${entry.finalAmount.toFixed(2)}</td>
            <td>${entry.denDate}</td>
            <td>${entry.lenDate === "Pending" ? "Pending" : entry.lenDate}</td>
            <td>${entry.finished ? "Finished" : "Active"}</td>
            <td>${entry.code}</td>
            <td>
                <button onclick="modifyEntry(${entry.id})">Modify</button>
                <button onclick="markFinished(${
                  entry.id
                }, ${!entry.finished})">${
      entry.finished ? "Unfinish" : "Finish"
    }</button>
                <button onclick="deleteEntry(${entry.id})">Delete</button>
            </td>
        `;
  });
}

function modifyEntry(id) {
  const entryToModify = entries.find((entry) => entry.id === id);
  if (!entryToModify) return;

  // Set the editing state
  editingEntryId = id;
  addUpdateButton.textContent = "Update Entry"; // Change button text

  // Pre-fill the add form with existing data for modification
  document.getElementById("add-name").value = entryToModify.name;
  document.getElementById("add-father-name").value = entryToModify.fatherName;
  document.getElementById("add-amount").value = entryToModify.amount;
  document.getElementById("add-amount-given").value = entryToModify.amountGiven;
  document.getElementById("add-byaaj").value = entryToModify.byaaj;
  document.getElementById("add-den-date").value = entryToModify.denDate;
  document.getElementById("add-len-date").value =
    entryToModify.lenDate === "Pending" ? "" : entryToModify.lenDate;
  document.getElementById("add-code").value = entryToModify.code;

  addMessage.textContent =
    "Entry loaded for modification. Make changes and click 'Update Entry'.";
  addMessage.style.color = "blue";
  showSection("add"); // Switch to add section
}

function markFinished(id, isFinished) {
  const entryIndex = entries.findIndex((entry) => entry.id === id);
  if (entryIndex === -1) return;

  const entry = entries[entryIndex];

  // If marking as finished, set amountGiven to finalAmount and remaining to 0
  if (isFinished) {
    entry.amountGiven = entry.finalAmount;
    entry.remainingAmount = 0;
    // Also set lenDate to TODAY if it was pending
    if (entry.lenDate === "Pending") {
      entry.lenDate = TODAY;
    }
  } else {
    // If marking as unfinished, reset amountGiven to 0 (or its original value if you track it)
    // and recalculate remaining.
    // For simplicity, let's assume if you unfinish, the amount given is effectively 'undone'
    // and remaining is recalculated based on 0 given.
    entry.amountGiven = 0; // Reset amount given
    entry.remainingAmount = entry.finalAmount; // Remaining is full final amount
    // If lenDate was set to TODAY by finishing, revert it to "Pending"
    if (entry.lenDate === TODAY) {
      entry.lenDate = "Pending";
    }
  }

  entry.finished = isFinished; // Set the finished status

  // Recalculate interest and final amounts to ensure consistency after status change
  const { finalByaaj, calculatedLenDate } = calculateInterest(
    entry.amount,
    entry.byaaj,
    entry.denDate,
    entry.lenDate === "Pending" ? "" : entry.lenDate // Use empty string for pending to calculate up to TODAY
  );
  entry.finalByaaj = finalByaaj;
  entry.finalAmount = entry.amount + finalByaaj;
  // Re-calculate remaining based on the (potentially updated) amountGiven
  entry.remainingAmount = entry.finalAmount - entry.amountGiven;
  entry.calculatedLenDate = calculatedLenDate;

  saveEntries();
  searchMessage.textContent = `Entry ${
    isFinished ? "finished" : "unfinished"
  } successfully!`;
  searchMessage.style.color = "green";
  setTimeout(() => (searchMessage.textContent = ""), 3000);
}

function deleteEntry(id) {
  if (
    confirm(
      "Are you sure you want to delete this entry? This action cannot be undone."
    )
  ) {
    entries = entries.filter((entry) => entry.id !== id);
    saveEntries();
    searchMessage.textContent = "Entry deleted successfully!";
    searchMessage.style.color = "green";
    setTimeout(() => (searchMessage.textContent = ""), 3000);
  }
}

// --- Print / Export Section ---
function renderPrintTable() {
  printAllTableBody.innerHTML = "";
  let totalFinishedAmount = 0;

  if (entries.length === 0) {
    printAllTableBody.innerHTML =
      '<tr><td colspan="12">No entries to print.</td></tr>';
    totalFinishedAmountP.textContent = "";
    return;
  }

  entries.forEach((entry) => {
    const row = printAllTableBody.insertRow();
    row.innerHTML = `
            <td>${entry.name}</td>
            <td>${entry.fatherName}</td>
            <td>₹${entry.amount.toFixed(2)}</td>
            <td>₹${entry.amountGiven.toFixed(2)}</td>
            <td>₹${entry.remainingAmount.toFixed(2)}</td>
            <td>${entry.byaaj}%</td>
            <td>₹${entry.finalByaaj.toFixed(2)}</td>
            <td>₹${entry.finalAmount.toFixed(2)}</td>
            <td>${entry.denDate}</td>
            <td>${entry.lenDate === "Pending" ? "Pending" : entry.lenDate}</td>
            <td>${entry.finished ? "Finished" : "Active"}</td>
            <td>${entry.code}</td>
        `;
    if (entry.finished) {
      totalFinishedAmount += entry.finalAmount;
    }
  });
  totalFinishedAmountP.textContent = `Total Final Amount from Finished Entries: ₹${totalFinishedAmount.toFixed(
    2
  )}`;
}

function downloadExcel() {
  const wsData = [
    [
      "Name",
      "Father's Name",
      "Principal Amount",
      "Amount Given",
      "Remaining Amount",
      "Byaaj %",
      "Final Byaaj",
      "Final Amount",
      "Den Date",
      "Len Date (Stored)",
      "Code",
      "Status",
    ],
  ];
  let totalFinishedAmount = 0;

  entries.forEach((entry) => {
    wsData.push([
      entry.name,
      entry.fatherName,
      entry.amount.toFixed(2),
      entry.amountGiven.toFixed(2),
      entry.remainingAmount.toFixed(2),
      entry.byaaj,
      entry.finalByaaj.toFixed(2),
      entry.finalAmount.toFixed(2),
      entry.denDate,
      entry.lenDate === "Pending" ? "Pending" : entry.lenDate,
      entry.code,
      entry.finished ? "Finished" : "Active",
    ]);
    if (entry.finished) {
      totalFinishedAmount += entry.finalAmount;
    }
  });

  wsData.push([]);
  wsData.push([
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "Total Final Amount (Finished Only):",
    totalFinishedAmount.toFixed(2),
  ]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, "Interest Entries");
  XLSX.writeFile(wb, "Interest_Entries.xlsx");
}
