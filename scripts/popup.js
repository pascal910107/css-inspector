document.addEventListener("DOMContentLoaded", () => {
  const inspectorToggle = document.getElementById("inspectorToggle");
  const showComputedStyles = document.getElementById("showComputedStyles");
  const includeVendorPrefixes = document.getElementById(
    "includeVendorPrefixes"
  );

  // 載入儲存的設定
  chrome.storage.sync.get(
    {
      inspectorActive: false,
      showComputedStyles: true,
      includeVendorPrefixes: false,
    },
    (items) => {
      inspectorToggle.checked = items.inspectorActive;
      showComputedStyles.checked = items.showComputedStyles;
      includeVendorPrefixes.checked = items.includeVendorPrefixes;

      // 如果檢查器是啟用狀態，則在載入時發送消息
      if (items.inspectorActive) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggleInspector",
            isActive: true,
          });
        });
      }
    }
  );

  // 切換檢查器
  inspectorToggle.addEventListener("change", () => {
    const isActive = inspectorToggle.checked;
    chrome.storage.sync.set({ inspectorActive: isActive });

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "toggleInspector",
        isActive: isActive,
      });
    });
  });

  // 儲存設定變更
  showComputedStyles.addEventListener("change", () => {
    chrome.storage.sync.set({
      showComputedStyles: showComputedStyles.checked,
    });
  });

  includeVendorPrefixes.addEventListener("change", () => {
    chrome.storage.sync.set({
      includeVendorPrefixes: includeVendorPrefixes.checked,
    });
  });
});
