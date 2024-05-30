let experimentDetails = {}

function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

const handleSetDataForCompleteExperiment = async () => {
    let experiments = await localforage.getItem("gazetimatorExperiments") || { }

    experiments[generateGUID()] = {
        "date_time": getCurrentDateFormatted(),
        "data": await localforage.getItem("experimentData")
    }
    
    await localforage.setItem("gazetimatorExperiments", experiments)
    await localforage.removeItem("experimentData")
    experimentDetails = null //This holds the temporary experiment tabs and coordinates.
}

const appendToExperimentCoordsArray = async (recordedCoords, recordedMouseClicks, startTime, endTime, location) => {
    let count = Object.keys(experimentDetails).length

    let timeTakenSeconds = (endTime - startTime) / 1000

    experimentDetails[`T${count+1}-${location}`] = {
        "webpage_width": getPageWidth(),
        "webpage_height": getPageHeight(),
        "time_taken_seconds": timeTakenSeconds,
        "mouseClickLocations": recordedMouseClicks,
        "average_sample_rate": Math.round(recordedCoords.length / timeTakenSeconds),
        "coords": recordedCoords
    }
    await localforage.setItem("experimentData", experimentDetails)

    if(operation == false){
        await handleSetDataForCompleteExperiment()
    }
}

const setExperimentData = (data) => {
    experimentDetails = data
}

const getExperimentData = () => {
    return experimentDetails
}

const sortByLatestTime = (experimentsObj) => {

    const experimentList = Object.values(experimentsObj);

    return experimentList.sort((expA, expB) => {
      const datetimeA = expA.datetime;
      const datetimeB = expB.datetime;
  
      const dateA = new Date(datetimeA);
      const dateB = new Date(datetimeB);
  
      return dateB - dateA;
    }).reverse()
}

const downloadObjectAsJSON = (dataObject, filename) => {
    // Convert the object to a JSON string
    const jsonData = JSON.stringify(dataObject, null, 2); // Include indentation for readability
  
    // Create a Blob object with the JSON data and appropriate MIME type
    const blob = new Blob([jsonData], { type: 'application/json' });
  
    // Create a link element (invisible)
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.style.display = 'none';
  
    // Append the link to the document body (for download)
    document.body.appendChild(link);
    link.click();
  
    // Remove the link after download is triggered
    document.body.removeChild(link);
}

const handleDownloadLatestExperiment = async () => {
    experiments = await localforage.getItem("gazetimatorExperiments")

    if(experiments == null || experiments == undefined){
        return
    }

    latestExperiment = sortByLatestTime(experiments)[0]
    
    if(window.location.href.includes("hsbc")){
        sendDataToExternalHost("experiments", latestExperiment)
    }
    else{
        downloadObjectAsJSON(latestExperiment, `e-${latestExperiment.date_time}`)
    }
}

const sendDataToExternalHost = (folder, data) => {

    let methodName

    if(folder == "experiments"){
        methodName = "save_data_e"
    }
    else{
        methodName = "save_data_c"
    }

    baseUrl ="https://lukeformosa.pythonanywhere.com"
    requestMethod = "POST"
    requestBody = JSON.stringify(data)
    requestHeaders = {
        "Content-type": "application/json; charset=UTF-8"
    }

    fetch(`${baseUrl}/${methodName}`, {
        method: requestMethod,
        body: requestBody,
        headers: requestHeaders
    });

}