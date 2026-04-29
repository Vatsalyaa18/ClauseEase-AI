const API = "http://127.0.0.1:5000"; // backend

let mode = "login";
let selectedLevel = "basic";

// --- Elements ---
const authOverlay = document.getElementById("authOverlay");
const closeAuth = document.getElementById("closeAuth");
const headerLoginBtn = document.getElementById("headerLoginBtn");
const headerRegisterBtn = document.getElementById("headerRegisterBtn");
const publicNav = document.getElementById("publicNav");
const privateNav = document.getElementById("privateNav");

// Dashboard Elements
const appContainer = document.getElementById("appContainer");
const docText = document.getElementById("docText");
const fileUpload = document.getElementById("fileUpload");
const analyzeBtn = document.getElementById("analyzeBtn");
const simplifyBtn = document.getElementById("simplifyBtn");
const analysisResults = document.getElementById("analysisResults");
const emptyResult = document.getElementById("emptyResult");
const highlightContainer = document.getElementById("highlightedText");
const analysisStatus = document.getElementById("analysisStatus");
const tryBtn = document.getElementById("tryBtn");
const heroSection = document.getElementById("heroSection");

// Auth Form Elements
const authTitle = document.getElementById("authTitle");
const authSub = document.getElementById("authSub");
const nameBox = document.getElementById("nameBox");
const submitBtn = document.getElementById("submitBtn");
const switchBtn = document.getElementById("switchBtn");
const msg = document.getElementById("msg");
const userNameDisplay = document.getElementById("userName");
const historyOverlay = document.getElementById("historyOverlay");
const closeHistory = document.getElementById("closeHistory");
const historyList = document.getElementById("historyList");
const gaugeFill = document.getElementById("gaugeFill");
const complexityPercentage = document.getElementById("complexityPercentage");
const downloadPdfBtn = document.getElementById("downloadPdfBtn");

let theme = localStorage.getItem("theme") || "dark";
document.documentElement.setAttribute("data-theme", theme);
let currentUser = JSON.parse(localStorage.getItem("clauseEaseUser")) || null;

if (currentUser) {
  userNameDisplay.textContent = currentUser.name;
  publicNav.classList.add("hide");
  privateNav.classList.remove("hide");

  // show admin button if admin
  if (currentUser.role === "admin") {
    const adminBtn = document.getElementById("adminBtn");
    if (adminBtn) adminBtn.classList.remove("hide");
  }

  loadMyReports();
}

// --- Helper Functions ---
function setMessage(text, ok = true) {
  msg.style.color = ok ? "var(--primary)" : "#ef4444";
  msg.textContent = text;
}

function showAuth(targetMode) {
  mode = targetMode;
  authOverlay.classList.remove("hide");
  if (mode === "login") {
    authTitle.textContent = "Login";
    authSub.textContent = "Access your simplified contracts.";
    submitBtn.textContent = "Login";
    nameBox.classList.add("hide");
    document.getElementById("switchText").innerHTML = 'Don\'t have an account? <span id="switchBtn">Register</span>';
    const adminBox = document.getElementById("adminCodeBox");
    if (adminBox) adminBox.classList.add("hide");
  } else {
    authTitle.textContent = "Register";
    authSub.textContent = "Create a new account.";
    submitBtn.textContent = "Create Account";
    nameBox.classList.remove("hide");
    document.getElementById("switchText").innerHTML = 'Already have an account? <span id="switchBtn">Login</span>';
    const adminBox = document.getElementById("adminCodeBox");
    if (adminBox) adminBox.classList.remove("hide");
  }
  // Re-attach switchBtn listener
  document.getElementById("switchBtn").addEventListener("click", () => {
    showAuth(mode === "login" ? "register" : "login");
  });
}

// --- Event Listeners ---
headerLoginBtn.addEventListener("click", () => showAuth("login"));
headerRegisterBtn.addEventListener("click", () => showAuth("register"));
closeAuth.addEventListener("click", () => authOverlay.classList.add("hide"));

// Transition from Hero to App
tryBtn.addEventListener("click", () => {
  heroSection.classList.add("hide");
  appContainer.classList.remove("hide");
  window.scrollTo({ top: 0, behavior: "smooth" });
});

authOverlay.addEventListener("click", (e) => {
  if (e.target === authOverlay) authOverlay.classList.add("hide");
});

// Tab Switching
document.querySelectorAll(".tab-btn:not([data-subtab])").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn:not([data-subtab])").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.tab;
    document.getElementById("pasteTab").classList.add("hide");
    document.getElementById("uploadTab").classList.add("hide");
    document.getElementById(`${target}Tab`).classList.remove("hide");
  });
});

// Simplification Level Buttons
document.querySelectorAll(".level-btn").forEach(btn => {

  btn.addEventListener("click", () => {

    document.querySelectorAll(".level-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");

    selectedLevel = btn.dataset.level;

  });

});

// Sub-tab Switching for Preprocessing
document.querySelectorAll("[data-subtab]").forEach(btn => {
  btn.addEventListener("click", () => {
    const parent = btn.closest(".preprocessing-results");
    parent.querySelectorAll("[data-subtab]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.subtab;
    parent.querySelector("#cleanedTextContent").classList.add("hide");
    parent.querySelector("#tokensContent").classList.add("hide");
    parent.querySelector(`#${target}Content`).classList.remove("hide");
  });
});

// Live Analysis Debounce
let analysisTimeout;
docText.addEventListener("input", () => {
  // Only auto-analyze if text is pasted or typed
  clearTimeout(analysisTimeout);
  analysisTimeout = setTimeout(() => {
    if (docText.value.trim().length > 10) {
      analyzeBtn.click();
    }
  }, 1000);
});

// File Upload Display
fileUpload.addEventListener("change", () => {

  const placeholder = document.getElementById("dropPlaceholder");
  const fileBox = document.getElementById("selectedFile");
  const fileName = document.getElementById("selectedFileName");

  if (fileUpload.files.length > 0) {

    const file = fileUpload.files[0];
    fileName.textContent = "📄 " + file.name;

    placeholder.classList.add("hide");
    fileBox.classList.remove("hide");

  }
});

fileUpload.addEventListener("click", (e) => {
  e.stopPropagation();
});
// Allow clicking the drop zone to open file picker
const dropZone = document.getElementById("dropZone");

dropZone.addEventListener("click", (e) => {

  // prevent double trigger
  e.stopPropagation();

  // if clicking replace button
  if (e.target.id === "replaceFileBtn") {
      fileUpload.value = "";
      fileUpload.click();
      return;
  }

  // open picker when clicking anywhere else in drop zone
  if (!e.target.closest("#replaceFileBtn")) {
      fileUpload.click();
  }

});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {

  e.preventDefault();
  dropZone.classList.remove("dragover");

  const files = e.dataTransfer.files;

  if(files.length > 0){

    fileUpload.files = files;

    const placeholder = document.getElementById("dropPlaceholder");
    const fileBox = document.getElementById("selectedFile");
    const fileName = document.getElementById("selectedFileName");

    fileName.textContent = "📄 " + files[0].name;

    placeholder.classList.add("hide");
    fileBox.classList.remove("hide");

    analyzeBtn.click();
  }

});


// Analysis Logic
analyzeBtn.addEventListener("click", async () => {
  const text = docText.value.trim();
  const file = fileUpload.files[0];

  if (!text && !file) {
    alert("Please paste text or upload a file first.");
    return;
  }

  analyzeBtn.disabled = true;
  analyzeBtn.innerHTML = '<span class="btn-icon">⌛</span> Analyzing...';
  analysisStatus.textContent = "Analyzing...";
  document.querySelector(".status-dot").style.background = "var(--color-normal)";

  try {
    let res;
    if (file && !document.getElementById("uploadTab").classList.contains("hide")) {
      const formData = new FormData();
      formData.append("file", file);
      res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        body: formData,
        headers: currentUser ? { "X-User-Email": currentUser.email } : {}
      });

    } else {
      res = await fetch(`${API}/api/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": currentUser ? currentUser.email : ""
        },
        body: JSON.stringify({ text })
      });
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Analysis failed");

    // Display Results
    document.getElementById("fkGrade").textContent = data.readability.flesch_kincaid_grade.toFixed(1);
    document.getElementById("gfIndex").textContent = data.readability.gunning_fog.toFixed(1);
    document.getElementById("complexityLabel").textContent = data.complexity_label.split(" ")[0];

    // Update Gauge
    const fk = data.readability.flesch_reading_ease;
    // Flesch is 100 (simple) to 0 (complex). We want 0-100 complexity risk.
    const risk = Math.max(0, Math.min(100, 100 - fk));
    const rotation = (risk / 100) * 0.5; // 0.5 turns = 180deg
    gaugeFill.style.transform = `rotate(${0.5 + rotation}turn)`;
    complexityPercentage.textContent = `${Math.round(risk)}%`;

    // Store current analysis for PDF
    window.currentAnalysis = {
      text: data.original_text,
      simplified: document.getElementById("simplifiedTextDisplay")?.textContent || "",
      summary: document.getElementById("summaryDisplay")?.textContent || "",
      flesch: data.readability.flesch_reading_ease.toFixed(1),
      fog: data.readability.gunning_fog.toFixed(1)
    };

    // Highlights (safe check)
    if (highlightContainer && data.word_analysis) {
      highlightContainer.innerHTML = "";

      data.word_analysis.forEach(word => {
        const span = document.createElement("span");
        span.textContent = word.text + " ";
        if (word.complexity !== "none") {
          span.className = `word-${word.complexity}`;
        }
        highlightContainer.appendChild(span);
      });
    }

    // Preprocessing Displays
    document.getElementById("cleanedTextOutput").textContent = data.cleaned_text;
    const sentenceList = document.getElementById("sentenceList");
    sentenceList.innerHTML = "";
    if (data.sentence_tokens) {
      data.sentence_tokens.forEach(sent => {
        const div = document.createElement("div");
        div.textContent = sent;
        sentenceList.appendChild(div);
      });
    }

    const wordList = document.getElementById("wordList");
    wordList.innerHTML = "";
    if (data.word_tokens) {
      data.word_tokens.forEach(word => {
        const span = document.createElement("span");
        span.textContent = word;
        wordList.appendChild(span);
      });
    }

    // Toggle View
    emptyResult.classList.add("hide");
    analysisResults.classList.remove("hide");
    document.querySelector(".analysis-section").classList.remove("hide");
    analysisStatus.textContent = "Complete";
    document.querySelector(".status-dot").style.background = "var(--primary)";

  } catch (err) {
    alert("❌ Error: " + err.message);
    analysisStatus.textContent = "Error";
    document.querySelector(".status-dot").style.background = "var(--color-complex)";
  } finally {
    analyzeBtn.disabled = false;
    analyzeBtn.innerHTML = '<span class="btn-icon">⚡</span> Analyze';
  }
});


// Auth Logic
submitBtn.addEventListener("click", async () => {
  const name = document.getElementById("name")?.value?.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!email || !password || (mode === "register" && !name)) {
    setMessage("Please fill all required fields.", false);
    return;
  }

  setMessage("Processing...");

  try {
    if (mode === "register") {
      const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, admin_code: document.getElementById("adminCode")?.value || ""})
      });
      const data = await res.json();
      if (!res.ok) return setMessage(data.message || "Register failed", false);
      setMessage("Registered ✅", true);
      setTimeout(() => showAuth("login"), 700);
      return;
    }

    // Login
    const res = await fetch(`${API}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) return setMessage(data.message || "Login failed", false);

    setMessage("Login successful ✅", true);
    currentUser = data.user;
    localStorage.setItem("clauseEaseUser", JSON.stringify(currentUser));
    userNameDisplay.textContent = data.user.name;

    // UI Update
    setTimeout(() => {
      authOverlay.classList.add("hide");
      publicNav.classList.add("hide");
      privateNav.classList.remove("hide");
      setMessage("");
      
      // show dashboard
      heroSection.classList.add("hide");
      appContainer.classList.remove("hide");
      // show admin button if admin
      if (currentUser.role === "admin") {
        const adminBtn = document.getElementById("adminBtn");
        if (adminBtn) adminBtn.classList.remove("hide");
      }

      loadMyReports();
    }, 800);

  } catch (err) {
    setMessage("❌ Backend connection error", false);
  }
});

const adminBtn = document.getElementById("adminBtn");

if (adminBtn) {
  adminBtn.addEventListener("click", () => {
    window.location.href = "admindash/admin.html";
  });
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem("clauseEaseUser");
  publicNav.classList.remove("hide");
  privateNav.classList.add("hide");
  // Optional: Reset analysis state
  emptyResult.classList.remove("hide");
  analysisResults.classList.add("hide");
});

// History Logic
userNameDisplay.addEventListener("click", async () => {
  if (!currentUser) return;
  historyOverlay.classList.remove("hide");
  historyList.innerHTML = "<p>Loading history...</p>";

  try {
    const res = await fetch(`${API}/api/history?email=${currentUser.email}`);
    const data = await res.json();

    if (data.length === 0) {
      historyList.innerHTML = '<p class="empty-history">No history found. Start analyzing to see your past reports.</p>';
      return;
    }

    historyList.innerHTML = "";
    data.forEach(item => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div class="history-info">
          <span class="history-preview">${item.text_preview}</span>
          <span class="history-meta">${new Date(item.created_at).toLocaleDateString()}</span>
        </div>
        <div class="history-scores">
          <span class="score-pill">FK: ${item.flesch_score.toFixed(1)}</span>
          <span class="score-pill">GF: ${item.fog_score.toFixed(1)}</span>
        </div>
      `;
      div.onclick = () => {
        docText.value = item.text_preview.replace("...", "");
        historyOverlay.classList.add("hide");
        analyzeBtn.click();
      };
      historyList.appendChild(div);
    });
  } catch (err) {
    historyList.innerHTML = "<p>Error loading history.</p>";
  }
});

if (closeHistory && historyOverlay) {
  closeHistory.onclick = () => historyOverlay.classList.add("hide");
}



// Theme Toggle (Simplified)
const toggleBtn = document.getElementById("themeToggle");

toggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
document.getElementById("themeToggle").addEventListener("click", () => {

  theme = theme === "dark" ? "light" : "dark";

  document.documentElement.setAttribute("data-theme", theme);

  localStorage.setItem("theme", theme);

});

// PDF Export (Secure per-user)
downloadPdfBtn.addEventListener("click", async () => {
  if (!window.currentAnalysis || !currentUser) {
    alert("Please login first.");
    return;
  }

  downloadPdfBtn.disabled = true;
  downloadPdfBtn.innerHTML = "Generating...";

  try {
    // Step 1: Save PDF in backend
    const saveRes = await fetch(`${API}/api/export-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": currentUser.email
      },
      body: JSON.stringify({
      ...window.currentAnalysis,
      simplified: window.currentSimplifiedData?.simplified || "",
      summary: window.currentSimplifiedData?.summary || ""
    })
    });

    const saveData = await saveRes.json();
    console.log("SAVE RESPONSE:", saveData);

    if (!saveRes.ok) {
      alert(saveData.message);
      return;
    }

    await loadMyReports(); 

    // Step 2: Securely download
    const downloadRes = await fetch(
      `${API}/api/download-report/${saveData.report_id}`,
      {
        headers: {
          "X-User-Email": currentUser.email
        }
      }
    );

    if (!downloadRes.ok) {
      alert("Download failed.");
      return;
    }

    const blob = await downloadRes.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ClauseEase_Report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);

  } catch (err) {
    alert("Export failed.");
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.innerHTML = '<span class="btn-icon">📄</span> Download Analysis (PDF)';
  }
});

async function loadMyReports() {
  if (!currentUser) return;

  try {
    const res = await fetch(`${API}/api/my-reports`, {
      headers: {
        "X-User-Email": currentUser.email
      }
    });

    const reports = await res.json();

    const container = document.getElementById("myReportsList");
    container.innerHTML = "";

    if (reports.length === 0) {
      container.innerHTML = "<p>No reports yet.</p>";
      return;
    }

    reports.forEach(report => {
      const div = document.createElement("div");
      div.className = "report-item";

      div.innerHTML = `
        <div class="report-card">
          <div class="report-file">
            <span class="file-icon">📄</span>
            <div class="file-info">
              <strong>${report.filename}</strong>
              <small>${new Date(report.created_at).toLocaleString()}</small>
            </div>
          </div>

          <button class="download-btn" data-id="${report.id}">
            ⬇ Download
          </button>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error("Failed to load reports");
  }
}

// ================= SIMPLIFY LOGIC =================
simplifyBtn.addEventListener("click", async () => {
  const text = docText.value.trim();
  const file = fileUpload.files[0];
  const level = selectedLevel; // "basic", "intermediate", "advanced"

  if (!text && !file) {
    alert("Please paste text or upload a file first.");
    return;
  }

  simplifyBtn.disabled = true;
  simplifyBtn.innerHTML = "Simplifying...";

  try {
    let res;

    if (file && !document.getElementById("uploadTab").classList.contains("hide")) {

      const formData = new FormData();
      formData.append("file", file);
      formData.append("level", level);

      res = await fetch(`${API}/api/simplify`, {
        method: "POST",
        body: formData
      });

    } else {

      res = await fetch(`${API}/api/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level })
      });

    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    // Show side-by-side results
    document.getElementById("originalTextDisplay").textContent = data.original_text;
    document.getElementById("simplifiedTextDisplay").textContent = data.simplified_text;
    document.getElementById("summaryDisplay").textContent = data.summary;

    const termsDiv = document.getElementById("termsDisplay");
    termsDiv.innerHTML = "";

    if (data.legal_terms && Object.keys(data.legal_terms).length > 0) {

      Object.entries(data.legal_terms).forEach(([term, meaning]) => {

        const termCard = document.createElement("div");

        termCard.className = "legal-term-card";

        termCard.innerHTML = `
          <strong>${term}</strong>
          <p>${meaning}</p>
        `;

        termsDiv.appendChild(termCard);

      });

      document.getElementById("legalTermsSection").classList.remove("hide");

    }
    // Store simplified result globally for PDF export
    window.currentSimplifiedData = {
      simplified: data.simplified_text,
      summary: data.summary
    };

    document.getElementById("simplifyResults").classList.remove("hide");
    document.getElementById("summaryBox").classList.remove("hide");

  } catch (err) {
    alert("Simplification failed: " + err.message);
  } finally {
    simplifyBtn.disabled = false;
    simplifyBtn.innerHTML = '<span class="btn-icon">✨</span> Simplify';
  }
});

// PDF Export (Secure per-user)
downloadPdfBtn.addEventListener("click", async () => {
  if (!window.currentAnalysis || !currentUser) {
    alert("Please login first.");
    return;
  }

  downloadPdfBtn.disabled = true;
  downloadPdfBtn.innerHTML = "Generating...";

  try {
    // Step 1: Save PDF in backend
    const saveRes = await fetch(`${API}/api/export-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": currentUser.email
      },
      body: JSON.stringify({
      ...window.currentAnalysis,
      simplified: window.currentSimplifiedData?.simplified || "",
      summary: window.currentSimplifiedData?.summary || ""
    })
    });

    const saveData = await saveRes.json();
    console.log("SAVE RESPONSE:", saveData);

    if (!saveRes.ok) {
      alert(saveData.message);
      return;
    }

    await loadMyReports(); 

    // Step 2: Securely download
    const downloadRes = await fetch(
      `${API}/api/download-report/${saveData.report_id}`,
      {
        headers: {
          "X-User-Email": currentUser.email
        }
      }
    );

    if (!downloadRes.ok) {
      alert("Download failed.");
      return;
    }

    const blob = await downloadRes.blob();
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ClauseEase_Report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);

  } catch (err) {
    alert("Export failed.");
  } finally {
    downloadPdfBtn.disabled = false;
    downloadPdfBtn.innerHTML = '<span class="btn-icon">📄</span> Download Analysis (PDF)';
  }
});

async function loadMyReports() {
  if (!currentUser) return;

  try {
    const res = await fetch(`${API}/api/my-reports`, {
      headers: {
        "X-User-Email": currentUser.email
      }
    });

    const reports = await res.json();

    const container = document.getElementById("myReportsList");
    container.innerHTML = "";

    if (reports.length === 0) {
      container.innerHTML = "<p>No reports yet.</p>";
      return;
    }

    reports.forEach(report => {
      const div = document.createElement("div");
      div.className = "report-item";

      div.innerHTML = `
        <div class="report-card">
          <div class="report-file">
            <span class="file-icon">📄</span>
            <div class="file-info">
              <strong>${report.filename}</strong>
              <small>${new Date(report.created_at).toLocaleString()}</small>
            </div>
          </div>

          <button class="download-btn" data-id="${report.id}">
            ⬇ Download
          </button>
        </div>
      `;

      container.appendChild(div);
    });

  } catch (err) {
    console.error("Failed to load reports");
  }
}

// ================= SIMPLIFY LOGIC =================
simplifyBtn.addEventListener("click", async () => {
  const text = docText.value.trim();
  const file = fileUpload.files[0];
  const level = selectedLevel; // "basic", "intermediate", "advanced"

  if (!text && !file) {
    alert("Please paste text or upload a file first.");
    return;
  }

  simplifyBtn.disabled = true;
  simplifyBtn.innerHTML = "Simplifying...";

  try {
    let res;

    if (file && !document.getElementById("uploadTab").classList.contains("hide")) {

      const formData = new FormData();
      formData.append("file", file);
      formData.append("level", level);

      res = await fetch(`${API}/api/simplify`, {
        method: "POST",
        body: formData
      });

    } else {

      res = await fetch(`${API}/api/simplify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, level })
      });

    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.message);

    // Show side-by-side results
    document.getElementById("originalTextDisplay").textContent = data.original_text;
    document.getElementById("simplifiedTextDisplay").textContent = data.simplified_text;
    document.getElementById("summaryDisplay").textContent = data.summary;

    const termsDiv = document.getElementById("termsDisplay");
    termsDiv.innerHTML = "";

    if (data.legal_terms && Object.keys(data.legal_terms).length > 0) {

      Object.entries(data.legal_terms).forEach(([term, meaning]) => {

        const termCard = document.createElement("div");

        termCard.className = "legal-term-card";

        termCard.innerHTML = `
          <strong>${term}</strong>
          <p>${meaning}</p>
        `;

        termsDiv.appendChild(termCard);

      });

      document.getElementById("legalTermsSection").classList.remove("hide");

    }
    // Store simplified result globally for PDF export
    window.currentSimplifiedData = {
      simplified: data.simplified_text,
      summary: data.summary
    };

    document.getElementById("simplifyResults").classList.remove("hide");
    document.getElementById("summaryBox").classList.remove("hide");

  } catch (err) {
    alert("Simplification failed: " + err.message);
  } finally {
    simplifyBtn.disabled = false;
    simplifyBtn.innerHTML = '<span class="btn-icon">✨</span> Simplify';
  }
});