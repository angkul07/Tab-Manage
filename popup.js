document.addEventListener('DOMContentLoaded', function() {
  // Load existing folders and current tabs
  loadFolders();
  loadCurrentTabs();

  // Set up event listeners
  document.getElementById('create-folder').addEventListener('click', createNewFolder);
});

function loadFolders() {
  chrome.storage.local.get(['tabFolders'], function(result) {
    const foldersContainer = document.getElementById('folders-container');
    foldersContainer.innerHTML = '';
    
    const folders = result.tabFolders || {};
    
    // First, analyze shared tabs
    const sharedTabs = findSharedTabs(folders);
    
    // Then create folder elements
    for (const folderName in folders) {
      const folderElement = createFolderElement(folderName, folders[folderName], sharedTabs);
      foldersContainer.appendChild(folderElement);
    }
  });
}

function findSharedTabs(folders) {
  const urlCount = {};
  const sharedUrls = new Set();

  // Count occurrences of each URL
  Object.values(folders).forEach(tabs => {
    tabs.forEach(tab => {
      urlCount[tab.url] = (urlCount[tab.url] || 0) + 1;
      if (urlCount[tab.url] > 1) {
        sharedUrls.add(tab.url);
      }
    });
  });

  return sharedUrls;
}

function loadCurrentTabs() {
  chrome.tabs.query({ currentWindow: true }, function(tabs) {
    const tabsList = document.getElementById('tabs-list');
    tabsList.innerHTML = '';
    
    chrome.storage.local.get(['tabFolders'], function(result) {
      const folders = result.tabFolders || {};
      
      tabs.forEach(tab => {
        const tabElement = createCurrentTabElement(tab, folders);
        tabsList.appendChild(tabElement);
      });
    });
  });
}

function createCurrentTabElement(tab, folders) {
  const tabDiv = document.createElement('div');
  tabDiv.className = 'tab-item';
  
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = tab.favIconUrl || 'icon48.png';
  
  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title;
  
  const folderSelect = document.createElement('select');
  folderSelect.className = 'folder-select';
  
  let selectedFolder = '';
  Object.keys(folders).forEach(folderName => {
    const option = document.createElement('option');
    option.value = folderName;
    option.textContent = folderName;
    
    // Check if the tab exists in this folder
    if (folders[folderName].some(t => t.url === tab.url)) {
      selectedFolder = folderName; // Mark this folder as selected
      option.selected = true;
    }
    
    folderSelect.appendChild(option);
  });
  
  if (!selectedFolder) {
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Add to folder...';
    folderSelect.insertBefore(defaultOption, folderSelect.firstChild);
    defaultOption.selected = true;
  }

  folderSelect.onchange = function() {
    if (this.value) {
      addTabToFolder(tab, this.value);
      this.value = ''; // Reset select
    }
  };
  
  tabDiv.appendChild(favicon);
  tabDiv.appendChild(title);
  tabDiv.appendChild(folderSelect);
  
  return tabDiv;
}


function createFolderElement(folderName, tabs, sharedTabs) {
  const folderDiv = document.createElement('div');
  folderDiv.className = 'folder';
  
  const folderHeader = document.createElement('div');
  folderHeader.className = 'folder-header';
  
  const titleContainer = document.createElement('div');
  titleContainer.style.display = 'flex';
  titleContainer.style.alignItems = 'center';
  
  const title = document.createElement('h3');
  title.textContent = folderName;
  
  const tabCount = document.createElement('span');
  tabCount.className = 'folder-tabs-count';
  tabCount.textContent = `(${tabs.length} tabs)`;
  
  titleContainer.appendChild(title);
  titleContainer.appendChild(tabCount);
  
  const deleteButton = document.createElement('button');
  deleteButton.textContent = 'Delete';
  deleteButton.onclick = (e) => {
    e.stopPropagation();
    deleteFolder(folderName);
  };
  
  folderHeader.appendChild(titleContainer);
  folderHeader.appendChild(deleteButton);
  
  const folderContent = document.createElement('div');
  folderContent.className = 'folder-content';
  
  tabs.forEach(tab => {
    const tabElement = createTabElement(tab, folderName, sharedTabs.has(tab.url));
    folderContent.appendChild(tabElement);
  });
  
  folderHeader.onclick = () => {
    folderDiv.classList.toggle('expanded');
  };
  
  folderDiv.appendChild(folderHeader);
  folderDiv.appendChild(folderContent);
  
  return folderDiv;
}

function createTabElement(tab, folderName, isShared) {
  const tabDiv = document.createElement('div');
  tabDiv.className = 'tab-item';
  
  const favicon = document.createElement('img');
  favicon.className = 'tab-favicon';
  favicon.src = tab.favicon || 'icon48.png';
  
  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title;
  
  const actions = document.createElement('div');
  actions.className = 'tab-actions';
  
  const openButton = document.createElement('button');
  openButton.className = 'tab-button';
  openButton.textContent = 'Open';
  openButton.onclick = () => openTab(tab.url);
  
  const removeButton = document.createElement('button');
  removeButton.className = 'tab-button';
  removeButton.textContent = 'Remove';
  removeButton.onclick = () => removeTabFromFolder(tab.url, folderName);
  
  actions.appendChild(openButton);
  actions.appendChild(removeButton);
  
  tabDiv.appendChild(favicon);
  tabDiv.appendChild(title);
  
  if (isShared) {
    const sharedIndicator = document.createElement('span');
    sharedIndicator.className = 'shared-indicator';
    sharedIndicator.textContent = '(Shared)';
    tabDiv.appendChild(sharedIndicator);
  }
  
  tabDiv.appendChild(actions);
  
  return tabDiv;
}

function createNewFolder() {
  const folderName = document.getElementById('folder-name').value.trim();
  if (!folderName) return;

  chrome.storage.local.get(['tabFolders'], function(result) {
    const folders = result.tabFolders || {};
    if (!folders[folderName]) {
      folders[folderName] = [];
      chrome.storage.local.set({ tabFolders: folders }, function() {
        loadFolders();
        loadCurrentTabs();
        document.getElementById('folder-name').value = '';
      });
    }
  });
}

function addTabToFolder(tab, folderName) {
  chrome.storage.local.get(['tabFolders'], function(result) {
    const folders = result.tabFolders || {};
    if (!folders[folderName]) {
      folders[folderName] = [];
    }
    
    // Check if tab already exists in folder
    const tabExists = folders[folderName].some(t => t.url === tab.url);
    if (!tabExists) {
      folders[folderName].push({
        url: tab.url,
        title: tab.title,
        favicon: tab.favIconUrl
      });
      
      chrome.storage.local.set({ tabFolders: folders }, function() {
        loadFolders();
        loadCurrentTabs();
      });
    }
  });
}

function removeTabFromFolder(url, folderName) {
  chrome.storage.local.get(['tabFolders'], function(result) {
    const folders = result.tabFolders || {};
    if (folders[folderName]) {
      folders[folderName] = folders[folderName].filter(tab => tab.url !== url);
      chrome.storage.local.set({ tabFolders: folders }, function() {
        loadFolders();
      });
    }
  });
}

function openTab(url) {
  chrome.tabs.create({ url: url });
}

function deleteFolder(folderName) {
  if (confirm(`Are you sure you want to delete the folder "${folderName}"?`)) {
    chrome.storage.local.get(['tabFolders'], function(result) {
      const folders = result.tabFolders || {};
      delete folders[folderName];
      
      chrome.storage.local.set({ tabFolders: folders }, function() {
        loadFolders();
        loadCurrentTabs();
      });
    });
  }
}
