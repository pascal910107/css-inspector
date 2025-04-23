/*  ==============================
    CSS Inspector Pro – content.js
    新增：
    1. 「選取模式」(selectionMode) 切換
    2. 點擊頁面元素可選取 / 取消選取
    3. 選取後可即時編輯樣式並預覽，並可一鍵還原
    ============================== */
class CSSInspector {
  constructor() {
    /* ===== 先前就有的狀態 ===== */
    this.isActive = false; // 檢查器總開關
    this.tooltip = null; // 提示視窗
    this.hoveredElement = null; // 滑鼠下的元素
    this.isFixed = false; // 視窗是否固定
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastMousePosition = { x: 0, y: 0 };

    /* ===== 新增狀態 ===== */
    this.selectionMode = false; // 是否進入「選取模式」
    this.selectedElement = null; // 目前被選取的元素
    this.originalStyles = new WeakMap(); // 儲存編輯前的原始樣式以便還原
    this.currentLanguage =
      localStorage.getItem("css-inspector-language") || "zh-TW";

    this.init();
  }

  /* ---------- 初始化 ---------- */
  init() {
    this.createTooltip();
    this.bindEvents();
    this.setupKeyboardShortcuts();
  }

  /* ---------- 建立提示框 ---------- */
  createTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.className = "css-inspector-tooltip";
    this.tooltip.style.display = "none";
    this.tooltip.innerHTML = `
          <div class="tooltip-header" draggable="true">
            <span class="element-tag"></span>
            <div class="tooltip-controls flex items-center gap-1">
              <button class="reset-button" style="display:none;" title="還原所有修改">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw-icon lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              </button>
              <button class="select-mode-button" title="切換選取模式 (Alt + S)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mouse-pointer2-icon lucide-mouse-pointer-2"><path d="M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z"/></svg>
              </button>
              <button class="pin-button" title="固定視窗 (Alt + P)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pin-icon lucide-pin"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>
              </button>
              <button class="copy-button" title="複製 CSS (Alt + C)">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy-icon lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
          </div>
          <div class="tooltip-content">
            <div class="css-properties"></div>
          </div>
        `;
    document.body.appendChild(this.tooltip);
  }

  /* ---------- 事件繫結 ---------- */
  bindEvents() {
    /* ===== 滑鼠移動、進出 ===== */
    document.addEventListener("mouseover", this.handleMouseOver.bind(this));
    document.addEventListener("mouseout", this.handleMouseOut.bind(this));
    document.addEventListener("mousemove", (e) => {
      this.lastMousePosition = { x: e.pageX, y: e.pageY };
      this.updateTooltipPosition(e);
    });

    /* ===== 點擊選取 / 取消選取 ===== */
    document.addEventListener("click", this.handleClick.bind(this), true);

    /* ===== 拖曳視窗 ===== */
    const header = this.tooltip.querySelector(".tooltip-header");
    header.addEventListener("dragstart", this.handleDragStart.bind(this));
    header.addEventListener("drag", this.handleDrag.bind(this));
    header.addEventListener("dragend", this.handleDragEnd.bind(this));

    /* ===== 控制按鈕 ===== */
    this.tooltip
      .querySelector(".copy-button")
      .addEventListener("click", () => this.copyCSS());

    this.tooltip
      .querySelector(".pin-button")
      .addEventListener("click", () => this.toggleFixed());

    this.tooltip
      .querySelector(".select-mode-button")
      .addEventListener("click", () => this.toggleSelectionMode());

    this.tooltip
      .querySelector(".reset-button")
      .addEventListener("click", () => this.resetStyles());
  }

  /* ---------- 快捷鍵 ---------- */
  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key === "c") this.copyCSS();
      else if (e.altKey && e.key === "h") this.toggleInspector();
      else if (e.altKey && e.key === "p") this.toggleFixed();
      else if (e.altKey && e.key === "s") this.toggleSelectionMode();
    });
  }

  /* ---------- 拖曳處理 ---------- */
  handleDragStart(e) {
    if (!this.isFixed) return;
    this.isDragging = true;
    const rect = this.tooltip.getBoundingClientRect();
    this.dragStartX = e.clientX - rect.left;
    this.dragStartY = e.clientY - rect.top;

    const img = document.createElement("div");
    img.style.opacity = "0";
    document.body.appendChild(img);
    e.dataTransfer.setDragImage(img, 0, 0);
    setTimeout(() => img.remove(), 0);
  }
  handleDrag(e) {
    if (!this.isFixed || !this.isDragging || !e.clientX) return;
    this.tooltip.style.left = `${e.clientX - this.dragStartX}px`;
    this.tooltip.style.top = `${e.clientY - this.dragStartY}px`;
  }
  handleDragEnd() {
    this.isDragging = false;
  }

  /* ---------- 固定提示框 ---------- */
  toggleFixed() {
    this.isFixed = !this.isFixed;
    this.tooltip.classList.toggle("fixed");
    this.tooltip.querySelector(".pin-button").classList.toggle("active");
  }

  /* ---------- 滑鼠進出 ---------- */
  handleMouseOver(e) {
    if (!this.isActive || (this.selectionMode && this.selectedElement)) return;

    // 如果滑鼠在工具視窗內，不處理
    if (this.tooltip.contains(e.target)) return;

    this.hoveredElement = e.target;
    if (this.hoveredElement === this.tooltip) return;

    this.renderElement(this.hoveredElement);
    this.tooltip.style.display = "block";
    if (!this.isFixed) this.updateTooltipPosition(e);

    this.hoveredElement.classList.add("css-inspector-highlight");
  }

  handleMouseOut(e) {
    if (!this.isActive || (this.selectionMode && this.selectedElement)) return;

    // 如果滑鼠移動到工具視窗內，不處理
    if (this.tooltip.contains(e.relatedTarget)) return;

    if (this.hoveredElement)
      this.hoveredElement.classList.remove("css-inspector-highlight");

    if (!this.isFixed && !this.tooltip.contains(e.relatedTarget))
      this.tooltip.style.display = "none";
  }

  /* ---------- 點擊選取 / 取消 ---------- */
  handleClick(e) {
    if (!this.isActive || !this.selectionMode) return;

    // 點到提示框本身不處理
    if (e.target === this.tooltip || this.tooltip.contains(e.target)) return;

    e.preventDefault();
    e.stopPropagation();

    if (this.selectedElement === e.target) this.deselectElement();
    else this.selectElement(e.target);
  }

  selectElement(el) {
    this.deselectElement(); // 先取消先前選取
    this.selectedElement = el;
    el.classList.add("css-inspector-highlight");
    this.renderElement(el);
    this.tooltip.style.display = "block";
    this.tooltip.querySelector(".reset-button").style.display = "inline-flex";
  }

  deselectElement() {
    if (!this.selectedElement) return;
    this.selectedElement.classList.remove("css-inspector-highlight");
    this.selectedElement = null;
    this.tooltip.querySelector(".reset-button").style.display = "none";
    // 若仍在 hover 狀態，恢復 hover 畫面；否則關閉視窗
    if (this.hoveredElement) this.renderElement(this.hoveredElement);
    else this.tooltip.style.display = "none";
  }

  /* ---------- 呈現元素 CSS ---------- */
  renderElement(element) {
    const styles = this.getElementStyles(element);
    this.updateTooltipContent(element, styles);
  }

  getElementStyles(element) {
    const computedStyle = window.getComputedStyle(element);
    const styles = {};
    const importantProperties = [
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
    importantProperties.forEach((prop) => {
      const v = computedStyle.getPropertyValue(prop);
      if (v && v !== "none" && v !== "normal") styles[prop] = v.trim();
    });
    return styles;
  }

  updateTooltipContent(element, styles) {
    /* ----- 標題（元素選擇器） ----- */
    const tag = element.tagName.toLowerCase();
    const idSel = element.id ? `#${element.id}` : "";
    const cls = Array.from(element.classList).join(".");
    this.tooltip.querySelector(".element-tag").textContent = `${tag}${idSel}${
      cls ? "." + cls : ""
    }`;

    /* ----- 屬性列表 ----- */
    const list = this.tooltip.querySelector(".css-properties");
    list.innerHTML = "";
    Object.entries(styles).forEach(([prop, val]) => {
      const row = document.createElement("div");
      row.className = "css-property";
      row.innerHTML = `
            <span class="property-name">${prop}:</span>
            <span class="property-value"${
              this.selectionMode && this.selectedElement
                ? " contenteditable"
                : ""
            }>${val}</span>
          `;
      if (this.selectionMode && this.selectedElement) {
        const valueEl = row.querySelector(".property-value");
        // 每次編輯即時套用
        valueEl.addEventListener("input", () => {
          // 儲存原始值
          if (!this.originalStyles.has(element))
            this.originalStyles.set(element, {});
          const orig = this.originalStyles.get(element);
          if (!(prop in orig)) orig[prop] = element.style[prop] || "";
          element.style[prop] = valueEl.textContent.trim();
          this.tooltip.querySelector(".reset-button").style.display =
            "inline-flex";
        });
      }
      list.appendChild(row);
    });
  }

  /* ---------- 還原樣式 ---------- */
  resetStyles() {
    if (!this.selectedElement) return;
    const orig = this.originalStyles.get(this.selectedElement) || {};
    Object.entries(orig).forEach(([prop, val]) => {
      if (val) this.selectedElement.style[prop] = val;
      else this.selectedElement.style.removeProperty(prop);
    });
    this.originalStyles.delete(this.selectedElement);
    this.renderElement(this.selectedElement);
    this.tooltip.querySelector(".reset-button").style.display = "none";
  }

  /* ---------- 視窗位置 ---------- */
  updateTooltipPosition(e) {
    if (
      !this.isActive ||
      this.isFixed ||
      this.tooltip.style.display !== "block"
    )
      return;
    const offset = 10;
    const rect = this.tooltip.getBoundingClientRect();
    let x = e.pageX + offset;
    let y = e.pageY + offset;
    if (x + rect.width > window.innerWidth) x = e.pageX - rect.width - offset;
    if (y + rect.height > window.innerHeight)
      y = e.pageY - rect.height - offset;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  /* ---------- 複製 CSS ---------- */
  copyCSS() {
    const el = this.selectedElement || this.hoveredElement;
    if (!el) return;

    const cssText = Object.entries(this.getElementStyles(el))
      .map(([p, v]) => `${p}: ${v};`)
      .join("\n");

    navigator.clipboard
      .writeText(cssText)
      .then(() => this.showCopyNotification());
  }

  showCopyNotification() {
    const note = document.createElement("div");
    note.className = "css-inspector-notification";
    note.textContent =
      this.currentLanguage === "zh-TW"
        ? "CSS 已複製到剪貼簿"
        : "CSS copied to clipboard";
    document.body.appendChild(note);
    setTimeout(() => note.remove(), 2000);
  }

  /* ---------- 快捷鍵呼叫 ---------- */
  toggleInspector() {
    this.isActive = !this.isActive;
    if (!this.isActive) {
      this.tooltip.style.display = "none";
      this.deselectElement();
      if (this.hoveredElement)
        this.hoveredElement.classList.remove("css-inspector-highlight");
    } else {
      this.tooltip.style.display = "block";
      this.updateTooltipPosition({
        pageX: this.lastMousePosition.x,
        pageY: this.lastMousePosition.y,
      });
      const element = document.elementFromPoint(
        this.lastMousePosition.x,
        this.lastMousePosition.y
      );
      if (element && element !== this.tooltip) {
        this.hoveredElement = element;
        this.renderElement(element);
        element.classList.add("css-inspector-highlight");
      }
    }
  }

  /* ---------- 收訊息 ---------- */
  handleRuntimeMessage(message) {
    if (message.action === "toggleInspector") {
      this.isActive = message.isActive;
      if (!message.isActive) {
        this.tooltip.style.display = "none";
        this.deselectElement();
        if (this.hoveredElement)
          this.hoveredElement.classList.remove("css-inspector-highlight");
      }
    } else if (message.action === "toggleSelectMode") {
      this.selectionMode = message.isActive;
      if (!this.selectionMode) this.deselectElement();
    } else if (message.action === "updateLanguage") {
      this.currentLanguage = message.language;
      this.updateTooltipContent(this.selectedElement || this.hoveredElement);
    }
  }

  toggleSelectionMode() {
    this.selectionMode = !this.selectionMode;
    const button = this.tooltip.querySelector(".select-mode-button");
    button.classList.toggle("active", this.selectionMode);
    if (!this.selectionMode) this.deselectElement();
  }
}

/* ===== 初始化 ===== */
const inspector = new CSSInspector();
chrome.runtime.onMessage.addListener((msg) =>
  inspector.handleRuntimeMessage(msg)
);
