const STORAGE_KEY = "songwriting-notebook-state";
const SECTION_TYPES = ["Verse", "Chorus", "Pre-Chorus", "Bridge", "Outro", "Custom"];
const LYRIC_PART_COUNT = 8;

const sectionsList = document.querySelector("#sections-list");
const lyricsOutput = document.querySelector("#lyrics-output");
const addSectionButton = document.querySelector("#add-section-btn");
const sectionTemplate = document.querySelector("#section-template");
const lineTemplate = document.querySelector("#line-template");

let state = loadState();

addSectionButton.addEventListener("click", () => {
  state.sections.push(createSection());
  saveAndRender();
});

render();

// Creates a fresh section with one empty writing line.
function createSection(type = "Verse") {
  return {
    id: crypto.randomUUID(),
    type,
    name: type,
    lines: [createLine()],
  };
}

// A line represents two 4/4 bars divided into free writing areas.
function createLine(parts = createEmptyParts()) {
  return {
    id: crypto.randomUUID(),
    parts,
  };
}

function createEmptyParts() {
  return Array.from({ length: LYRIC_PART_COUNT }, () => "");
}

function loadState() {
  const fallback = { sections: [createSection()] };
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(saved);
    return normalizeState(parsed);
  } catch {
    return fallback;
  }
}

// Keeps older or manually edited saved data usable.
function normalizeState(savedState) {
  if (!savedState || !Array.isArray(savedState.sections)) {
    return { sections: [createSection()] };
  }

  const sections = savedState.sections.map((section) => {
    const type = SECTION_TYPES.includes(section.type) ? section.type : "Custom";
    const lines = Array.isArray(section.lines) && section.lines.length
      ? section.lines.map(normalizeLine)
      : [createLine()];

    return {
      id: section.id || crypto.randomUUID(),
      type,
      name: section.name || type,
      lines,
    };
  });

  return { sections: sections.length ? sections : [createSection()] };
}

function normalizeLine(line) {
  const savedParts = Array.isArray(line.parts) ? line.parts : [line.text ?? ""];
  const parts = createEmptyParts().map((_, index) => savedParts[index] ?? "");

  return {
    id: line.id || crypto.randomUUID(),
    parts,
  };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function saveAndRender() {
  saveState();
  render();
}

function render() {
  sectionsList.innerHTML = "";
  lyricsOutput.value = buildFullLyrics();

  state.sections.forEach((section) => {
    sectionsList.appendChild(renderSection(section));
  });
}

function renderSection(section) {
  const sectionNode = sectionTemplate.content.firstElementChild.cloneNode(true);
  const typeSelect = sectionNode.querySelector(".section-type");
  const nameInput = sectionNode.querySelector(".section-name");
  const addLineButton = sectionNode.querySelector(".add-line-btn");
  const linesList = sectionNode.querySelector(".lines-list");

  typeSelect.value = section.type;
  nameInput.value = section.name;

  typeSelect.addEventListener("change", () => {
    section.type = typeSelect.value;
    section.name = typeSelect.value === "Custom" ? section.name : typeSelect.value;
    saveAndRender();
  });

  nameInput.addEventListener("input", () => {
    section.name = nameInput.value;
    saveState();
    lyricsOutput.value = buildFullLyrics();
  });

  addLineButton.addEventListener("click", () => {
    section.lines.push(createLine());
    saveAndRender();
  });

  section.lines.forEach((line) => {
    linesList.appendChild(renderLine(section, line));
  });

  return sectionNode;
}

function renderLine(section, line) {
  const lineNode = lineTemplate.content.firstElementChild.cloneNode(true);
  const lyricInputs = lineNode.querySelectorAll(".lyric-input");
  const duplicateButton = lineNode.querySelector(".duplicate-btn");
  const deleteRowButton = lineNode.querySelector(".delete-row-btn");

  lyricInputs.forEach((input, index) => {
    input.value = line.parts[index] ?? "";
    input.addEventListener("input", () => {
      line.parts[index] = input.value;
      saveState();
      lyricsOutput.value = buildFullLyrics();
    });
  });

  duplicateButton.addEventListener("click", () => {
    section.lines.push(createLine([...line.parts]));
    saveAndRender();
  });

  deleteRowButton.addEventListener("click", () => {
    section.lines = section.lines.filter((item) => item.id !== line.id);
    saveAndRender();
  });

  return lineNode;
}

function buildFullLyrics() {
  return state.sections
    .map((section) => {
      const sectionTitle = section.name || section.type;
      const lines = section.lines
        .map((line) => line.parts.join(" ").replace(/\s+/g, " ").trim())
        .join("\n");

      return `[${sectionTitle}]\n${lines}`;
    })
    .join("\n\n----\n\n");
}
