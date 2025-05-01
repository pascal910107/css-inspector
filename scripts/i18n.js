const translations = {
  "zh-TW": {
    title: "CSS Inspector Pro",
    enableInspector: "啟用檢查器",
    selectionMode: "選取模式",
    chinese: "中文",
    english: "English",
    shortcuts: "快捷鍵",
    copyCSS: "複製 CSS",
    toggleInspector: "切換檢查器",
    togglePin: "固定/解除固定視窗",
    toggleSelection: "切換選取模式",
    settings: "設定",
    showComputedStyles: "顯示計算後的樣式",
    showComputedStylesExample: "例如：'2em' 會顯示為 '32px'",
    includeVendorPrefixes: "包含瀏覽器前綴",
    includeVendorPrefixesExample: "例如：'-webkit-transform'",
    showPseudoElements: "顯示偽元素",
    showPseudoElementsExample: "例如：'::before'",
    showPseudoClasses: "顯示偽類 / 規則",
    showPseudoClassesExample: "例如：':hover'",
    tips: "提示",
    tipDrag: "固定視窗後可以拖曳標題列移動位置",
    tipDoubleClick: "雙擊複製按鈕可複製選擇器",
    pseudoElements: "偽元素",
  },
  en: {
    title: "CSS Inspector Pro",
    enableInspector: "Enable Inspector",
    selectionMode: "Selection Mode",
    chinese: "中文",
    english: "English",
    shortcuts: "Shortcuts",
    copyCSS: "Copy CSS",
    toggleInspector: "Toggle Inspector",
    togglePin: "Pin/Unpin Window",
    toggleSelection: "Toggle Selection Mode",
    settings: "Settings",
    showComputedStyles: "Show Computed Styles",
    showComputedStylesExample: "Example: '2em' will show as '32px'",
    includeVendorPrefixes: "Include Vendor Prefixes",
    includeVendorPrefixesExample: "Example: '-webkit-transform'",
    showPseudoElements: "Show Pseudo-elements",
    showPseudoElementsExample: "Example: '::before'",
    showPseudoClasses: "Show Pseudo-classes / Rules",
    showPseudoClassesExample: "Example: ':hover'",
    tips: "Tips",
    tipDrag: "Drag the title bar to move the window when pinned",
    tipDoubleClick: "Double-click the copy button to copy the selector",
    pseudoElements: "Pseudo-elements",
  },
};

function updateLanguage(lang) {
  // 更新所有帶有 data-i18n 屬性的元素
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    if (translations[lang] && translations[lang][key]) {
      element.textContent = translations[lang][key];
    }
  });

  // 更新所有帶有 data-i18n-title 屬性的元素
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    const key = element.getAttribute("data-i18n-title");
    if (translations[lang] && translations[lang][key]) {
      element.title = translations[lang][key];
    }
  });

  // 保存語言選擇到 localStorage
  localStorage.setItem("css-inspector-language", lang);
}

// 初始化語言
document.addEventListener("DOMContentLoaded", () => {
  const languageSelect = document.getElementById("languageSelect");
  const savedLanguage =
    localStorage.getItem("css-inspector-language") || "zh-TW";

  // 設置選擇器的值
  languageSelect.value = savedLanguage;

  // 更新語言
  updateLanguage(savedLanguage);

  // 監聽語言選擇變化
  languageSelect.addEventListener("change", (e) => {
    updateLanguage(e.target.value);
  });
});
