


const run = async()=>{

    const stream = await navigator.mediaDevices.getUserMedia({
        video: true, 
        audio: false,
    })

    const videoFeedEl = document.getElementById("video-feed")
    videoFeedEl.srcObject = stream

    await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
        faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
        faceapi.nets.ageGenderNet.loadFromUri('./models'),
        faceapi.nets.faceExpressionNet.loadFromUri('./models'),
    ])

    const canvas = document.getElementById('canvas')
    canvas.style.left = videoFeedEl.offsetLeft 
    canvas.style.top = videoFeedEl.offsetTop
    canvas.height = videoFeedEl.height
    canvas.width = videoFeedEl.width

   

    /*setInterval(async ()=>{
        let faceAIData = await faceapi.detectAllFaces(videoFeedEl).withFaceLandmarks().withFaceDescriptors()

        console.log(faceAIData)

        faceAIData.forEach(face => {
            const {detection, descriptor} = face
            console.log(detection)
            console.log(descriptor)
            //send an http post to localhost:3000/post-descriptor with the descriptor using fetch
            let descriptorArray = Array.from(descriptor)
            fetch('http://thingsboard.cloud/api/v1/nl8DAkF4CcBDv1AUDxOh/telemetry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                //no cors
                mode: 'no-cors',
                body: JSON.stringify({
                    "descriptor": descriptorArray
                })
            })
        });

    },200)*/

    const authenticateFace = async(descriptor , interval) =>{
        clearInterval(interval)
        try {

            const response = await fetch('https://c849-190-130-222-118.ngrok-free.app/check-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                mode: 'no-cors',
                body: JSON.stringify({
                    "descriptor": descriptor
                })
            })
            console.log(response)
        } catch (error) {
            console.error('Error:', error)
        }

        confirnmFace()
    }

    const confirnmFace = () => {
        const interval = setInterval(async ()=>{
        let faceAIData = await faceapi.detectAllFaces(videoFeedEl).withFaceLandmarks().withFaceDescriptors()
        faceAIData.forEach(face => {
            const {detection, descriptor} = face
           if(detection._score > 0.8){
            authenticateFace(descriptor , interval)
           }
        });

        },500) 
    }


    confirnmFace()

}
run()