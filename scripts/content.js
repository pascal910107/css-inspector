class CSSInspector {
  constructor() {
    this.isActive = false;
    this.tooltip = null;
    this.hoveredElement = null;
    this.isFixed = false;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.lastMousePosition = { x: 0, y: 0 };
    this.init();
  }

  init() {
    this.createTooltip();
    this.bindEvents();
    this.setupKeyboardShortcuts();
  }

  createTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.className = "css-inspector-tooltip";
    this.tooltip.style.display = "none";
    this.tooltip.innerHTML = `
      <div class="tooltip-header" draggable="true">
        <span class="element-tag"></span>
        <div class="tooltip-controls" style="display: flex; align-items: center; gap: 4px;">
          <button class="pin-button" title="固定視窗 (Alt + P)">📌</button>
          <button class="copy-button">複製 CSS</button>
        </div>
      </div>
      <div class="tooltip-content">
        <div class="css-properties"></div>
      </div>
    `;
    document.body.appendChild(this.tooltip);
  }

  bindEvents() {
    document.addEventListener("mouseover", this.handleMouseOver.bind(this));
    document.addEventListener("mouseout", this.handleMouseOut.bind(this));
    document.addEventListener("mousemove", (e) => {
      this.lastMousePosition = { x: e.pageX, y: e.pageY };
      this.updateTooltipPosition(e);
    });

    const header = this.tooltip.querySelector(".tooltip-header");
    header.addEventListener("dragstart", this.handleDragStart.bind(this));
    header.addEventListener("drag", this.handleDrag.bind(this));
    header.addEventListener("dragend", this.handleDragEnd.bind(this));

    this.tooltip.querySelector(".copy-button").addEventListener("click", () => {
      this.copyCSS();
    });

    this.tooltip.querySelector(".pin-button").addEventListener("click", () => {
      this.toggleFixed();
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.altKey && e.key === "c") {
        this.copyCSS();
      } else if (e.altKey && e.key === "h") {
        this.toggleInspector();
      } else if (e.altKey && e.key === "p") {
        this.toggleFixed();
      }
    });
  }

  handleDragStart(e) {
    if (!this.isFixed) return;

    this.isDragging = true;
    const rect = this.tooltip.getBoundingClientRect();
    this.dragStartX = e.clientX - rect.left;
    this.dragStartY = e.clientY - rect.top;

    // 創建透明的拖曳圖像
    const dragImage = document.createElement("div");
    dragImage.style.opacity = "0";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }

  handleDrag(e) {
    if (!this.isFixed || !this.isDragging || !e.clientX) return;

    const x = e.clientX - this.dragStartX;
    const y = e.clientY - this.dragStartY;

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  handleDragEnd(e) {
    if (!this.isFixed) return;
    this.isDragging = false;
  }

  toggleFixed() {
    this.isFixed = !this.isFixed;
    this.tooltip.classList.toggle("fixed");
    this.tooltip.querySelector(".pin-button").classList.toggle("active");
  }

  handleMouseOver(e) {
    if (!this.isActive) return;

    this.hoveredElement = e.target;
    if (this.hoveredElement === this.tooltip) return;

    const styles = this.getElementStyles(this.hoveredElement);
    this.updateTooltipContent(styles);
    this.tooltip.style.display = "block";
    if (!this.isFixed) {
      this.updateTooltipPosition(e);
    }

    this.hoveredElement.classList.add("css-inspector-highlight");
  }

  handleMouseOut(e) {
    if (!this.isActive) return;

    if (this.hoveredElement) {
      this.hoveredElement.classList.remove("css-inspector-highlight");
    }

    if (!this.isFixed && !this.tooltip.contains(e.relatedTarget)) {
      this.tooltip.style.display = "none";
    }
  }

  updateTooltipPosition(e) {
    if (
      !this.isActive ||
      this.isFixed ||
      this.tooltip.style.display !== "block"
    )
      return;

    const offset = 10;
    const tooltipRect = this.tooltip.getBoundingClientRect();
    let x = e.pageX + offset;
    let y = e.pageY + offset;

    // 確保提示框不會超出視窗範圍
    if (x + tooltipRect.width > window.innerWidth) {
      x = e.pageX - tooltipRect.width - offset;
    }
    if (y + tooltipRect.height > window.innerHeight) {
      y = e.pageY - tooltipRect.height - offset;
    }

    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  getElementStyles(element) {
    const computedStyle = window.getComputedStyle(element);
    const styles = {};

    // 收集重要的 CSS 屬性
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
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== "none" && value !== "normal") {
        styles[prop] = value;
      }
    });

    return styles;
  }

  updateTooltipContent(styles) {
    const elementTag = this.hoveredElement.tagName.toLowerCase();
    const elementClasses = Array.from(this.hoveredElement.classList).join(".");
    const elementId = this.hoveredElement.id
      ? `#${this.hoveredElement.id}`
      : "";

    const elementSelector = `${elementTag}${elementId}${
      elementClasses ? `.${elementClasses}` : ""
    }`;
    this.tooltip.querySelector(".element-tag").textContent = elementSelector;

    const propertiesContainer = this.tooltip.querySelector(".css-properties");
    propertiesContainer.innerHTML = "";

    Object.entries(styles).forEach(([property, value]) => {
      const propertyElement = document.createElement("div");
      propertyElement.className = "css-property";
      propertyElement.innerHTML = `
        <span class="property-name">${property}:</span>
        <span class="property-value">${value}</span>
      `;
      propertiesContainer.appendChild(propertyElement);
    });
  }

  copyCSS() {
    if (!this.hoveredElement) return;

    const styles = this.getElementStyles(this.hoveredElement);
    const cssText = Object.entries(styles)
      .map(([property, value]) => `${property}: ${value};`)
      .join("\n");

    navigator.clipboard.writeText(cssText).then(() => {
      this.showCopyNotification();
    });
  }

  showCopyNotification() {
    const notification = document.createElement("div");
    notification.className = "css-inspector-notification";
    notification.textContent = "CSS 已複製到剪貼簿";
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.remove();
    }, 2000);
  }

  toggleInspector() {
    this.isActive = !this.isActive;
    if (!this.isActive) {
      this.tooltip.style.display = "none";
      if (this.hoveredElement) {
        this.hoveredElement.classList.remove("css-inspector-highlight");
      }
    } else {
      this.tooltip.style.display = "block";
      // 使用最後記錄的滑鼠位置來更新視窗位置
      this.updateTooltipPosition({
        pageX: this.lastMousePosition.x,
        pageY: this.lastMousePosition.y,
      });

      // 獲取當前滑鼠位置的元素
      const element = document.elementFromPoint(
        this.lastMousePosition.x,
        this.lastMousePosition.y
      );
      if (element && element !== this.tooltip) {
        this.hoveredElement = element;
        const styles = this.getElementStyles(element);
        this.updateTooltipContent(styles);
        element.classList.add("css-inspector-highlight");
      }
    }
  }
}

// 初始化檢查器
const inspector = new CSSInspector();

// 監聽來自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggleInspector") {
    inspector.isActive = message.isActive;
    if (!message.isActive) {
      inspector.tooltip.style.display = "none";
      if (inspector.hoveredElement) {
        inspector.hoveredElement.classList.remove("css-inspector-highlight");
      }
    }
  }
});
