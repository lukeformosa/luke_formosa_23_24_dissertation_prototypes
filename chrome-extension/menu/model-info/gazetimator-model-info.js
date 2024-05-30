let modelInfoTableContainer
let modelInfoBackButton = undefined
let modelInfoMenuWrapper = undefined
let modelInfo = {
    accuracy: '91',
    entries: '182',
    tableDetails: [
        {
            key: "Model's Algorithm",
            value: "Ridge Regression"
        },
        {
            key: "Experiments Conducted",
            value: "2"
        }
    ]
}

const handleModelInfoBackButtonClicked = () => {
    closeModelInfoMenu()
    showMenu()
}

const updateInfo = () => {
    let regressionType
    
    switch (MODEL_REGRESSION_TYPE) {
        //"ridge", "weightedRidge" or "threadedRidge"
        case "ridge":
            regressionType = "Ridge"
            break
        case "weightedRidge":
            regressionType = "Weighted Ridge"
            break
        case "threadedRidge":
            regressionType = "Threaded Ridge"
            break
    }

    console.log(`Regression Type: ${MODEL_REGRESSION_TYPE}`)

    modelInfo.tableDetails[0].value = regressionType

    modelInfoTableContainer.innerHTML = ""

    modelInfo.tableDetails.forEach(row => {
        modelInfoTableContainer.innerHTML += `
            <div class="gazetimator-model-info-middle-dashboard-left-inner-row">
                <div class="gazetimator-model-info-middle-dashboard-left-inner-row-left">${row.key}</div>
                <div class="gazetimator-model-info-middle-dashboard-left-inner-row-right">${row.value}</div>
            </div>
        `
    })
}

const showModelInfoMenu = async () => {

    console.log("Updating model info...")
    updateInfo()

    modelInfoMenuWrapper.style.opacity = 1
    modelInfoMenuWrapper.style.zIndex = 99999999

    let webgazerAcc = await localforage.getItem("webgazerAccuracy")
    let webgazerEnt = await localforage.getItem("webgazerGlobalData")

    document.getElementById("gazetimator-mi-acc").innerHTML = `${(webgazerAcc != null) ? webgazerAcc + "% Accuracy" : "Not Calibrated"}`
    document.getElementById("gazetimator-mi-ent").innerHTML = `${(webgazerEnt != null) ? webgazerEnt.length : 0} Entries`
}

const closeModelInfoMenu = () => {
    modelInfoMenuWrapper.style.opacity = 0
    setTimeout(() => {
        modelInfoMenuWrapper.style.zIndex = -1
    }, 250)   
}

const initModelInfoMenu = () => {
    modelInfoMenu = document.createElement('div')
    modelInfoMenu.id = 'gazetimator-model-info-menu-wrapper'
    modelInfoMenu.classList.add('gazetimator-model-info-menu-wrapper')
    document.body.appendChild(modelInfoMenu)

    modelInfoMenu.innerHTML = `
    <div class="gazetimator-model-info-menu-container">
        <div id="gazetimator-model-info-main-content" class="gazetimator-model-info-content">
            <div class="gazetimator-model-info-title-container">
                <div id="gazetimator-model-info-back-button-container" class="gazetimator-model-info-back-button-container">
                    <div class="gazetimator-model-info-back-button" id="gazetimator-model-info-back-button">
                        <div class="gazetimator-model-info-back-button-img"></div>
                        <div class="gazetimator-model-info-back-button-text">Back</div>
                    </div>
                </div>
                <p>Model Info</p>
                <div class="gazetimator-model-info-top-right-menu-controls-container"></div>
            </div>
            <div class="gazetimator-model-info-middle-container">
                <div class="gazetimator-model-info-middle-dashboard">
                    <div class="gazetimator-model-info-middle-dashboard-left">
                        <div id="gazetimator-model-info-middle-dashboard-left-inner" class="gazetimator-model-info-middle-dashboard-left-inner">
                            
                        </div>
                    </div>
                    <div class="gazetimator-model-info-middle-dashboard-right">
                        <div class="gazetimator-model-info-middle-dashboard-right-top">
                            <p id="gazetimator-mi-acc"></p>
                        </div>
                        <div class="gazetimator-model-info-middle-dashboard-right-bottom">
                            <p id="gazetimator-mi-ent"></p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="gazetimator-model-info-footer-container">
                <p>Developed by Luke Formosa for a dissertation study (BSc), 2023-2024&copy;.</p>
            </div>
        </div>
    </div>
    `

    modelInfoTableContainer = document.getElementById('gazetimator-model-info-middle-dashboard-left-inner')

    modelInfo.tableDetails.forEach(row => {
        modelInfoTableContainer.innerHTML += `
            <div class="gazetimator-model-info-middle-dashboard-left-inner-row">
                <div class="gazetimator-model-info-middle-dashboard-left-inner-row-left">${row.key}</div>
                <div class="gazetimator-model-info-middle-dashboard-left-inner-row-right">${row.value}</div>
            </div>
        `
    })

    modelInfoMenuWrapper = modelInfoMenu
    backButton = document.getElementById('gazetimator-model-info-back-button')
    backButton.addEventListener('click', () => { handleModelInfoBackButtonClicked() })
}

initModelInfoMenu()