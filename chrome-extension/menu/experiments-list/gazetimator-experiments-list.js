let PRODUCTION_ENDPOINT = "https://generate-visualizations.azurewebsites.net/api/Generate?"
let DEVELOPMENT_ENDPOINT = "http://localhost:7071/api/Generate"

let experimentsListBackButton = undefined
let experimentsListMenuWrapper = undefined
let experiments

const base64ToBlob = (base64, mime) => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mime});
}

const downloadImagesInZip = (response, zipFilename, experiment) => {
    const zip = new JSZip();
    const heatmapsFolder = zip.folder("heatmaps");
    const saccadesAndFixationsFolder = zip.folder("saccades_and_fixations");

    let heatmaps = response["heatmaps"];
    let saccades_and_fixations = response["saccades_and_fixations"];

    heatmaps.forEach((base64, index) => {
        const filename = `image${index + 1}.png`;
        const blob = base64ToBlob(base64, "image/png");
        heatmapsFolder.file(filename, blob);
    });

    saccades_and_fixations.forEach((base64, index) => {
        const filename = `image${index + 1}.png`;
        const blob = base64ToBlob(base64, "image/png");
        saccadesAndFixationsFolder.file(filename, blob);
    });

    // Convert the experiment object to a JSON string
    const experimentJsonString = JSON.stringify(experiment);
    // Add the JSON string to the zip as a file
    zip.file("experiment.json", experimentJsonString);

    zip.generateAsync({type:"blob"}).then(function(content) {
        // Use JSZip's generateAsync method to create the zip Blob
        // Then trigger a download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(content);
        link.download = zipFilename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
};

const showLoadingCircle = () => {
    let mainContainerElem = document.getElementById('gazetimator-experiments-data-main-content')

    let loadingContainerElem = document.createElement('div')
    loadingContainerElem.id = 'gazetimator-experiment-data-loading-container'
    loadingContainerElem.classList.add('gazetimator-experiment-data-loading-container')

    loadingContainerElem.innerHTML = `
        <div class="gazetimator-experiment-data-loading-dots">
            <div></div>
            <div></div>
            <div></div>
        </div>
    `
    mainContainerElem.appendChild(loadingContainerElem)
}

const hideLoadingCircle = () => {
    let mainContainerElem = document.getElementById('gazetimator-experiments-data-main-content')
    let loadingContainerElem = document.getElementById('gazetimator-experiment-data-loading-container')
    mainContainerElem.removeChild(loadingContainerElem)
}

const callAPI = async (endpoint, body) => {
    showLoadingCircle()
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', endpoint);

        xhr.setRequestHeader('Content-Type', 'application/json');

        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText));
                hideLoadingCircle()
            } else {

                let error = `Request failed with status: ${xhr.status}\n${xhr.responseText}`
                reject(new Error(error));
                hideLoadingCircle()
            }
        };

        xhr.onerror = function() {
            reject(new Error('Network error'));
            hideLoadingCircle()
        };

        xhr.send(JSON.stringify(body));
    });
}

const handleExperimentDownloadClicked = async (experimentId) => {
    let experiment = experiments[experimentId]
    let experimentData = experiment["data"]
    let isExperimentEmpty = Object.keys(experimentData).length <= 0

    if(isExperimentEmpty){
        showAlert("error", "The experiment you are trying to download is empty.")
        return
    }

    console.log(`Experiment with ID: ${experimentId} clicked.`)
    let response

    await callAPI(PRODUCTION_ENDPOINT, experiment)
    .then(data => {
        response = data
        downloadImagesInZip(response, "experiment.zip", experiment);
    })
    .catch(error => {
        console.error('API call failed:', error);

        const zip = new JSZip();
        const experimentJsonString = JSON.stringify(experiment);
        zip.file("experiment.json", experimentJsonString);
        zip.generateAsync({type:"blob"}).then(function(content) {
            // Use JSZip's generateAsync method to create the zip Blob
            // Then trigger a download
            const link = document.createElement("a");
            link.href = URL.createObjectURL(content);
            link.download = "experiment";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    });
}

const downloadObjectAsJson = (exportObj) => {
    let exportName = "experiment"
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // Required for Firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

const handleExperimentsListBackButtonClicked = () => {
    closeExperimentsListMenu()
    showMenu()
}

const updateExperiments = async () => {

    let experimentsListParent = document.getElementById("gazetimator-experiments-list")
    experimentsListParent.innerHTML = ""
    experiments = await localforage.getItem("gazetimatorExperiments")

    if(experiments == null || experiments == undefined)
        return

    Object.entries(experiments).forEach(([key, experiment]) => {
        let experimentTempElem = document.createElement("li")
        experimentTempElem.classList.add("gazetimator-experiment-data-entry")
        experimentTempElem.id = `gazetimator-experiment-data-${experiment["id"]}`
        experimentTempElem.innerHTML = `
            <p class="gazetimator-experiment-data-entry-date-and-time">${experiment["date_time"]}</p>
            <p class="gazetimator-experiment-data-entry-text">Click to download results!</p>
        `
        experimentsListParent.appendChild(experimentTempElem)

        experimentTempElem.addEventListener("click", () => {
            handleExperimentDownloadClicked(key)
        })
    })
}

const showExperimentsListMenu = async () => {
    updateExperiments()
    experimentsListMenuWrapper.style.opacity = 1
    experimentsListMenuWrapper.style.zIndex = 99999999
}

const closeExperimentsListMenu = () => {
    experimentsListMenuWrapper.style.opacity = 0
    setTimeout(() => {
        experimentsListMenuWrapper.style.zIndex = -1
    }, 250)   
}

const initExperimentsListMenu = () => {
    experimentsListMenu = document.createElement('div')
    experimentsListMenu.id = 'gazetimator-model-info-menu-wrapper'
    experimentsListMenu.classList.add('gazetimator-model-info-menu-wrapper')
    document.body.appendChild(experimentsListMenu)

    experimentsListMenu.innerHTML = `
    <div class="gazetimator-experiments-data-menu-container">
        <div id="gazetimator-experiments-data-main-content" class="gazetimator-experiments-data-main-content">
            <div class="gazetimator-experiments-data-title-container">
                <div id="gazetimator-experiment-data-back-button-container" class="gazetimator-experiment-data-back-button-container">
                    <div class="gazetimator-experiment-data-back-button" id="gazetimator-experiment-data-back-button">
                        <div class="gazetimator-experiment-data-back-button-img"></div>
                        <div class="gazetimator-experiment-data-back-button-text">Back</div>
                    </div>
                </div>
                <p>List of Experiments Conducted</p>
                <div class="gazetimator-experiment-data-top-right-menu-controls-container"></div>
            </div>
            <div class="gazetimator-experiment-data-middle-container">
                <div class="gazetimator-experiment-data-middle-dashboard">
                    <ul id="gazetimator-experiments-list" class="gazetimator-experiments-list">
                        
                    </ul>
                </div>
            </div>
            <div class="gazetimator-experiment-data-footer-container">
                <p>Developed by Luke Formosa for a dissertation study (BSc), 2023-2024&copy;.</p>
            </div>
        </div>
    </div>
    `
    experimentsListMenuWrapper = experimentsListMenu
    backButton = document.getElementById('gazetimator-experiment-data-back-button')
    backButton.addEventListener('click', () => { handleExperimentsListBackButtonClicked() })
}

initExperimentsListMenu()