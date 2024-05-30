let globalWebgazer = undefined
let webgazerState = false
let webgazerLoaded = false
let controls = false, operation = false
let webgazerElem = null
let webgazerDotElem = null
let turningOn = false
let didAlreadyExecute = false
const RECORDING_TIME = 5
let calibrationPointsComplete = 0
let wasExperimentOngoing
let webgazerVideoContainerLoaded = false
let webgazerDotLoaded = false
let storeCalcAccCoords = false
let calcAccCoords = [[], []]
let recordedCoords = []
let mouseClicks = []
let experimentContinued = false
let targetX, targetY, recorded50X, recorded50Y
let timeStarted = new Date()

const delay = ms => new Promise(res => setTimeout(res, ms));

//This observer will wait for the webgazer window to load
const observer = new MutationObserver(async (mutations) => {

    if(webgazerVideoContainerLoaded === true && webgazerDotLoaded === true && webgazerState === true){
        if(wasExperimentOngoing === true)
        {
            if(experimentContinued === false){
                resumeWebgazer()
                await continueExperiment()
                let loadingScreen = document.getElementById('gazetimator-loading-screen-exp-ongoing')
                removeLoadingScreen(loadingScreen)
                if(GAZETIMATOR_MODE == "simple"){
                    document.getElementById("gazetimator-simple-floating-btn").style.display = "none"
                }
            }
        }
        observer.disconnect();
    }

    // console.log(`Checking if experiment was ongoing: ${wasExperimentOngoing}`)
    mutations.forEach(mutation => {
        if (mutation.addedNodes) {
            mutation.addedNodes.forEach(node => {
                if (node.id === 'webgazerVideoContainer') {
                    webgazerElem = document.getElementById('webgazerVideoContainer')
                    webgazerVideoContainerLoaded = true
                }
                if(node.id === 'webgazerGazeDot'){
                    webgazerDotElem = document.getElementById('webgazerGazeDot')
                    webgazerDotElem.style.pointerEvents = 'none'
                    webgazerDotElem.style.backgroundColor = "rgba(0, 255, 0, 0.9)"
                    webgazerDotLoaded = true
                }
            });
        }
    });
})

observer.observe(document.body, { childList: true, subtree: true })

const exportObjectToJSONFile = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

const createAlertControl = () => {
    alertContainerElem = document.createElement('div')
    alertContainerElem.id = 'gazetimator-alert-container'
    alertContainerTextElem = document.createElement('p')
    alertContainerTextElem.id = 'gazetimator-alert-container-text'
    alertContainerElem.appendChild(alertContainerTextElem)
    alertContainerElem.classList.add(['gazetimator-alert-container'])
    document.body.appendChild(alertContainerElem)
}

createAlertControl()

const CalculatePrecision = (coords) => {
    var windowHeight = window.innerHeight;
    var windowWidth = window.innerWidth;

    // Retrieve the last 50 gaze prediction points
    var x50 = coords[0];
    var y50 = coords[1];

    recorded50X = x50
    recorded50Y = y50

    // Calculate the position of the point the user is staring at
    var staringPointX = windowWidth / 2;
    var staringPointY = windowHeight / 2;

    targetX = staringPointX
    targetY = staringPointY

    var precisionPercentages = new Array(50);
    let { largestDistance, smallestDistance, distance50 } = CalculatePrecisionPercentages(precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY);
    var precision = CalculateAverage(precisionPercentages);

    // Return the precision measurement as a rounded percentage
    return { "precision": precision, "largestDistance": largestDistance, "smallestDistance": smallestDistance, "distance50": distance50 };
};

const CalculatePrecisionPercentages = (precisionPercentages, windowHeight, x50, y50, staringPointX, staringPointY) => {
    console.log(`Staring Point (X): ${staringPointX}`)
    console.log(`Staring Point (Y): ${staringPointY}`)

    let didShow = false

    let largestDistance = -999999, smallestDistance = 999999, distance50 = []

    for (let x = 0; x < 50; x++) {
        // Calculate distance between each prediction and staring point
        var xDiff = staringPointX - x50[x];
        var yDiff = staringPointY - y50[x];
        var distance = Math.sqrt((xDiff * xDiff) + (yDiff * yDiff));

        distance50.push(distance)

        if(distance > largestDistance){
            largestDistance = distance
        }
        if(distance < smallestDistance){
            smallestDistance = distance
        }
        
        // Calculate precision percentage
        var halfWindowHeight = windowHeight / 2;
        var precision = 0;
        if (distance <= halfWindowHeight && distance > -1) {
            precision = 100 - (distance / halfWindowHeight * 100);
        } else if (distance > halfWindowHeight) {
            precision = 0;
        } else if (distance > -1) {
            precision = 100;
        }
        if(!didShow && x == 24){
            didShow = true
        }
        // Store the precision
        precisionPercentages[x] = precision;
    }

    let finalAccuracy = CalculateAverage(precisionPercentages).toFixed(2)
    localforage.setItem("webgazerAccuracy", finalAccuracy)

    return { "largestDistance": largestDistance, "smallestDistance": smallestDistance, "distance50": distance50 }
}

const CalculateAverage = (precisionPercentages) => {
    var precision = 0;
    for (let x = 0; x < 50; x++) {
        precision += precisionPercentages[x];
    }
    precision = precision / 50;
    return precision;
}

const handleModelInfoClicked = () => {
    closeMenu({ showFloatingBtn: false, doResumeWebgazer: false })
    showModelInfoMenu()
}

const handleExperimentsListClicked = () => {
    closeMenu({ showFloatingBtn: false, doResumeWebgazer: false })
    showExperimentsListMenu()
}

const StartStoringPoints = () => {
    globalWebgazer.params.storingPoints = true;
}

const StopStoringPoints = () => {
    globalWebgazer.params.storingPoints = false;
}

const GetStoredPoints = () => {
    return [globalWebgazer.xPast50, globalWebgazer.yPast50];
}

const showCalcAccuracyScreen = () => {
    let overlayElem = document.createElement('div')
    overlayElem.id = 'gazetimator-calc-accuracy-overlay'
    overlayElem.style.backgroundColor = 'rgba(0, 0, 0, 0.95)'
    overlayElem.style.width = '100vw'
    overlayElem.style.height = '100vh'
    overlayElem.style.position = 'fixed'
    overlayElem.style.display = 'flex'
    overlayElem.style.justifyContent = 'center'
    overlayElem.style.alignItems = 'center'
    overlayElem.style.top = 0
    overlayElem.style.left = 0
    overlayElem.style.zIndex = 99999
    overlayElem.style.opacity = 0
    overlayElem.style.transitionDuration = '0.3s'

    let centerDotElem = document.createElement('div')
    centerDotElem.id = 'gazetimator-calc-accuracy-center-dot'
    centerDotElem.style.borderRadius = '50%';
    centerDotElem.style.aspectRatio = '1/1';
    centerDotElem.style.height = '3rem';
    centerDotElem.style.border = '2px solid black';
    centerDotElem.style.backgroundColor = 'rgb(10, 0, 230)';

    overlayElem.appendChild(centerDotElem)

    let infoElemWrapper = document.createElement('div')
    infoElemWrapper.id = 'gazetimator-calc-accuracy-info-wrapper'
    infoElemWrapper.style.width = '100vw'
    infoElemWrapper.style.height = '100vh'
    infoElemWrapper.style.position = 'fixed'
    infoElemWrapper.style.display = 'flex'
    infoElemWrapper.style.flexDirection = 'column'
    infoElemWrapper.style.justifyContent = 'flex-start'
    infoElemWrapper.style.alignItems = 'center'
    infoElemWrapper.style.top = 0
    infoElemWrapper.style.left = 0
    infoElemWrapper.style.zIndex = 100000
    infoElemWrapper.style.fontFamily = 'Dosis'
    infoElemWrapper.style.fontWeight = '700'
    infoElemWrapper.style.opacity = 0
    infoElemWrapper.style.transitionDuration = '0.5s'

    let infoElem = document.createElement('div')
    infoElem.id = 'gazetimator-calc-accuracy-info-container'
    infoElem.style.width = '20vw'
    infoElem.style.height = '20vh'
    infoElem.style.backgroundColor = 'white'
    infoElem.style.border = '2px solid black'
    infoElem.style.borderRadius = '2rem'
    infoElem.style.marginTop = '20vh'
    infoElem.style.textAlign = 'justify'
    infoElem.style.padding = '2rem'
    infoElem.style.display = 'flex'
    infoElem.style.flexDirection = 'column'
    infoElem.style.justifyContent = 'center'
    infoElem.style.alignItems = 'center'
    infoElem.style.gap = '2rem'

    let infoTextElem = document.createElement('p')
    infoTextElem.innerHTML = `To calculate the model's accuracy, stare at the red dot below after clicking 'Start'. Your eyes will be recorded for 5 seconds and then the predictor will stop automatically.`
    infoElem.appendChild(infoTextElem)

    let infoStartBtnElem = document.createElement('button')
    infoStartBtnElem.id = 'gazetimator-info-start-btn'
    infoStartBtnElem.style.color = 'white'
    infoStartBtnElem.style.fontWeight = '800'
    infoStartBtnElem.style.fontFamily = 'Dosis'
    infoStartBtnElem.style.fontSize = '1rem'
    infoStartBtnElem.style.backgroundColor = '#2e4173'
    infoStartBtnElem.style.padding = '1rem 2rem 1rem'
    infoStartBtnElem.style.borderRadius = '1rem'
    infoStartBtnElem.style.transitionDuration = '0.2s'
    infoStartBtnElem.innerHTML = 'Start'

    infoElem.appendChild(infoStartBtnElem)
    infoElemWrapper.appendChild(infoElem)

    document.body.appendChild(infoElemWrapper)
    document.body.appendChild(overlayElem)

    infoStartBtnElem.addEventListener('click', () => {
        closeCalcAccuracyInfoBox()

        let plottingCanvasElem = document.createElement('canvas')
        plottingCanvasElem.id = "plotting_canvas"
        plottingCanvasElem.style.position = 'fixed'
        plottingCanvasElem.style.width = '100vw'
        plottingCanvasElem.style.height = '100vh'
        plottingCanvasElem.style.top = 0
        plottingCanvasElem.style.left = 0

        document.body.appendChild(plottingCanvasElem)
        document.body.style.cursor = 'none';
        handleStartAccuracyTest()
    })

    setTimeout(() => {
        infoElemWrapper.style.opacity = 1;
        overlayElem.style.opacity = 1;
    }, 10);
}

const closeCalcAccuracyInfoBox = () => {
    let infoElemWrapper = document.getElementById('gazetimator-calc-accuracy-info-wrapper')

    infoElemWrapper.style.opacity = 0

    setTimeout(() => {
        document.body.removeChild(infoElemWrapper)
        document.dispatchEvent(new CustomEvent('ShowFloatingMenuButton', { }));
    }, 550); //Waiting 550ms to delete div
}

let tempArr = []
let tempIteration = 0
const saveGazePredictions = ({ x, y }) => {
    let yOffset = setYWithOffset(y, window.scrollY)
    recordedCoords.push({x: x, y: yOffset, time: getTimeClicked()})
}

const getTimeClicked = () => {
    return (new Date() - timeStarted) / 1000
}

const handleStopExperiment = async () => {
    toggleMouseClickSaver('Stop')
    toggleGazePredictionSaver('Stop')

    let startTime = timeStarted
    let endTime = new Date()

    appendToExperimentCoordsArray(recordedCoords, mouseClicks, startTime, endTime, window.location.href)
    localforage.removeItem("isExperimentOngoing")
    localforage.removeItem("stopExperimentKey")
    operation = false
    pauseWebgazer()
    if(GAZETIMATOR_MODE != "simple"){
        showFloatingMenuBtn()
        showMenu()
    }

    setTimeout(async () => {
        console.log("Waited 2 seconds, now getting experiments.")

        let simpleMenuBtn = document.getElementById("gazetimator-simple-floating-btn")

        if(simpleMenuBtn != null || simpleMenuBtn != undefined){
            document.getElementById("gazetimator-simple-floating-btn").style.display = "block"
        }

        await handleDownloadLatestExperiment()
    }, 2000)
}

const toggleGazePredictionSaver = (toggle) => {
    switch(toggle){
        case null || undefined:
            return { status: 'error', message: `Toggle cannot be anything other than 'Start' or 'Stop'.`}
        case 'Start':
            operation = true
            return
        case 'Stop':
            operation = false
            return
        default:
            return { status: 'error', message: `Toggle cannot be anything other than 'Start' or 'Stop'.`}
    }
}

const closeCalcAccuracyScreen = () => {
    let overlayElem = document.getElementById('gazetimator-calc-accuracy-overlay')
    let plottingCanvasElem = document.getElementById('plotting_canvas')

    overlayElem.style.opacity = 0
    setTimeout(() => {
        document.body.removeChild(overlayElem)
        document.body.removeChild(plottingCanvasElem)
        document.body.style.cursor = 'default';
    }, 550); //Waiting 550ms to delete div
}

const turnOffWebgazer = () => {
    if(globalWebgazer == null || globalWebgazer == undefined){
        console.log("Tried to turn off webgazer, but it is currently: ", typeof(globalWebgazer))
        return
    }
    globalWebgazer.pause()
    webgazerElem.style.zIndex = -1
    webgazerDotElem.style.zIndex = -1
    webgazerState = false
    document.dispatchEvent(new CustomEvent('DisableControl', { detail: ["Calculate Accuracy", "Calibrate Model", "Start Experiment"]}))
}

const resumeWebgazer = () => {
    webgazerElem.style.zIndex = -9999999
    webgazerDotElem.style.zIndex = 100000
    webgazerElem.style.opacity = 1
    webgazerDotElem.style.opacity = 1
    globalWebgazer.resume()
}

const pauseWebgazer = () => {
    webgazerElem.style.zIndex = -1
    webgazerDotElem.style.zIndex = -1
    webgazerElem.style.opacity = 0
    webgazerDotElem.style.opacity = 0
    globalWebgazer.pause()
    console.log(`Webgazer paused`)
}

const turnOnWebgazer = async () => {
    if((globalWebgazer == null || globalWebgazer == undefined) && turningOn == false){
        turningOn = true
        await initWebgazer().then( (value) => {
            if(typeof(value) == 'object' && value.hasOwnProperty('status')){
                console.error(`Gazetimator couldn't start. ${value.message}`)
                showAlert(value.status, `Gazetimator couldn't start. ${value.message}`)
                turningOn = false
                return 0
            }
            globalWebgazer = value
            turningOn = false
            webgazerState = true
            showAlert('success', 'Gazetimator turned on.')
        })
    }
    else{
        if(turningOn == false){
            globalWebgazer.resume()
            showAlert('success', 'Gazetimator turned on.')
            webgazerState = true
        }
    }
    if(isMenuOpen){
        console.log("pausing webgazer....")
        pauseWebgazer()
    }
    document.dispatchEvent(new CustomEvent('EnableControl', { detail: ["Calculate Accuracy", "Calibrate Model", "Start Experiment"]}))
}

const setAppropriateControls = () => {
    let vidContainer = document.getElementById("webgazerVideoContainer")
    if (vidContainer) {
        vidContainer.style.zIndex = "-1"
    }

    let currentLocation = window.location.href
    if (currentLocation && currentLocation.includes("bov")) {
        if (document.getElementsByClassName("divholdingfixedtopones").length > 0) {
            let tempElem = document.getElementsByClassName("divholdingfixedtopones")
            tempElem[0].setAttribute("style", "z-index: 500")
        }

        if (document.getElementsByClassName('fixedcontrolsholder').length > 0) {
            let tempElem = document.getElementsByClassName('fixedcontrolsholder')
            tempElem[0].setAttribute("style", "z-index: 500")
        }

        document.getElementById("cookiescript_badgetext").style.zIndex = 10000
    }
}

const resetControls = () => {
    controls = false, operation = false
    coords = []
}

const initWebgazer = async () => {
    resetControls()
    tempGazer = window.webgazer
    try{
        await tempGazer.setGazeListener((data) => {
            if (operation && data) {
                saveGazePredictions(data)
            }
            if(storeCalcAccCoords && data){
                calcAccCoords[0].push(data["x"])
                calcAccCoords[1].push(data["y"])
            }
        }).begin()

        setAppropriateControls()
        tempGazer.setRegression(MODEL_REGRESSION_TYPE)
        return tempGazer
    }
    catch(err){
        return { status: 'error', message: err.message}
    }
}

const closeCalibration = () => {
    let tempElem = document.getElementsByClassName("gazetimator-calibration-container")
    tempElem[0].remove()
    for (let i = 1; i < 10; i++) {
        let elem = document.getElementById(`gazetimator-d${i}`)
        elem.remove()
    }
}

const getCurrentDateFormatted = () => {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')

    return `${day}-${month}-${year}T${hours}-${minutes}-${seconds}`
}

const downloadImagesAsZip = async (images) => {
    const zip = new JSZip()
    for (let i = 0; i < images.length; i++) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = images[i].patch.width
      canvas.height = images[i].patch.height
      ctx.putImageData(images[i].patch, 0, 0)
      const dataURL = canvas.toDataURL('image/png')
      const blob = await (await fetch(dataURL)).blob()
      zip.file(images[i].fileName, blob)
    }
  
    zip.generateAsync({ type: 'blob' }).then((content) => {
      const blobURL = URL.createObjectURL(content)
      const downloadLink = document.createElement('a')
      downloadLink.href = blobURL
      currDate = getCurrentDateFormatted()
      downloadLink.download = `eyes-${currDate}.zip`
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(blobURL)
    })
}

const showAlert = async (type, text) => {

    alertContainerElem = document.getElementById('gazetimator-alert-container')
    alertContainerTextElem = document.getElementById('gazetimator-alert-container-text')
    
    if(alertContainerTextElem.classList.contains('gazetimator-alert-success')){
        alertContainerTextElem.classList.remove('gazetimator-alert-success')
    }

    if(alertContainerTextElem.classList.contains('gazetimator-alert-error')){
        alertContainerTextElem.classList.remove('gazetimator-alert-error')
    }

    alertContainerTextElem.classList.add((type === 'success') ? 'gazetimator-alert-success' : 'gazetimator-alert-error')
    alertContainerTextElem.innerHTML = text
    alertContainerElem.classList.add('gazetimator-show')
    await delay(4000) //Waiting 4 seconds
    alertContainerElem.classList.remove('gazetimator-show')
}

const handleExportImagesClicked = async () => {
    globalData = await getGlobalData()

    if(!globalData || globalData.length < 27){
        remaining = (!globalData) ? 27 : 27 - globalData.length
        showAlert('error', `Not enough data to export images, you need at least ${remaining} more.`)
        return
    }

    images = []
    count = 1

    globalData.forEach(item => {
        tempLeft = item.eyes.left
        tempRight = item.eyes.right
        tempLeft.fileName = `image-${count}.png`
        tempRight.fileName = `image-${count+1}.png`
        images.push(tempLeft)
        images.push(tempRight)
        count += 2
    })

    downloadImagesAsZip(images)
}

const dotClicked = ({ id: id }) => {
    
    let currentClicks = 0
    let elem = document.getElementById(id)
    if (elem.classList.contains("gazetimator-clicked-once")) {
        currentClicks = 1
    }
    else if (elem.classList.contains("gazetimator-clicked-twice")) {
        currentClicks = 2
    }
    else if (elem.classList.contains("gazetimator-clicked-three-times")) {
        currentClicks = 3
    }

    switch (currentClicks) {
        case 0:
            elem.classList.add("gazetimator-clicked-once")
            return
        case 1:
            elem.classList.remove("gazetimator-clicked-once")
            elem.classList.add("gazetimator-clicked-twice")
            return
        case 2:
            elem.classList.remove("gazetimator-clicked-twice")
            elem.classList.add("gazetimator-clicked-three-times")
            elem.onclick = ""
            ++calibrationPointsComplete
            
            if (calibrationPointsComplete == 9) {
                setTimeout(() => {
                    closeCalibration()
                    showFloatingMenuBtn()
                    calibrationPointsComplete = 0
                    document.body.style.overflow = "auto"
                }, 500)
            }
            return
    }
}

const showCalibration = () => {
    let calibrationContainer = document.createElement('div')
    calibrationContainer.setAttribute("class", "gazetimator-calibration-container")
    document.body.style.overflow = "hidden"
    document.body.appendChild(calibrationContainer)
    for (let i = 1; i < 10; i++) {
        let elem = document.createElement('div')
        elem.classList.add("gazetimator-dot")
        elem.setAttribute("id", `gazetimator-d${i}`)
        elem.onclick = () => dotClicked({ id: `gazetimator-d${i}` })
        document.body.appendChild(elem)
    }
}

const handleCalcAccuracyClicked = () => {
    closeMenu({ showFloatingBtn: false, doResumeWebgazer: true})
    if(globalWebgazer == null || globalWebgazer == undefined || !webgazerState){
        return { 
            status:  'error',
            message: 'Gazetimator is off, turn it on to perform accuracy test.'
        }
    }
    showCalcAccuracyScreen()
}

const exportAccuracyResult = (dataObject, filename) => {
    const jsonData = JSON.stringify(dataObject, null, 2);
    
    const blob = new Blob([jsonData], { type: 'application/json' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
}

const handleStartAccuracyTest = () => {
    storeCalcAccCoords = true
    calcAccCoords = [[], []]
    StartStoringPoints(globalWebgazer)
    toggleGazePredictionSaver('Start')

    setTimeout(async () => {
        StopStoringPoints(globalWebgazer)
        let coords = globalWebgazer.getStoredPoints()
        console.log(coords)
        var { precision, largestDistance, smallestDistance, distance50 } = CalculatePrecision(coords)
        closeCalcAccuracyScreen()
        showAlert('success', `Accuracy calculation complete, result: ${precision}%`)
        console.log(`Accuracy: ${precision}`)
        toggleGazePredictionSaver('Stop')
        
        numCalibrationClicks = await localforage.getItem("webgazerGlobalData")

        let result = {
            date_time_concluded: getCurrentDateFormatted(),
            accuracy: precision,
            smallestDistance: smallestDistance,
            largestDistance: largestDistance,
            regressionType: MODEL_REGRESSION_TYPE,
            numCalibrationClicks: numCalibrationClicks.length,
            targetX: targetX,
            targetY: targetY,
            recorded50X: recorded50X,
            recorded50Y: recorded50Y,
            distance50: distance50
        }

        //Exporting calibration results
        exportAccuracyResult(result, `c-${getCurrentDateFormatted()}`)
    }, 5000)
}

const handleStartExperimentClicked = async () => {
    globalData = await getGlobalData()
    if(globalData.length < 27){
        showAlert('error', 'Please calibrate the model before attempting to carry out an experiment.')
    }
    closeMenu({ showFloatingBtn: false, doResumeWebgazer: false })
    showStartExperimentMenu()
}

const toggleMouseClickSaver = (toggle) => {
    if(toggle === 'Start'){
        document.addEventListener('click', (clickEvent) => {
            mouseClicks.push({ x: clickEvent.pageX, y: clickEvent.pageY })
        })
    }
    if(toggle === 'Stop'){
        document.removeEventListener('click', () => {
            console.log("Click event listeneter removed.")    
        })
    }
}

const startCountdown = ({ action: action}) => {

    countdownWrapper = document.createElement('div')
    countdownWrapper.classList.add('gazetimator-countdown-wrapper')

    countdownElement = document.createElement('p')
    countdownWrapper.appendChild(countdownElement)
    document.body.appendChild(countdownWrapper)

    let countdownValue = 3;
    countdownElement.innerText = countdownValue;

    let timer = setInterval(() => {
        countdownValue--;
        countdownElement.innerText = countdownValue;

        if (countdownValue <= 0) {
            clearInterval(timer);
            document.body.removeChild(countdownWrapper)
            if(action === "resumeWebgazer"){
                startExperiment()
            }
        }
    }, 1000);
}

const handleExperimentReadyToStartClicked = async () => {
    closeStartExperimentMenu()
    await startCountdown({ action: "resumeWebgazer"})
}

const downloadImage = (canvas, filename) => {
    let dataUrl = canvas.toDataURL('image/png');

    let downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = filename;

    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

const getPageHeight = () => {
    const bodyHeight = document.body.scrollHeight
    const docElementHeight = document.documentElement.scrollHeight
    return Math.max(bodyHeight, docElementHeight)
}

const getPageWidth = () => {
    const bodyWidth = document.body.scrollWidth
    const docElementWidth = document.documentElement.scrollWidth
    return Math.max(bodyWidth, docElementWidth)
}

const getVisibleHeight = () => {
    return window.innerHeight;
}

const getVisibleWidth = () => {
    return window.innerWidth;
}

const setYWithOffset = (yCoordRead, scrollYOffsett) => {
    //return getPageHeight() - getVisibleHeight() + yCoordRead - window.scrollY
    return yCoordRead + scrollYOffsett
}

document.addEventListener('SwitchToggledFalse', async () => {
    turnOffWebgazer()
    if(globalWebgazer != null && globalWebgazer != undefined){
        showAlert('success', 'Gazetimator turned off.')
    }
})

document.addEventListener('SwitchToggledTrue', async () => {
    // console.log(`webgazerLoaded: ${webgazerLoaded}\nwebgazerState: ${webgazerState}\nturningOn: ${turningOn}`)
    if(webgazerLoaded){
        if(webgazerState != true){
            if(turningOn != true){
                turnOnWebgazer()
            }
        }
    }
    else{
        showAlert('error', 'Gazetimator not initialised yet, please try again.')
    }
})

document.addEventListener('ClearDataAndRestartWebgazer', async (e) => {
    globalWebgazer.pause()
    globalWebgazer.clearData()

    let check = await localforage.getItem("webgazerAccuracy")

    if(check != null || check != undefined){
        localforage.removeItem("webgazerAccuracy")
    }

    turnOffWebgazer()
    globalWebgazer.end()
    globalWebgazer = null
    out = await turnOnWebgazer()
    if(out == 0){
        console.log("Webgazer couldn't start.")
    }
    else{
        console.log("Webgazer data cleared & restarted successfully.")
    }
})

document.addEventListener('ClearModelClicked', (e) => {
    try{
        if(globalWebgazer != null && globalWebgazer != undefined){
            globalWebgazer.pause()
            globalWebgazer.clearData()
            //globalWebgazer.resume()
        }
    }
    catch(err){
        showAlert('error', 'Model failed to clear.')
        console.error(err)
        return
    }
    
    showAlert('success', 'Model cleared successfully.')
})

document.addEventListener('CalibrationClicked', (e) => {
    closeMenu({ showFloatingBtn: false, doResumeWebgazer: true })
    //Handle Calibration clicked
    showCalibration()
})

document.addEventListener('CalcAccuracyClicked', (e) => {
    //Handle calculate accuracy clicked
    let res = handleCalcAccuracyClicked()
    if(res != null && res.hasOwnProperty('status') && res.status === 'error'){
        showAlert('error', res.message)
    }
})

document.addEventListener("ExperimentsListClicked", async () => {
    handleExperimentsListClicked()
})

document.addEventListener('ExportImagesClicked', (e) => {
    //Handle export images clicked
    handleExportImagesClicked()
})

document.addEventListener('StartExperimentClicked', (e) => {
    //Handle export images clicked
    handleStartExperimentClicked()
})

const showLoadingScreen = () => {
    let loadingScreen = document.createElement('div')

    loadingScreen.id = "gazetimator-loading-screen-exp-ongoing"
    loadingScreen.style.backgroundColor = "rgba(0, 0, 0, 1)"
    loadingScreen.style.width = "100vw"
    loadingScreen.style.height = "100vh"
    loadingScreen.style.position = "fixed"
    loadingScreen.style.left = "0"
    loadingScreen.style.top = "0"
    loadingScreen.style.zIndex = "9999999999"
    loadingScreen.style.display = "flex"
    loadingScreen.style.justifyContent = "center"
    loadingScreen.style.alignItems = "center"
    document.body.style.overflowX = "hidden"
    document.body.style.overflowY = "hidden"

    let loaderElem = document.createElement("div")
    loaderElem.id = "gazetimator-loader-elem-exp-ongoing"

    loadingScreen.appendChild(loaderElem)

    document.body.appendChild(loadingScreen)
    console.log("Showing Loading Screen...")
}

const removeLoadingScreen = (loadingScreenElem) => {
    if(loadingScreenElem != null || loadingScreenElem != undefined)
    {
        document.body.removeChild(loadingScreenElem)
        document.body.style.overflowX = "scroll"
        document.body.style.overflowY = "scroll"
        console.log("Removed Loading Screen...")
    }
}

document.addEventListener('WebgazerReady', async () => {
    webgazerLoaded = true
    //Check if experiment was ongoing in another tab
    wasExperimentOngoing = await localforage.getItem("isExperimentOngoing")

    if(wasExperimentOngoing === true){
        showLoadingScreen()
        turnOnWebgazer()
        // hideFloatingMenuBtn()
    }
    //Handling the continuation of the experiment in the mutator at the top of the script
})

const continueExperiment = async () => {
    //Setting this global flag so that the mutator does not execute this multiple times
    experimentContinued = true
    window.addEventListener('keydown', handleKeyDownExperiment)
    // turnOnWebgazer()
    hideFloatingMenuBtn()
    let tempData = await localforage.getItem("experimentData") || { }
    setExperimentData(tempData)

    toggleGazePredictionSaver('Start')
    console.log("Started saving gaze estimates.")
    toggleMouseClickSaver('Start')
    console.log("Started saving mouse clicks.")
    timeStarted = new Date()
    console.log("Started saving time elapsed.")
}

const startExperiment = () => {
    recordedCoords = []
    mouseClicks = []
    localforage.setItem('isExperimentOngoing', true)
    toggleGazePredictionSaver('Start')
    toggleMouseClickSaver('Start')
    resumeWebgazer()
    timeStarted = new Date()
    console.log("Started time.")
}

document.addEventListener('ExperimentReadyToStart', () => {
    handleExperimentReadyToStartClicked()
})

document.addEventListener('StopExperiment', () => {
    handleStopExperiment()
})

document.addEventListener("ModelInfoClicked", () => {
    handleModelInfoClicked()
})

document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (event) => {
        if(operation === true || wasExperimentOngoing === true){
            let startTime = timeStarted
            let endTime = new Date()
            appendToExperimentCoordsArray(recordedCoords, mouseClicks, startTime, endTime, window.location.href)
        }
    });
});