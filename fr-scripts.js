

const run = async()=>{
    //we need to load our models
    //loading the models is going to use await
    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
        faceapi.nets.ageGenderNet.loadFromUri('./models'),
    ])

    
    const refFace = await faceapi.fetchImage('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ae/Michael_Jordan_in_2014.jpg/220px-Michael_Jordan_in_2014.jpg')
    const facesToCheck = await faceapi.fetchImage('https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/JordanSmithWorthy2.jpg/170px-JordanSmithWorthy2.jpg')

    let refFaceAIData = await faceapi.detectAllFaces(refFace).withFaceLandmarks().withFaceDescriptors()
    let facesToCheckAIData = await faceapi.detectAllFaces(facesToCheck).withFaceLandmarks().withFaceDescriptors()
    
    const canvas = document.getElementById('canvas')

    faceapi.matchDimensions(canvas,facesToCheck)


    let faceMatcher = new faceapi.FaceMatcher(refFaceAIData)
    facesToCheckAIData = faceapi.resizeResults(facesToCheckAIData,facesToCheck)

    facesToCheckAIData.forEach(face => {
        const { detection , descriptor} = face
        let label = faceMatcher.findBestMatch(descriptor).toString()
        console.log(label)
        
        if(label.includes("unknown")){
            return 
        }
        let options = {label: "Jordan"}
        const drawBox = new faceapi.draw.DrawBox(detection.box,options)
        drawBox.draw(canvas)
        
    });
}

run()