// ==UserScript==
// @name         Hex Decoder
// @namespace    https://github.com/AZAOWEN2/Hex_Decoder
// @version      1.0.3
// @description  Guess it:)
// @author       AZAOWEN
// @match        https://*.vnpt.vn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vnpt.vn
// @connect      raw.githubusercontent.com

// @resource     STYLE https://raw.githubusercontent.com/AZAOWEN2/Hex_Decoder/main/style.css
// @grant        GM_getResourceText
// @grant        GM_addStyle

// @updateURL   https://raw.githubusercontent.com/AZAOWEN2/Hex_Decoder/main/main.user.js
// @downloadURL https://raw.githubusercontent.com/AZAOWEN2/Hex_Decoder/main/main.user.js
// ==/UserScript==

(function () {
  "use strict";

  const TARGET_SEL = "#ariel\\.list\\.saveSearch_btn_okViewer"; 
  const BTN_ID = "#pmtrung_refresh_button";

  // For cache
  const EXCEPT_URL =
    "https://raw.githubusercontent.com/AZAOWEN2/Hex_Decoder/main/exceptions.json";
  const EXCEPT_CACHE_KEY = "hex_excepts_cache";
  const EXCEPT_CACHE_TTL_MS = 8 * 60 * 60 * 1000;
  let exceptionsSet = new Set();

  // For CSS embedded
  const css = GM_getResourceText("STYLE");
  GM_addStyle(css);

  // Load data from json
  (async () => {
    exceptionsSet = await loadExceptions();
  })();

  const obs = new MutationObserver(() => {
    if (document.querySelector(BTN_ID)) {
      console.log("Button exists! observer button disconnected");
      obs.disconnect();
      return;
    }
    const el = document.querySelector(TARGET_SEL);
    if (el && insertButton(el)) {
      console.log("Button created (via observer)!");
      obs.disconnect();
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  function insertButton(target) {
    if (!target || document.querySelector(BTN_ID)) return false;
    const parent = target.parentNode;
    if (!parent) return false;
    parent.insertBefore(createButton(), target.nextSibling);
    return true;
  }

  function createButton() {
    const btn = document.createElement("button");
    btn.id = btn.className = BTN_ID.replace("#", "");
    btn.textContent = "Ấn zô để ấy";
    btn.addEventListener("click", main);
    return btn;
  }

  function main() {
    const table = document.querySelector(".dashboard-grid.resizableGrid");
    if (!table) return;

    const checkExited = document.querySelector(".pmtrung_hex_decode");
    if (checkExited) { console.log("hex decoded! exit"); return};

    const rows = table.querySelectorAll("tbody tr");

    for (const tr of rows) {
      const td = tr.querySelector('td[propertylabel*="Command"]');
      if (!td) continue;

      const spans = td.querySelectorAll("span");
      const span = spans.length ? spans[spans.length - 1] : td;

      const value = span.textContent.trim();
      if (!value) continue;

      detectHex(value).forEach((hex) => {
        if (hex.length > 2) {
          let decoded;
          try {
            decoded = hexToString(hex);
          } catch (e) {
            decoded = null;
          }
          highLineHex(span, hex, decoded);
        }
      });
    }
  }

  function detectHex(value) {
    const words = value.match(/\b[0-9A-F]+\b/g) || [];
    const out = new Set();
    for (const w of words) {
      if (w.length >= 2 && w.length % 2 === 0 && !/^a\d+$/i.test(w)) {
        const bytes = w.match(/.{2}/g) || [];
        if (bytes.every((b) => !Number.isNaN(parseInt(b, 16)))) out.add(w);
      }
    }
    return [...out].filter((x) => !exceptionsSet.has(x));
  }

  // Fetch data from json and save
  async function loadExceptions() {
    // Get data from cache if valid
    try {
      const cached = JSON.parse(
        localStorage.getItem(EXCEPT_CACHE_KEY) || "null"
      );
      if (cached && Date.now() - cached.time < EXCEPT_CACHE_TTL_MS) {
        return new Set(cached.list);
      }
    } catch (e) {
      console.log("Error from fetching data. Detail: ", e);
    }

    // If not, fetch new data
    const resp = await fetch(EXCEPT_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error("fetch exceptions failed");
    const list = await resp.json();
    const upper = [...new Set(list.map((s) => String(s).toUpperCase().trim()))];
    // And save cache
    localStorage.setItem(
      EXCEPT_CACHE_KEY,
      JSON.stringify({ time: Date.now(), list: upper })
    );
    return new Set(upper);
  }

  function hexToString(hex) {
    const bytes = hex.match(/.{2}/g).map((h) => parseInt(h, 16));
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  function highLineHex(span, hex, decoded) {

    span.normalize();

    const textNodes = Array.from(span.childNodes).filter(
      (n) => n.nodeType === Node.TEXT_NODE && n.nodeValue
    );

    for (const node of textNodes) {
      const full = node.nodeValue;
      const idx = full.indexOf(hex);
      if (idx === -1) continue;

      const before = full.slice(0, idx);
      const after = full.slice(idx + hex.length);

      const wrapper = document.createElement("div");
      wrapper.className = "pmtrung_hex_decode";

      const rawDiv = document.createElement("div");
      rawDiv.className = "hex_raw pmtrung_text_hidden";
      rawDiv.textContent = hex;

      const decodedDiv = document.createElement("div");
      decodedDiv.className = "pmtrung_hex_decoded";
      decodedDiv.textContent = decoded ?? "";

      wrapper.appendChild(rawDiv);
      wrapper.appendChild(decodedDiv);

      const frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(wrapper);
      if (after) frag.appendChild(document.createTextNode(after));

      node.parentNode.replaceChild(frag, node);

      customHexDecoderEventsJS(wrapper);
    }
  }

  function customHexDecoderEventsJS(parent) {
    parent.addEventListener("click", () => {
      parent.querySelectorAll("div").forEach((child) => {
        child.classList.toggle("pmtrung_text_hidden");
      });
    });
  }
})();
