const formatModelDataToSave = (data) => {

    let formattedData = []
    data.forEach(item => {

        leftData = item.eyes.left.patch

        leftPatch = { 
            data: Array.from(leftData.data),
            colorSpace: leftData.colorSpace,
            height: leftData.height,
            width: leftData.width
        }

        let newItem = item

        rightData = item.eyes.right.patch

        rightPatch = { 
            data: Array.from(rightData.data),
            colorSpace: rightData.colorSpace,
            height: rightData.height,
            width: rightData.width
        }

        newItem.eyes.left.patch = leftPatch
        newItem.eyes.right.patch = rightPatch

        formattedData.push(newItem)
    })
    return formattedData
}

const formatLoadedData = (data) => {

    let newData = []

    data.forEach(item => {
        leftData = item.eyes.left.patch

        let newLeftPatch = new ImageData(
            new Uint8ClampedArray(leftData.data),
            leftData.width,                       
            leftData.height                       
        );

        let newItem = item

        rightData = item.eyes.right.patch

        let newRightPatch = new ImageData(
            new Uint8ClampedArray(rightData.data),
            rightData.width,                       
            rightData.height                       
        );

        newItem.eyes.left.patch = newLeftPatch
        newItem.eyes.right.patch = newRightPatch

        newData.push(newItem)
    })

    return newData
}

const removeFile = () => {
    const fileInput = document.getElementById('gazetimator-load-model-file')
    document.body.removeChild(fileInput)
    fileInput.removeEventListener('change', () => { })
}

const appendFile = () => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.id = 'gazetimator-load-model-file'
    fileInput.style.display = 'none'
    fileInput.accept = '.json'
    document.body.appendChild(fileInput)

    fileInput.addEventListener("change", function(event) {
        const file = event.target.files[0];
        if (file && file.type === "application/json") {
            const reader = new FileReader()
            reader.onload = function(e) {
                const data = JSON.parse(e.target.result)

                formattedData = formatLoadedData(data)

                setGlobalData(formattedData)
                console.log("Model loaded into localforage.")
                removeFile()
              };
            reader.readAsText(file);
        } else {
            showAlert("error", "Please select a JSON file.");
        }
    }, false);
}

const getGlobalData = async () => {
    try {
        return await localforage.getItem('webgazerGlobalData')
    } catch (err) {
        return null
    }
}

const setGlobalData = async (data) => {
    document.dispatchEvent(new CustomEvent('ClearDataAndRestartWebgazer', { }));
    
    localforage.setItem('webgazerGlobalData', data).then((value) => {
        console.log("Model loaded successfully.");
    }).catch(function(err) {
        console.error('Error while loading model: ', err);
    });
}

const saveToFile = (data, filename) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type : 'application/json'});
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

const handleSaveModelClicked = async () => {
    data = await getGlobalData()
    saveToFile(formatModelDataToSave(data), 'model.json')
}

const handleLoadModelClicked = () => {
    appendFile()
    let loadModelFile = document.getElementById('gazetimator-load-model-file')
    console.log('Load model clicked')
    loadModelFile.click();
}

document.addEventListener('SaveModelClicked', handleSaveModelClicked)
document.addEventListener('LoadModelClicked', handleLoadModelClicked)