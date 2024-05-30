let backButton = undefined
let hotkeyInput = undefined
let hotkeyButton = undefined
let startExperimentButton = undefined
let experimentMenuWrapper = undefined
let isInputEnabled = false;
let allowedHotkeys = ["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp"]

const handleExperimentBackButtonClicked = () => {
    closeStartExperimentMenu()
    showMenu()
}

const initStartExperimentMenu = () => {
    experimentMenu = document.createElement('div')
    experimentMenu.id = 'gazetimator-experiment-menu-wrapper'
    experimentMenu.classList.add('gazetimator-experiment-menu-wrapper')
    document.body.appendChild(experimentMenu)

    experimentMenu.innerHTML = `
    <div class="gazetimator-experiment-menu-container">
        <div id="gazetimator-experiment-main-content" class="gazetimator-experiment-content">
            <div class="gazetimator-experiment-title-container">
                <div id="gazetimator-experiment-back-button-container" class="gazetimator-experiment-back-button-container">
                    <div class="gazetimator-experiment-back-button" id="gazetimator-experiment-back-button">
                        <div class="gazetimator-experiment-back-button-img"></div>
                        <div class="gazetimator-experiment-back-button-text">Back</div>
                    </div>
                </div>
                <p>Start Experiment</p>
                <div class="gazetimator-experiment-top-right-menu-controls-container"></div>
            </div>
            <div class="gazetimator-experiment-middle-container">
                <div class="gazetimator-experiment-middle-top-container">
                    <input id="gazetimator-experiment-hotkey-input" placeholder="-" disabled/>
                    <button id="gazetimator-experiment-hotkey-toggle-button">Set hotkey</button>
                </div>
                <div class="gazetimator-experiment-middle-bottom-container">
                    <div id="gazetimator-experiment-start-button-container" class="gazetimator-experiment-start-button-container">
                        <div class="gazetimator-experiment-start-button-image-container">
                            <img src="https://github.com/lukeformosa/gazetimator-images/blob/main/images/menu/start-experiment-inner.png?raw=true">
                        </div>
                        <div class="gazetimator-experiment-start-button-text-container">
                            <h2>Start</h2>
                            <p>Once started, you can then press the hotkey you mapped to stop the experiment.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="gazetimator-experiment-footer-container">
                <p>Developed by Luke Formosa for a dissertation study (BSc), 2023-2024&copy;.</p>
            </div>
        </div>
    </div>
    `

    experimentMenuWrapper = experimentMenu
    startExperimentButton = document.getElementById('gazetimator-experiment-start-button-container')
    hotkeyInput = document.getElementById('gazetimator-experiment-hotkey-input')
    hotkeyButton = document.getElementById('gazetimator-experiment-hotkey-toggle-button')
    backButton = document.getElementById('gazetimator-experiment-back-button')
    backButton.addEventListener('click', () => { handleExperimentBackButtonClicked() })
}

const showStartExperimentMenu = () => {
    experimentMenuWrapper.style.opacity = 1
    experimentMenuWrapper.style.zIndex = 99999999
}

const closeStartExperimentMenu = () => {
    experimentMenuWrapper.style.opacity = 0
    setTimeout(() => {
        experimentMenuWrapper.style.zIndex = -1
    }, 250)   
}

initStartExperimentMenu()

hotkeyButton.addEventListener('click', function() {
    isInputEnabled = !isInputEnabled;
    hotkeyInput.disabled = !isInputEnabled;
    hotkeyButton.textContent = isInputEnabled ? 'Press key' : 'Click to record';

    if(!hotkeyInput.disabled){
        hotkeyInput.focus()
    }
});

hotkeyInput.addEventListener('keydown', (event) => {
    event.preventDefault()
    
    if(!allowedHotkeys.includes(event.code)){
        console.log("Returning")
        return
    }
    
    isInputEnabled = !isInputEnabled
    hotkeyButton.textContent = !isInputEnabled ? 'Press key' : 'Set hotkey';
    hotkeyInput.value = event.code
    hotkeyInput.disabled = true
    hotkeyInput.blur()
    console.log(hotkeyInput.value)
});

const handleKeyDownExperiment = async (event) => {
    let checkInput = hotkeyInput.value || await localforage.getItem("stopExperimentKey")
    console.log(`Check input: ${checkInput}`)

    if(event.key === checkInput){
        window.removeEventListener('keydown', handleKeyDownExperiment)
        document.dispatchEvent(new CustomEvent(`StopExperiment`, { }));
    }
}

startExperimentButton.addEventListener("click", () => {
    if(!allowedHotkeys.includes(hotkeyInput.value)){
        showAlert('error', 'Set a hotkey to be able to stop experiment before starting.')
        return
    }
    document.dispatchEvent(new CustomEvent(`ExperimentReadyToStart`, { }));
    setTimeout(() => {
        window.addEventListener('keydown', handleKeyDownExperiment)
        localforage.setItem("stopExperimentKey", hotkeyInput.value)
    }, 3000) //Waiting 3 seconds until setting the keypress event for the termination of the experiment
})