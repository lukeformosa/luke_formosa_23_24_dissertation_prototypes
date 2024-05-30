const injectScript = (file_path, tag, elType) => {
    const node = document.getElementsByTagName(tag)[0]
    const file = document.createElement(elType === 'script' ? 'script' : 'link')
    file.setAttribute('type', elType === 'script' ? 'text/javascript' : 'text/css')
    if (elType == 'stylesheet') {
        file.rel = 'stylesheet'
        file.setAttribute('href', file_path)
    }
    else {
        file.setAttribute('src', file_path)
    }
    node.appendChild(file)
}

try{
    // injectScript(chrome.runtime.getURL('lib/gazetimator-posthog.js'), 'head', 'script') //Enable 
    injectScript(chrome.runtime.getURL('global/gazetimator-variables.js'), 'head', 'script')
    injectScript(chrome.runtime.getURL('lib/gazetimator-localforage.min.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('lib/gazetimator-jszip.min.js'), 'head', 'script')
    injectScript(chrome.runtime.getURL('lib/gazetimator-d3js.min.js'), 'head', 'script')
    injectScript(chrome.runtime.getURL('lib/gazetimator-webgazer.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('lib/html2canvas.js'), 'head', 'script')
    injectScript(chrome.runtime.getURL('menu/gazetimator-menu.css'), 'head', 'stylesheet')
    injectScript(chrome.runtime.getURL('menu/gazetimator-menu.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('menu/services/gazetimator-models.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('menu/services/gazetimator-experiment.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('menu/experiment/gazetimator-experiment-menu.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('menu/experiment/gazetimator-experiment-menu.css'), 'head', 'stylesheet')
    injectScript(chrome.runtime.getURL('menu/experiments-list/gazetimator-experiments-list.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('menu/experiments-list/gazetimator-experiments-list.css'), 'head', 'stylesheet')
    injectScript(chrome.runtime.getURL('global/gazetimator-script.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('menu/model-info/gazetimator-model-info.js'), 'body', 'script')
    injectScript(chrome.runtime.getURL('menu/model-info/gazetimator-model-info.css'), 'head', 'stylesheet')
    injectScript(chrome.runtime.getURL('global/gazetimator-styles.css'), 'head', 'stylesheet')
}
catch(e){
    console.log("Website has CSP. Cannot load Gazetimator.")
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.urlChanged) {
        console.log("URL changed to:", message.url);
    }
});