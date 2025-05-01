/*  ==============================
    CSS Inspector Pro – content.js
    新增：
    1. 「選取模式」(selectionMode) 切換
    2. 點擊頁面元素可選取 / 取消選取
    3. 選取後可即時編輯樣式並預覽，並可一鍵還原
    ============================== */
class CSSInspector {
  constructor() {
    /* ==== 狀態 ==== */
    this.isActive = false; // 檢查器總開關，預設關閉
    this.tooltip = null; // 提示視窗元素，稍後初始化時建立
    this.hoveredElement = null; // 滑鼠目前懸停下的元素
    this.isFixed = false; // Tooltip 是否固定位置
    this.isDragging = false; // 是否正在拖曳 Tooltip
    this.dragStartX = 0; // 拖曳起始的 X 座標
    this.dragStartY = 0; // 拖曳起始的 Y 座標
    this.lastMousePos = { x: 0, y: 0 }; // 最近一次滑鼠位置
    this.selectionMode = false; // 是否處於選取模式
    this.selectedEl = null; // 目前被選取的元素
    this.originalStyles = new WeakMap(); // 儲存編輯前的原始樣式以便還原
    this.currentLang =
      localStorage.getItem("css-inspector-language") || "zh-TW"; // 從 localStorage 讀取使用者語言設定，預設為繁體中文

    /* ==== 使用者偏好（預設）==== */
    this.showComputedStyles = true; // 是否顯示計算後樣式
    this.includeVendorPrefixes = false; // 是否包含廠商前綴屬性
    this.showPseudoElements = false; // 是否顯示偽元素樣式
    this.showPseudoExtras = false; // 是否顯示偽類 / @ 規則群組

    /* ==== Shadow DOM ==== */
    this.host = document.createElement("div"); // 建立 host 容器，用以掛載 Shadow DOM
    this.shadow = this.host.attachShadow({ mode: "open" }); // 建立 open 模式的 Shadow DOM
    document.documentElement.appendChild(this.host); // 將 host 加入頁面，以免影響原有樣式

    /* ==== 載入儲存偏好後初始化 ==== */
    chrome.storage.sync.get(
      {
        showComputedStyles: true,
        includeVendorPrefixes: false,
        showPseudoElements: false,
        showPseudoExtras: false,
      },
      (cfg) => {
        Object.assign(this, cfg);
        this.init();
      }
    );
  }

  /* ---------- 初始化 ---------- */
  async init() {
    await this.createTooltip(); // 建立 UI
    this.bindEvents(); // 綁定事件
    this.setupShortcuts(); // 快捷鍵
  }

  /* ---------- 建立提示框 ---------- */
  async createTooltip() {
    /* 1) 連結外部 CSS（output.css 由 Tailwind CLI 預先編譯） */
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = chrome.runtime.getURL("styles/output.css");
    this.shadow.appendChild(link);

    // /* 2) 注入自訂樣式 */
    // const style = document.createElement("style");
    // style.textContent = `
    //   .css-inspector-tooltip .vendor-css .property-name { color: #56b6c2; }
    //   .css-inspector-tooltip .special-css {
    //     background: rgba(250,204,21,.07);
    //     border-left: 2px solid #facc15;
    //     padding-left: 4px;
    //   }
    // `;
    // this.shadow.appendChild(style);

    /* 2) Tooltip DOM */
    this.tooltip = document.createElement("div");
    this.tooltip.className = "css-inspector-tooltip";
    this.tooltip.style.display = "none";
    this.tooltip.innerHTML = `
      <div class="tooltip-header flex justify-between items-center mb-2.5 pb-2 border-b border-[#333]" draggable="true">
        <span class="element-tag text-primary font-mono"></span>
        <div class="tooltip-controls flex items-center gap-1">
          <button class="reset-btn hidden" title="還原所有修改">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
          <button class="select-btn" title="切換選取模式 (Alt + S)">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer2-icon lucide-mouse-pointer-2"><path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/></svg>
          </button>
          <button class="pin-btn" title="固定視窗 (Alt + P)">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
          </button>
          <button class="copy-btn" title="複製 CSS (Alt + C)">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </button>
        </div>
      </div>
      <div class="tooltip-content">
        <div class="css-properties"></div>
      </div>
    `;
    this.shadow.appendChild(this.tooltip);

    /* 3) 快取常用節點 */
    this.$list = this.tooltip.querySelector(".css-properties");
    this.$tag = this.tooltip.querySelector(".element-tag");
    this.$reset = this.tooltip.querySelector(".reset-btn");
    this.$select = this.tooltip.querySelector(".select-btn");
    this.$pin = this.tooltip.querySelector(".pin-btn");
    this.$copy = this.tooltip.querySelector(".copy-btn");
  }

  /* ---------- 事件繫結 ---------- */
  bindEvents() {
    /* ===== 滑鼠移動、進出 ===== */
    document.addEventListener("mouseover", this.onMouseOver.bind(this));
    document.addEventListener("mouseout", this.onMouseOut.bind(this));
    document.addEventListener("mousemove", (e) => {
      this.lastMousePos = { x: e.pageX, y: e.pageY };
      this.updatePos(e);
    });

    /* ===== 點擊選取 / 取消選取 ===== */
    document.addEventListener("click", this.onClick.bind(this), true);

    /* ===== 拖曳 Tooltip ===== */
    const header = this.tooltip.querySelector(".tooltip-header");
    header.addEventListener("dragstart", this.onDragStart.bind(this));
    header.addEventListener("drag", this.onDrag.bind(this));
    header.addEventListener("dragend", this.onDragEnd.bind(this));

    /* ===== 控制按鈕 ===== */
    this.$copy.addEventListener("click", () => this.copyCSS());
    this.$pin.addEventListener("click", () => this.toggleFixed());
    this.$select.addEventListener("click", () => this.toggleSelectMode());
    this.$reset.addEventListener("click", () => this.resetStyles());
  }

  /* ---------- 快捷鍵 ---------- */
  setupShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (!e.altKey) return;
      switch (e.key.toLowerCase()) {
        case "c":
          this.copyCSS();
          break;
        case "h":
          this.toggleInspector();
          break;
        case "p":
          this.toggleFixed();
          break;
        case "s":
          this.toggleSelectMode();
          break;
      }
    });
  }

  /* ---------- 滑鼠進出 ---------- */
  onMouseOver(e) {
    if (!this.isActive || (this.selectionMode && this.selectedEl)) return;
    if (this.tooltip.contains(e.target)) return; // 滑鼠在 Shadow DOM 內，不處理

    this.hoverEl = e.target;
    this.renderElement(this.hoverEl);
    this.tooltip.style.display = "block";
    if (!this.isFixed) this.updatePos(e);

    /* inline highlight */
    this.hoverEl.style.outline = "2px dashed #81a5f9";
    this.hoverEl.style.outlineOffset = "2px";
  }
  onMouseOut(e) {
    if (!this.isActive || (this.selectionMode && this.selectedEl)) return;
    if (this.tooltip.contains(e.relatedTarget)) return;

    if (this.hoverEl) this.hoverEl.style.outline = "";
    if (!this.isFixed) this.tooltip.style.display = "none";
  }

  /* ---------- 點擊選取 ---------- */
  onClick(e) {
    if (!this.isActive || !this.selectionMode) return;
    if (this.host.contains(e.target)) return; // 點到 Tooltip

    e.preventDefault();
    e.stopPropagation();
    this.selectedEl === e.target ? this.deselect() : this.select(e.target);
  }

  select(el) {
    this.deselect(); // 先取消先前選取
    this.selectedEl = el;
    el.style.outline = "2px dashed #f472b6";
    el.style.outlineOffset = "2px";
    this.renderElement(el);
    this.tooltip.style.display = "block";
    this.$reset.classList.remove("hidden");
  }
  deselect() {
    if (!this.selectedEl) return;
    this.selectedEl.style.outline = "";
    this.selectedEl = null;
    this.$reset.classList.add("hidden");
    // 若仍在 hover 狀態，恢復 hover 畫面；否則關閉 Tooltip
    this.hoverEl
      ? this.renderElement(this.hoverEl)
      : (this.tooltip.style.display = "none");
  }

  /* ---------- 拖曳 ---------- */
  onDragStart(e) {
    if (!this.isFixed) return;
    this.isDragging = true;
    const rect = this.tooltip.getBoundingClientRect();
    this.dragStartX = e.clientX - rect.left;
    this.dragStartY = e.clientY - rect.top;
    const dummy = document.createElement("div");
    dummy.style.opacity = "0";
    document.body.appendChild(dummy);
    e.dataTransfer.setDragImage(dummy, 0, 0);
    setTimeout(() => dummy.remove(), 0);
  }
  onDrag(e) {
    if (!this.isFixed || !this.isDragging || !e.clientX) return;
    this.tooltip.style.left = `${e.clientX - this.dragStartX}px`;
    this.tooltip.style.top = `${e.clientY - this.dragStartY}px`;
  }
  onDragEnd() {
    this.isDragging = false;
  }

  /* ---------- 取得樣式 ---------- */
  getStyles(el) {
    const keep = {};
    const commonProperties = [
      "display",
      "position",
      "width",
      "height",
      "margin",
      "padding",
      "border",
      "background",
      "color",
      "font-family",
      "font-size",
      "font-weight",
      "line-height",
      "flex",
      "grid",
      "transform",
    ];

    const pushIfValid = (prop, val) => {
      if (!val) return;
      if (!this.includeVendorPrefixes && prop.startsWith("-")) return;
      if (val === "normal" || val === "none" || val === "initial" || val === "")
        return;
      if (!commonProperties.includes(prop)) return;
      keep[prop] = val.trim();
    };

    const c = getComputedStyle(el);
    for (const prop of c) {
      const val = this.showComputedStyles
        ? c.getPropertyValue(prop) // 計算後樣式
        : el.style[prop] || c.getPropertyValue(prop); // 行內樣式 > 計算後樣式
      pushIfValid(prop, val);
    }

    /* 偽元素 */
    if (this.showPseudoElements) {
      const pseudoElements = {};
      ["::before", "::after", "::marker", "::placeholder"].forEach((pseudo) => {
        const ps = getComputedStyle(el, pseudo);
        if (!ps) return;

        //     // 先確認 pseudo 真的被繪製
        const contentVal = ps
          .getPropertyValue("content")
          .replace(/["']/g, "")
          .trim();
        const isRenderable =
          contentVal !== "none" &&
          contentVal !== "normal" &&
          ps.getPropertyValue("content").length >= 2;
        // ::marker / ::placeholder 沒有 content 屬性可判斷，另外處理
        if (
          (!isRenderable && (pseudo === "::before" || pseudo === "::after")) ||
          (pseudo === "::marker" &&
            (ps.getPropertyValue("display") !== "list-item" ||
              ps.getPropertyValue("list-style-type") === "none")) ||
          (pseudo === "::placeholder" && !el.hasAttribute("placeholder"))
        ) {
          return; // 直接跳過，表示該偽元素不存在
        }

        // 檢查是否有任何樣式
        if (Object.keys(ps).length > 0) {
          const styles = {};
          // 收集所有樣式
          for (const prop of ps) {
            const val = ps.getPropertyValue(prop);
            if (
              val &&
              val !== "none" &&
              val !== "normal" &&
              val !== "initial" &&
              val !== ""
            ) {
              // 如果開啟常用屬性過濾，則只顯示常用屬性
              if (commonProperties.includes(prop)) {
                styles[prop] = val.trim();
              }
            }
          }
          // 如果有樣式，則加入偽元素集合
          if (Object.keys(styles).length > 0) {
            pseudoElements[pseudo] = styles;
          }
        }
      });

      // 如果有任何偽元素樣式，則加入主樣式集合
      if (Object.keys(pseudoElements).length > 0) {
        keep["pseudo-elements"] = pseudoElements;
      }
    }

    return keep;
  }

  /* ---------- 呈現元素 CSS ---------- */
  renderElement(el) {
    const styles = this.getStyles(el);

    /* 標題 */
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = [...el.classList].join(".");
    this.$tag.textContent = `${tag}${id}${cls ? "." + cls : ""}`;

    /* 屬性 */
    this.$list.innerHTML = "";
    Object.entries(styles).forEach(([prop, val]) => {
      // 處理偽元素
      if (prop === "pseudo-elements") {
        const pseudoContainer = document.createElement("div");
        pseudoContainer.className =
          "pseudo-elements-container my-3 border-l-2 border-[#c678dd] pl-3";

        // 偽元素標題
        const pseudoTitle = document.createElement("div");
        pseudoTitle.className = "flex items-center gap-2 mb-2";
        pseudoTitle.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#c678dd]">
            <path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/>
          </svg>
          <span class="text-[#c678dd] font-medium" data-i18n="pseudoElements">Pseudo-elements</span>
        `;
        pseudoContainer.appendChild(pseudoTitle);

        Object.entries(val).forEach(([pseudo, styles]) => {
          const pseudoSection = document.createElement("div");
          pseudoSection.className =
            "pseudo-section bg-[#2c2c2c] rounded p-2 mb-2";

          // 偽元素標籤
          const pseudoLabel = document.createElement("div");
          pseudoLabel.className = "flex items-center gap-2 mb-2";
          pseudoLabel.innerHTML = `
            <span class="text-[#81a5f9] font-mono text-sm">${pseudo}</span>
            <div class="flex-1 h-px bg-[#444]"></div>
          `;
          pseudoSection.appendChild(pseudoLabel);

          // 樣式列表
          const stylesList = document.createElement("div");
          stylesList.className = "pl-2";

          Object.entries(styles).forEach(([styleProp, styleVal]) => {
            const row = document.createElement("div");
            row.className = "css-property my-1 font-mono flex text-sm";
            row.innerHTML = `
              <span class="property-name mr-1 text-[#e06c75]">${styleProp}:</span>
              <span class="property-value flex-1 text-[#98c379]">${styleVal}</span>`;
            stylesList.appendChild(row);
          });

          pseudoSection.appendChild(stylesList);
          pseudoContainer.appendChild(pseudoSection);
        });

        this.$list.appendChild(pseudoContainer);
        return;
      }

      // 處理一般樣式
      const row = document.createElement("div");
      row.className = "css-property my-1 font-mono flex";
      if (prop.startsWith("-")) row.classList.add("vendor-css");

      row.innerHTML = `
        <span class="property-name mr-1 text-[#e06c75]">${prop}:</span>
        <span class="property-value flex-1 text-[#98c379] ${
          this.selectionMode && this.selectedEl ? "cursor-text" : ""
        }" ${
        this.selectionMode && this.selectedEl ? "contenteditable" : ""
      }>${val}</span>`;

      if (this.selectionMode && this.selectedEl) {
        const valueEl = row.querySelector(".property-value");
        valueEl.addEventListener("input", () => {
          if (!this.originalStyles.has(el)) this.originalStyles.set(el, {});
          const orig = this.originalStyles.get(el);
          if (!(prop in orig)) orig[prop] = el.style[prop] || "";
          el.style[prop] = valueEl.textContent.trim();
          this.$reset.classList.remove("hidden");
        });
      }
      this.$list.appendChild(row);
    });
  }

  /* ---------- 還原樣式 ---------- */
  resetStyles() {
    if (!this.selectedEl) return;
    const orig = this.originalStyles.get(this.selectedEl) || {};
    for (const [p, v] of Object.entries(orig))
      v
        ? (this.selectedEl.style[p] = v)
        : this.selectedEl.style.removeProperty(p);
    this.originalStyles.delete(this.selectedEl);
    this.renderElement(this.selectedEl);
    this.$reset.classList.add("hidden");
  }

  /* ---------- Tooltip 位置 ---------- */
  updatePos(e) {
    if (
      !this.isActive ||
      this.isFixed ||
      this.tooltip.style.display !== "block"
    )
      return;
    const off = 10,
      rect = this.tooltip.getBoundingClientRect();
    let x = e.pageX + off,
      y = e.pageY + off;
    if (x + rect.width > innerWidth) x = e.pageX - rect.width - off;
    if (y + rect.height > innerHeight) y = e.pageY - rect.height - off;
    this.tooltip.style.left = x + "px";
    this.tooltip.style.top = y + "px";
  }

  /* ---------- 複製 CSS ---------- */
  copyCSS() {
    const el = this.selectedEl || this.hoverEl;
    if (!el) return;
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : "";
    const cls = [...el.classList].join(".");
    const sel = `${tag}${id}${cls ? "." + cls : ""}`;
    const css = `${sel} {\n${Object.entries(this.getStyles(el))
      .filter(([k]) => k !== "pseudo-elements")
      .map(([p, v]) => `  ${p}: ${v};`)
      .join("\n")}\n}`;

    // 如果有偽元素，則在後面加上偽元素的樣式
    const pseudoElements = this.getStyles(el)["pseudo-elements"];
    if (pseudoElements) {
      Object.entries(pseudoElements).forEach(([pseudo, styles]) => {
        css += `\n${sel}${pseudo} {\n${Object.entries(styles)
          .map(([p, v]) => `  ${p}: ${v};`)
          .join("\n")}\n}`;
      });
    }
    navigator.clipboard.writeText(css).then(() => this.showToast());
  }
  showToast() {
    const note = document.createElement("div");
    note.className = "css-inspector-toast";
    note.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        <span>${
          this.currentLang === "zh-TW" ? "CSS 已複製到剪貼簿" : "CSS copied"
        }</span>
      </div>
    `;

    Object.assign(note.style, {
      position: "fixed",
      bottom: "1.25rem",
      right: "1.25rem",
      background: "#1e1e1e",
      color: "#98c379",
      padding: "0.75rem 1rem",
      borderRadius: "0.5rem",
      fontSize: "0.875rem",
      zIndex: 2147483647,
      opacity: "0",
      transform: "translateY(1rem)",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow:
        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      border: "1px solid #333",
    });

    document.body.appendChild(note);

    requestAnimationFrame(() => {
      note.style.opacity = "1";
      note.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      note.style.opacity = "0";
      note.style.transform = "translateY(1rem)";
      setTimeout(() => note.remove(), 300);
    }, 2000);
  }

  /* ---------- 開關 / 模式 ---------- */
  toggleInspector() {
    this.isActive ? this.deactivate() : this.activate();
    chrome.storage.sync.set({ inspectorActive: this.isActive });
  }
  activate() {
    this.isActive = true;
    this.tooltip.style.display = "block";
    this.updatePos({ pageX: this.lastMousePos.x, pageY: this.lastMousePos.y });
  }
  deactivate() {
    this.isActive = false;
    this.tooltip.style.display = "none";
    this.deselect();
    if (this.hoverEl) this.hoverEl.style.outline = "";
  }

  toggleFixed() {
    this.isFixed = !this.isFixed;
    this.$pin.classList.toggle("active", this.isFixed);
    if (this.isFixed) {
      const r = this.tooltip.getBoundingClientRect();
      this.tooltip.style.left = r.left + "px";
      this.tooltip.style.top = r.top + "px";
    }
  }
  toggleSelectMode() {
    this.selectionMode = !this.selectionMode;
    chrome.storage.sync.set({ selectModeActive: this.selectionMode });
    this.$select.classList.toggle("active", this.selectionMode);
    if (!this.selectionMode) this.deselect();
  }

  /* ---------- 收訊息 ---------- */
  onMessage(msg) {
    if (msg.action === "toggleInspector")
      msg.isActive ? this.activate() : this.deactivate();
    if (msg.action === "toggleSelectMode") {
      this.selectionMode = msg.isActive;
      if (!msg.isActive) this.deselect();
    }
    if (msg.action === "updateLanguage") {
      this.currentLang = msg.language;
      this.renderElement(this.selectedEl || this.hoverEl);
    }
    if (msg.action === "updateSetting") {
      this[msg.setting] = msg.value;
      chrome.storage.sync.set({ [msg.setting]: msg.value });
      this.renderElement(this.selectedEl || this.hoverEl);
    }
  }
}

/* ===== 初始化 ===== */
const inspector = new CSSInspector();
chrome.runtime.onMessage.addListener((msg) => inspector.onMessage(msg));
