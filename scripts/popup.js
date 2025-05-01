document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const inspectorToggle = $("inspectorToggle");
  const selectModeToggle = $("selectModeToggle");
  const showComputedStyles = $("showComputedStyles");
  const includeVendorPrefixes = $("includeVendorPrefixes");
  const showPseudoElements = $("showPseudoElements");
  const showPseudoExtras = $("showPseudoExtras");
  const languageSelect = $("languageSelect");

  /* ----- 載入儲存設定 ----- */
  chrome.storage.sync.get(
    {
      inspectorActive: false,
      selectModeActive: false,
      showComputedStyles: true,
      includeVendorPrefixes: false,
      showPseudoElements: false,
      showPseudoExtras: false,
    },
    (cfg) => {
      inspectorToggle.checked = cfg.inspectorActive;
      selectModeToggle.checked = cfg.selectModeActive;
      showComputedStyles.checked = cfg.showComputedStyles;
      includeVendorPrefixes.checked = cfg.includeVendorPrefixes;
      showPseudoElements.checked = cfg.showPseudoElements;
      showPseudoExtras.checked = cfg.showPseudoExtras;

      // 初次同步狀態
      const send = (action, isActive) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (!tabs[0]) return;
          chrome.tabs.sendMessage(tabs[0].id, { action, isActive });
        });
      };
      if (cfg.inspectorActive) send("toggleInspector", cfg.inspectorActive);
      if (cfg.selectModeActive) send("toggleSelectMode", cfg.selectModeActive);
    }
  );

  /* ----- 更新存檔並即時推送 ----- */
  const updateSetting = (key, value) => {
    chrome.storage.sync.set({ [key]: value });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "updateSetting",
        setting: key,
        value,
      });
    });
  };

  /* ----- 啟用 / 停用檢查器 ----- */
  inspectorToggle.addEventListener("change", () => {
    const isActive = inspectorToggle.checked;
    chrome.storage.sync.set({ inspectorActive: isActive });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleInspector",
        isActive,
      });
    });
  });

  /* ----- 選取模式切換 ----- */
  selectModeToggle.addEventListener("change", () => {
    const isActive = selectModeToggle.checked;
    chrome.storage.sync.set({ selectModeActive: isActive });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleSelectMode",
        isActive,
      });
    });
  });

  /* ----- 其它設定 ----- */
  showComputedStyles.addEventListener("change", () =>
    updateSetting("showComputedStyles", showComputedStyles.checked)
  );
  includeVendorPrefixes.addEventListener("change", () =>
    updateSetting("includeVendorPrefixes", includeVendorPrefixes.checked)
  );
  showPseudoElements.addEventListener("change", () =>
    updateSetting("showPseudoElements", showPseudoElements.checked)
  );
  showPseudoExtras.addEventListener("change", () =>
    updateSetting("showPseudoExtras", showPseudoExtras.checked)
  );

  /* ----- 語系切換 ----- */
  languageSelect.addEventListener("change", () => {
    const language = languageSelect.value;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "updateLanguage",
        language,
      });
    });
  });
});
