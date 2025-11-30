// ==UserScript==
// @name         Hex Decoder (Beta)
// @namespace    https://github.com/AZAOWEN2/Hex_Decoder
// @version      2.0.0
// @description  Nothing 
// @author       AZAOWEN
// @match        https://*.vnpt.vn/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=vnpt.vn
// @connect      raw.githubusercontent.com
// @connect      fonts.googleapis.com

// @resource     STYLE https://raw.githubusercontent.com/AZAOWEN2/Hex_Decoder/main/style.css
// @grant        GM_getResourceText
// @grant        GM_addStyle

// @updateURL   https://raw.githubusercontent.com/AZAOWEN2/Hex_Decoder/main/main.user.js
// @downloadURL https://raw.githubusercontent.com/AZAOWEN2/Hex_Decoder/main/main.user.js
// ==/UserScript==

(function () {
  "use strict";

  // For CSS embedded
  GM_addStyle(GM_getResourceText("STYLE"));

  //For loaded document
  let PAGE_EVENTVIEWER;

  // For data preload
  const totalLink = {
    successVideo: {
      url: "https://cdn.jsdelivr.net/gh/AZAOWEN2/Hex_Decoder@main/assets/video/successVideo.mp4",
      type: "video",
    },
    warningVideo: {
      url: "https://cdn.jsdelivr.net/gh/AZAOWEN2/Hex_Decoder@main/assets/video/warningVideo.mp4",
      type: "video",
    },

    formatIcon: {
      url: "https://cdn.jsdelivr.net/gh/AZAOWEN2/Hex_Decoder@main/assets/img/formatIcon.gif",
      type: "image",
    },

    exceptions: {
      url: "https://cdn.jsdelivr.net/gh/AZAOWEN2/Hex_Decoder@main/exceptions.json",
      type: "data",
    },

    // script:  { url: 'https://example.com/script.js', type: 'script' },
    // style:   { url: 'https://example.com/style.css', type: 'style' },
  };

  //Error Code Generator
  const usedErrorCode = new Set();
  function errorCode() {
    let n;
    do n = Math.floor(Math.random()*90000) + 10000; while (usedErrorCode.has(n));
    usedErrorCode.add(n);
    return n;
  }

  function observeCenter(selector, Func1, Func2, options = {}) {
    const { root = document.documentElement, timeout = 60000, forever = false } = options;

    const obs = new MutationObserver(() => {
      const el = root.querySelector(selector);
      if (el) {
        clearTimeout(timer);
        if(Func1) { Func1(el) };
        if(Func2) { Func2(el) };
        if(!forever) {obs.disconnect()};
      }
    });
    
    const timer = setTimeout(() => {
      if(!forever) {obs.disconnect()};
    }, timeout);

    obs.observe(root, { childList: true, subtree: true });
    return obs;
  }


  observeCenter("#defaultTable", (el) => {
    PAGE_EVENTVIEWER = el.ownerDocument;
    insertNotification();
    insertDecodeButton("Event_List");

    observeCenter("#spinner_display", (el) => {
      observeCenter("#defaultTable", insertCopyColIcon, (el2) => {
        observeCenter("#defaultTable",insertCopyColIcon, (el3) => {
          console.log("RECREATE copy icon");
        }, {root: PAGE_EVENTVIEWER.querySelector("#tableSection"), forever: true });
      }, {root: PAGE_EVENTVIEWER.documentElement});
    }, false, {root: PAGE_EVENTVIEWER.documentElement});

  }); 

  observeCenter("#PayloadHeader", (el) => {
    PAGE_EVENTVIEWER = el.ownerDocument;
    insertNotification();
    mouseHighLightDetector();
    // insertDecodeButton("Details_Event");

    observeCenter("#GUID_6",insertLogFormat, false, {root: PAGE_EVENTVIEWER.documentElement}); //Log Format
  });







  // -------------------------------------
  // Hex decode
  function insertDecodeButton(classify) {
    if (PAGE_EVENTVIEWER.querySelector(".pmtrung_decode_button")) return false;
    PAGE_EVENTVIEWER.body.prepend(createDecodeButton(classify));
    return true;
  }

  function createDecodeButton(classify) {
    const btn = document.createElement("button");
    btn.id = btn.className = "pmtrung_decode_button";
    btn.textContent = "Ấn zô để ấy";
    switch (classify) {
      case "Event_List":
        btn.addEventListener("click", () => hexDecodeAction());
        break;

      case "Details_Event":
        // btn.addEventListener("click", () => base64DecodeAction());
        break;

      default:
        btn.addEventListener("click", () => {
          const code = errorCode();
          showNotification(`[${code}] Lỗi sử lý! Vui lòng tải lại trang.`, false);
          console.log(`[${code}]: Lỗi không nhận dạng được phân loại cho #pmtrung_decode_button:`, classify)
        });
    }
    return btn;
  }

  function hexDecodeAction() {
    const table = PAGE_EVENTVIEWER.querySelector(".dashboard-grid.resizableGrid");
    if (!table) return;

    if (PAGE_EVENTVIEWER.querySelector(".pmtrung_hex_decode")) return;
    

    const rows = table.querySelectorAll("tbody tr");

    for (const tr of rows) {
      const td = tr.querySelector('td[propertylabel*="Command"], td[propertylabel*="audit_proctitle"]');
      if (!td) continue;

      const spans = td.querySelectorAll("span");
      const span = spans.length ? spans[spans.length - 1] : td;

      const value = span.textContent.trim();
      if (!value) continue;

      const list_Hex = detectHex(value);

      if(!list_Hex) return;

      list_Hex.forEach((hex) => {
        let decoded = hexToString(hex);
        if (!decoded) return;
        highLineHex(span, hex, decoded);
      });
    }
  }

  function detectHex(value, mode = "cluster") {
    try {
      const isValidHex = (str) => {
        if (str.length < 6 || str.length % 2 !== 0) return false;
        if (!/^[0-9A-F]+$/.test(str)) return false;

        const bytes = str.match(/.{2}/g) || [];                     
        return bytes.every(b => !Number.isNaN(parseInt(b, 16)));
      };

      switch (mode){
        case "full":{ 
          return (!Number.isInteger(Number(value)) && isValidHex(value) ) ? value : false;
        }

        case "cluster":{ 
          const words = value.match(/\b[0-9A-F]+\b/g) || [];
          const out = new Set();
          for (const w of words) {
            if (!/^a\d+$/i.test(w) && isValidHex(w)) {
              out.add(w);
            }
          }
          return [...out];
        }

        default:
          throw error;
      }

    } catch { return false; }
  }

  function hexToString(hex) {
    try {
      const bytes = hex.match(/.{2}/g).map((h) => parseInt(h, 16));
      const raw_data = new TextDecoder().decode(new Uint8Array(bytes));
      if (isHexValidUincode(raw_data, hex.length)) {
        return raw_data;
      } else { return null; }
    } catch {
      return null;
    }
  }

  function isHexValidUincode(decodedStr, originHexLength) {
    if (!decodedStr || decodedStr.length === 0) return false;

    // Check �
    if (decodedStr.includes('\uFFFD')) return false;

    // https://donsnotes.com/tech/charsets/ascii.html
    if (/[\x01-\x08\x0B\x0C\x0E-\x1F]/.test(decodedStr)) return false;

    let validCount = 0;
    
    // Unicode, number, space, punctuation
    const validPattern =/[\p{L}\x20-\x7E\s]/u

    for (const char of decodedStr) {
      if (validPattern.test(char)) {
        validCount++;
      }
    }

    // MD5=32, SHA1=40, SHA256=64, SHA512=128
    const HASH_LENGTHS = new Set([32, 40, 64, 128]);
    const density = validCount / decodedStr.length;

    // Strict mode: > 90%
    if (HASH_LENGTHS.has(originHexLength)) {
      return density >= 0.8;
    }

    // Otherwise, > 70%
    return density > 0.7;
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
      rawDiv.className = "hex_raw pmtrung_hide";
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
        child.classList.toggle("pmtrung_hide");
      });
    });
  }
  // -------------------------------------



  // -------------------------------------
  // Notification
  function insertNotification() {
    if ( document.querySelector(".pmtrung-notification-root")) return;
    const root = document.createElement("div");
    root.className = "pmtrung-notification-root";
    document.body.appendChild(root);

    const tpl = document.createElement("template");
    tpl.className = "pmtrung-notification-template";
    tpl.innerHTML = `
      <div class="pmtrung_notification" role="alert">
        <video class="pmtrung_notification__icon" autoplay muted playsinline>
          <source src="check.mp4" type="video/mp4" />
        </video>

        <div class="pmtrung_notification__body">
          <p class="pmtrung_notification__text"></p>
        </div>

        <div class="pmtrung_notification__action">
          <button class="pmtrung_close_notification_button" aria-label="Dismiss">✕</button>
        </div>
      </div>
    `;
    document.body.appendChild(tpl);
  }

  function showNotification(content, type, options = {}) {
    const { timeout = 4000 } = options;

    const root = document.querySelector(".pmtrung-notification-root");
    const tpl = document.querySelector(".pmtrung-notification-template");

    if (!root || !tpl ) insertNotification();

    const node = tpl.content.firstElementChild.cloneNode(true);

    node.querySelector(".pmtrung_notification__text").textContent = content;

    // node.style.setProperty('--pmtrung-linetiming', `${timeout}ms`);

    const iconMap = {
      true: totalLink.successVideo.url,
      false: totalLink.warningVideo.url,
    };

    const colorMap = {
      true: "#16a34a",
      false: "#dc2626",
    };

    node.querySelector(".pmtrung_notification__icon").src = iconMap[type];
    node.style.setProperty("--pmtrung-linetime-color", colorMap[type]);

    node
      .querySelector(".pmtrung_close_notification_button")
      .addEventListener("click", () => closeNotification(node));

    root.prepend(node);

    requestAnimationFrame(() => {
      node.classList.add("is-open");
    });

    if (timeout > 0) {
      setTimeout(() => {
        if (node.isConnected) closeNotification(node);
      }, timeout);
    }

    // return node;
  }

  function closeNotification(node) {
    if (!node || !node.isConnected) return;

    node.classList.remove("is-open");
    node.classList.add("is-closing");

    const onEnd = (e) => {
      if (e.target !== node) return;
      node.removeEventListener("transitionend", onEnd);
      if (node.isConnected) node.remove();
    };

    node.addEventListener("transitionend", onEnd, { once: true });

    setTimeout(() => {
      if (node.isConnected) node.remove();
    }, 800);
  }
  // -------------------------------------



  // -------------------------------------
  // Copy Col
  function insertCopyColIcon(table) {
    if (!table || PAGE_EVENTVIEWER.querySelector(".pmtrung_copy_icon")) return false;
    const headTable = table.querySelectorAll("thead tr th");
    if (!headTable) return false;
    headTable.forEach(th => {
      th.prepend(createCopyColIcon());
    });
     copyColAction();
  }

  function createCopyColIcon(){
    const icon = document.createElement("div");
    icon.id = icon.className = "pmtrung_copy_icon";
    icon.textContent = "📋";
    return icon;
  }

  function copyColAction() {
    PAGE_EVENTVIEWER.querySelectorAll(".pmtrung_copy_icon").forEach((icon, colIndex) => {
      icon.addEventListener("click", () => {
        const table = icon.closest("table");
        const rows = table.querySelectorAll("tbody tr");
        let values = new Set();

        rows.forEach((row) => {
          const cell = row.cells[colIndex];
          if (!cell) return;

          const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT, {
            acceptNode: (textNode) => {
              const el = textNode.parentElement;
              if (!el) return NodeFilter.FILTER_SKIP;
              for (let n = el; n && n !== cell; n = n.parentElement) {
                const style = getComputedStyle(n);
                if (
                  style.display === "none" ||
                  style.visibility === "hidden" ||
                  style.opacity === "0" ||
                  n.tagName?.toLowerCase() === "script"
                ) {
                  return NodeFilter.FILTER_SKIP;
                }
              }
              return NodeFilter.FILTER_ACCEPT;
            },
          });

          let result = "";
          while (walker.nextNode()) {
            result += walker.currentNode.textContent.trim() + " ";
          }
          values.add(result.trim());
        });

        const textToCopy = [...values].join(prompt("Kiểu nối chuỗi:"));
        navigator.clipboard
          .writeText(textToCopy)
          .then(() => {
            showNotification("Sao chép thành công!", true);
            icon.textContent = "✅";
            setTimeout(() => (icon.textContent = "📋"), 1000);
          })
          .catch((err) => {
            console.error("Copy lỗi:", err)
            showNotification("Lỗi sao chép!", false);
          });
      });
    });
  }

  function showHideColumnCopy (){
     
  }
  // -------------------------------------




  // -------------------------------------
  // Decode HighLight String
  function mouseHighLightDetector(){
    PAGE_EVENTVIEWER.addEventListener("mouseup", (e) => {
      const selection = window.getSelection();
      const Encoded = selection.toString().trim();

      const popup = PAGE_EVENTVIEWER.querySelector(".pmtrung-decode-contextual-popup");
      // Bỏ qua nếu trong vùng
      if (popup && popup.contains(e.target)) return;
      // Nếu không bôi bỏ qua || xóa popup
      if (!Encoded || !selection.rangeCount) {
        popup?.remove();
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Bỏ qua nếu bôi khác vùng
      if (range.startContainer !== range.endContainer) return;

      const hexDecoded = () => {
        const check = detectHex(Encoded, "full");
        return (check && check.length > 0) ? hexToString(Encoded) : false;
      };

      const base64Decoded = () => base64DecodeAction(Encoded);

      const hexResult = hexDecoded();
      if (hexResult) {
        wrapperAction(range, createWarp(Encoded, hexResult));
      } else {
        const base64Result = base64Decoded();
        if (base64Result) {
          customContextualPopupPosition(popup, base64Result, rect);
        } else {
          return;
        }
      }

    });
  }

  function createWarp(Encoded, Decoded){
    const wrapper = document.createElement("div");
    wrapper.className = "pmtrung_hex_decoded";
    wrapper.textContent = Decoded;
    wrapper.setAttribute("old-data", Encoded);
    return wrapper;
  }

  function wrapperAction(SelectedText, Wrapper){
    SelectedText.deleteContents();
    SelectedText.insertNode(Wrapper);


    // Restore
    Wrapper.addEventListener("click", function restoreOriginal() {
      const parent = Wrapper.parentNode;
      const originalText = Wrapper.getAttribute("old-data");

      parent.replaceChild(document.createTextNode(originalText), Wrapper);

      Wrapper.removeEventListener("click", restoreOriginal);
    });
  }

  function contextualPopup(){
    const box = document.createElement("div");
    box.id = box.className = "pmtrung-decode-contextual-popup";
    return box;
  }

  function customContextualPopupPosition(box, decoded, client_rectangle){
    if (!box) {
      box = contextualPopup();
      PAGE_EVENTVIEWER.body.appendChild(box);
    }
    box.textContent = decoded;
    const boxRect = box.getBoundingClientRect();

    // căn giữa
    const centerX = client_rectangle.left + client_rectangle.width / 2;
    let top = window.scrollY + client_rectangle.top - boxRect.height - 8;
    // Quá TOP → đặt bottom
    if (top < 0) {
      top = window.scrollY + client_rectangle.bottom + 8;
    }
    box.style.top = top + "px";
    box.style.left = (window.scrollX + centerX) + "px";
    box.style.visibility = "visible";

    return true;
  }
  // -------------------------------------



  // -------------------------------------
  // Base64
  function base64DecodeAction(str) {
    const base64Pattern = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
    if (!base64Pattern.test(str)) return false;

    let buffer;
    try {
      buffer = Uint8Array.from(atob(str), c => c.charCodeAt(0));
    } catch {
      return false;
    }

    const isGarbageText = (text) => {
      // ASCII < 32 => rác binary
      // https://donsnotes.com/tech/charsets/ascii.html0
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(text)) return true;

      // https://unicode-explorer.com/b/4E00
      const cjkRegex = /[\u4E00-\u9FFF\uAC00-\uD7AF\u3000-\u30FF]/g;
      const cjkCount = (text.match(cjkRegex) || []).length;
      
      return (cjkCount / text.length > 0.3);
    };

    // UTF-16LE 
    try {
      if (!isBase64ValidUincode(buffer, "UTF-16")) throw 1;
      const utf16 = new TextDecoder("utf-16le", { fatal: true }).decode(buffer);
      
      if (!isGarbageText(utf16)) return utf16;

    } catch {
      console.log("Lỗi giải mã với mã hóa ký tự UTF-16! Kiểm tra UTF-8");
    }

    // UTF-8 strict 
    try {
      if (!isBase64ValidUincode(buffer, "UTF-8")) throw 1;
      const utf8 = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      
      if (!isGarbageText(utf8)) return utf8;
      
    } catch {
      console.log("Lỗi giải mã với mã hóa ký tự UTF-8! Không hỗ trợ loại Base64 này. Kết thúc giải mã.");
      showNotification("Lỗi giải mã Base64! ", false);
    }
    
    return false;
  }

  function isBase64ValidUincode(bytes, unicode) {
    switch(unicode){
      case "UTF-16":{
        // ===== Heuristic: Count NULL bytes to guess UTF-16LE =====
        const zeroCount = bytes.filter(b => b === 0).length;
        const zeroRatio = zeroCount / bytes.length;

        if (zeroRatio <= 0.25 && bytes.length % 2 != 0) return false;
        break;
      }

      case "UTF-8":{
        // Strict UTF-8 validation
        let i = 0;
        while (i < bytes.length) {
          const b = bytes[i];

          if (b <= 0x7F) { i++; continue; }

          let size =
            (b & 0xE0) === 0xC0 ? 2 :
            (b & 0xF0) === 0xE0 ? 3 :
            (b & 0xF8) === 0xF0 ? 4 : 0;

          if (size === 0 || i + size > bytes.length) return false;

          for (let j = 1; j < size; j++) {
            if ((bytes[i + j] & 0xC0) !== 0x80) return false;
          }
          i += size;
        }
        break;
      }
      
      default:
        console.log("Error");
        return false;
    }
    return true;
  }
  // -------------------------------------




  // -------------------------------------
  // Format Log
  function insertLogFormat() {
    const container = PAGE_EVENTVIEWER.querySelector("#GUID_6");
    if (!container) return;

    const pre = container.querySelector("pre");

    const formatIcon = createLogFormatIcon();
    if(!formatIcon) return;

    pre.parentNode.insertBefore(formatIcon, pre);

    formatIcon.addEventListener("click", (e) => {
      GhostAnimation(e.currentTarget);
      const oldData = formatIcon.getAttribute("old-data");

      if (!oldData) {
          const original = pre.textContent.trim();
          const result = logFormatAction(original);

          if (result) {
              formatIcon.setAttribute("old-data", original);
              pre.textContent = result;
          }
      } else {
          pre.textContent = oldData;
          formatIcon.removeAttribute("old-data");  
      }
    });
  }

  function createLogFormatIcon(){
    if(PAGE_EVENTVIEWER.querySelector("pmtrung-log-format")) return false;

    const wrapper = document.createElement("span");
    wrapper.className = "pmtrung-log-format";

    const img = document.createElement("img");
    img.src = totalLink.formatIcon.url;   
    img.alt = "format icon";
    img.className = "pmtrung-log-format-icon";

    const label = document.createElement("span");
    label.className = "pmtrung-log-format-label";
    label.textContent = "Format";

    wrapper.appendChild(img);
    wrapper.appendChild(label);

    return wrapper;
  }

  function logFormatAction(rawlog){
    switch (true) {
      case rawlog.includes("Microsoft-Windows-Security-Auditing"):
        return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/\s+(?=\w+=)/g, '\n').replace(/\s{2,}(?=[A-Z][\w]+(?: [^\s]+)*:)/g, '\n');

      case rawlog.includes("Microsoft-Windows-Sysmon/Operational"):
        return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/\s+(?=\w+=)/g, '\n').replace(/\s+(?=[A-Z][a-zA-Z0-9]{1,}:)/g, '\n').replace(/Hashes:\s+/, 'Hashes:\n\t').replace(/,(?=[A-Z0-9]+=)/g, '\n\t');
      
      case rawlog.includes("Windows PowerShell"):
        return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/\s+(?=\w+=)/g, '\n').replace(/\s+Details:\s*/, '\nDetails:\n');

      case rawlog.includes("audispd"):
        return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/(audispd\[\d+\]:)\s+/, '$1\n').replace(/\s+(?=\w+=)/g, '\n').replace(/\na0="(.*)"/g, '\nCommand: $1').replace(/\na\d+="(.*)"/g, ' $1').replace(/(msg=audit\(.*?\):)\s+/, '$1\n\t');

      case rawlog.includes("SymantecServer:"):
        return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/(SymantecServer:)\s*/, '$1\n').replace(/,\s*/g, '\n');

      case rawlog.includes('devname="FortiGate') || rawlog.includes('devid="FG'):
        return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/(<\d+>)\s*/, '$1\n').replace(/\s+(?=\w+=)/g, '\n');

      case rawlog.substring(0, 100).includes("nginx"):
        if (rawlog.includes("LEEF")) {
          return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/\s+(?=\w+=)/g, '\n').replace(/\|/g, '\n| ').replace(/ nginx: /, ' nginx:\n');
        } else {
          return rawlog.replace(/[\r\n\t]+/g, ' ').replace(/ (\[)/g, '\n$1').replace(/ (")/g, '\n$1').replace(/ (\d{1,3}(?:\.\d{1,3}){3}(?::\d+)? \- \-)/g, '\n$1');
        }

      default:
        showNotification("Chưa hỗ trợ format log này!", false);
        return false;
    }
  }

  function GhostAnimation(element) {
    const ghost = element.cloneNode(true);

    const rect = element.getBoundingClientRect();

    ghost.style.position = 'fixed';
    ghost.style.top = rect.top + 'px';
    ghost.style.left = rect.left + 'px';
    ghost.style.width = rect.width + 'px';
    ghost.style.height = rect.height + 'px';
    ghost.style.margin = 0; 
    
    ghost.classList.add('pmtrung-ghost-animating');

    PAGE_EVENTVIEWER.body.appendChild(ghost);

    setTimeout(() => {
        ghost.remove();
    }, 800);
  }
  // -------------------------------------

})();
