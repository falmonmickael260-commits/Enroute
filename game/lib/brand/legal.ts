/** Who publishes the site, shown on the legal notice page (/mentions-legales). */
export const LEGAL = {
  /** Person or company publishing the site. */
  editor: "",
  /** Contact address shown to visitors. */
  email: "",
  year: 2026,
};

/** The legal notice page and its links only appear once the editor is filled in. */
export const LEGAL_READY = LEGAL.editor.trim() !== "" && LEGAL.email.trim() !== "";
