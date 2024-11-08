// Listen for installation
chrome.runtime.onInstalled.addListener(function() {
  // Initialize storage with empty folders if needed
  chrome.storage.local.get(['tabFolders'], function(result) {
    if (!result.tabFolders) {
      chrome.storage.local.set({ tabFolders: {} });
    }
  });
});
