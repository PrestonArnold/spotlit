const QUESTIONS = [
  "Who are you and what do you do?",
  "What first got you into tech?",
  "What does your typical working day look like?",
  "What's your setup? Software and hardware.",
  "What's the last piece of work you feel proud of?",
  "What's one thing about your profession you wish more people knew?",
  "Share something worth checking out — shameless plugs welcomed!",
];

const URL_FIELDS = [
  "urlWebsite",
  "urlGitHub",
  "urlLinkedIn",
  "urlBluesky",
  "urlMastodon",
  "urlTwitter",
  "urlInstagram",
  "urlYouTube",
  "urlHuggingFace",
  "urlNuGet",
];
const STORAGE_KEY = "spotlit-creator";

const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
const answers = saved.answers || {};
const editors = {};

const get = (id) => document.getElementById(id)?.value.trim() ?? "";

function persist() {
  const meta = {
    name: get("name"),
    role: get("role"),
    date: get("date"),
    ...Object.fromEntries(URL_FIELDS.map((f) => [f, get(f)])),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ meta, answers }));
}

// Restore meta fields
const meta = saved.meta || {};
document.getElementById("name").value = meta.name || "";
document.getElementById("role").value = meta.role || "";
document.getElementById("date").value =
  meta.date || new Date().toISOString().slice(0, 10);
URL_FIELDS.forEach((f) => {
  document.getElementById(f).value = meta[f] || "";
});

document
  .querySelectorAll(".meta-card input")
  .forEach((el) => el.addEventListener("input", persist));

const container = document.querySelector(".questions");

QUESTIONS.forEach((q, i) => {
  const block = document.createElement("div");
  block.className = "q-block";
  block.innerHTML = `
        <div class="q-block__header">
            <span class="q-num">Q${i + 1}</span>
            <span class="q-text">${q}</span>
        </div>
        <div class="q-block__body">
            <textarea id="q${i}"></textarea>
        </div>
    `;
  container.appendChild(block);

  block.querySelector(".q-block__header").addEventListener("click", () => {
    const isOpen = block.classList.toggle("is-open");
    if (isOpen && !editors[i]) {
      const mde = new EasyMDE({
        element: document.getElementById(`q${i}`),
        spellChecker: false,
        status: false,
        autofocus: true,
        placeholder: "Write your answer here…",
        minHeight: "200px",
        initialValue: answers[i] || "",
        toolbar: [
          "bold",
          "italic",
          "|",
          "unordered-list",
          "ordered-list",
          "|",
          "link",
          "|",
          "preview",
        ],
        hideIcons: ["fullscreen", "guide", "side-by-side"],
      });

      mde.codemirror.on("change", () => {
        answers[i] = mde.value();
        persist();
      });

      editors[i] = mde;
    }
  });
});

const modal = document.getElementById("modal");
document
  .getElementById("modal-dismiss")
  .addEventListener("click", () => modal.classList.remove("is-open"));
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("is-open");
});

document.getElementById("download").addEventListener("click", () => {
  const meta = {
    name: get("name"),
    role: get("role"),
    date: get("date"),
    ...Object.fromEntries(URL_FIELDS.map((f) => [f, get(f)])),
  };

  const esc = (v) => (v || "").replace(/"/g, '\\"').trim();

  const fm = [
    "---",
    `name: "${esc(meta.name)}"`,
    `role: "${esc(meta.role)}"`,
    `date: "${esc(meta.date)}"`,
    'image: "./portrait.jpg"',
    'ogImage: "./og.jpg"',
    ...URL_FIELDS.map((f) =>
      meta[f] ? `${f}: "${esc(meta[f])}"` : null,
    ).filter(Boolean),
    "---",
  ].join("\n");

  const body = QUESTIONS.map((q, i) => {
    const a = (answers[i] || "").trim();
    return a ? `## ${q}\n\n${a}` : null;
  })
    .filter(Boolean)
    .join("\n\n");

  const content = `${fm}\n\n${body}\n`;

  const blob = new Blob([content], { type: "text/markdown" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download =
    (meta.name || "spotlit")
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "") + ".md";

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  modal.classList.add("is-open");
});
