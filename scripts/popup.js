document.addEventListener("DOMContentLoaded", () => {
  const inspectorToggle   = document.getElementById("inspectorToggle");
  const selectModeToggle  = document.getElementById("selectModeToggle");
  const showComputedStyles     = document.getElementById("showComputedStyles");
  const includeVendorPrefixes  = document.getElementById("includeVendorPrefixes");

  /* ----- 載入儲存設定 ----- */
  chrome.storage.sync.get({
    inspectorActive    : false,
    selectModeActive   : false,
    showComputedStyles : true,
    includeVendorPrefixes: false,
  }, (items) => {
    inspectorToggle.checked  = items.inspectorActive;
    selectModeToggle.checked = items.selectModeActive;
    showComputedStyles.checked    = items.showComputedStyles;
    includeVendorPrefixes.checked = items.includeVendorPrefixes;

    const send = (action, isActive) => {
      chrome.tabs.query({active:true,currentWindow:true}, (tabs)=>{
        chrome.tabs.sendMessage(tabs[0].id, {action, isActive});
      });
    };
    if (items.inspectorActive)   send("toggleInspector", items.inspectorActive);
    if (items.selectModeActive)  send("toggleSelectMode", items.selectModeActive);
  });

  /* ----- 啟用 / 停用檢查器 ----- */
  inspectorToggle.addEventListener("change", ()=> {
    const isActive = inspectorToggle.checked;
    chrome.storage.sync.set({inspectorActive:isActive});
    chrome.tabs.query({active:true,currentWindow:true}, (tabs)=>{
      chrome.tabs.sendMessage(tabs[0].id,{action:"toggleInspector",isActive});
    });
  });

  /* ----- 選取模式切換 ----- */
  selectModeToggle.addEventListener("change", ()=> {
    const isActive = selectModeToggle.checked;
    chrome.storage.sync.set({selectModeActive:isActive});
    chrome.tabs.query({active:true,currentWindow:true}, (tabs)=>{
      chrome.tabs.sendMessage(tabs[0].id,{action:"toggleSelectMode",isActive});
    });
  });

  /* ----- 其它設定 ----- */
  showComputedStyles.addEventListener("change", () =>
    chrome.storage.sync.set({showComputedStyles: showComputedStyles.checked})
  );
  includeVendorPrefixes.addEventListener("change", () =>
    chrome.storage.sync.set({includeVendorPrefixes: includeVendorPrefixes.checked})
  );
});
