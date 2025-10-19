// ==UserScript==
// @name         Hex Decoder
// @namespace    http://tampermonkey.net/
// @version      v1.0
// @description  Guess it:)
// @author       AZAOWEN
// @match        https://*.vnpt.vn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vnpt.vn
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  const TARGET_SEL = "#ariel\\.list\\.saveSearch_btn_okViewer";
  const BTN_ID = "#pmtrung_refresh_button";

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
      customHexDecoderCSS(); // Custom CSS
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
          console.log(hex, " | ", hexToString(hex));
          highLineHex(span, hex, decoded);
        }
      });
    }
  }

  function detectHex(value) {
    const words = value.match(/\b[0-9A-Fa-f]+\b/g) || [];
    const out = new Set();
    for (const w of words) {
      if (w.length >= 2 && w.length % 2 === 0 && !/^a\d+$/i.test(w)) {
        const bytes = w.match(/.{2}/g) || [];
        if (bytes.every((b) => !Number.isNaN(parseInt(b, 16)))) out.add(w);
      }
    }
    return [...out];
  }

  function hexToString(hex) {
    const bytes = hex.match(/.{2}/g).map((h) => parseInt(h, 16));
    return new TextDecoder().decode(new Uint8Array(bytes));
  }

  function highLineHex(span, hex, decoded) {
    const full = span.textContent;
    const idx = full.indexOf(hex);
    if (idx === -1) return;

    const before = full.slice(0, idx);
    const match = full.slice(idx, idx + hex.length);
    const after = full.slice(idx + hex.length);

    const wrapper = document.createElement("div");
    wrapper.className = "pmtrung_hex_decode";

    const rawDiv = document.createElement("div");
    rawDiv.className = "hex_raw pmtrung_text_hidden";
    rawDiv.textContent = match;

    const decodedDiv = document.createElement("div");
    decodedDiv.className = "pmtrung_hex_decoded";
    decodedDiv.textContent = decoded;

    wrapper.appendChild(rawDiv);
    wrapper.appendChild(decodedDiv);

    span.innerHTML = "";
    if (before) span.appendChild(document.createTextNode(before));
    span.appendChild(wrapper);
    if (after) span.appendChild(document.createTextNode(after));

    customHexDecoderEventsJS(wrapper); // Custom JS Events Show/Hide
  }

  function customHexDecoderCSS() {
    if (document.querySelector("#pmtrung_global_style")) return;

    const style = document.createElement("style");
    style.id = "pmtrung_global_style";
    style.textContent = `
    .pmtrung_refresh_button {
      width: auto;
      height: 21px;
      line-height: 21px;
      background: #0d6efd;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      padding: 2px;
      margin-left: 8px;
      vertical-align: middle;
    }

    .pmtrung_hex_decoded {
      color: red;
      display: inline;
    }

    .pmtrung_hex_decode {
      display: inline;
      cursor: pointer;
      background-color: white;
    }

    .hex_raw {
      display: inline;
      color: blue;
      text-decoration: underline;
    }

    .pmtrung_text_hidden {
      display: none !important;
    }
  `;
    document.head.appendChild(style);
  }

  function customHexDecoderEventsJS(parent) {
    parent.addEventListener("click", () => {
      parent.querySelectorAll("div").forEach((child) => {
        child.classList.toggle("pmtrung_text_hidden");
      });
    });
  }


})();
