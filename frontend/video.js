const run = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  const videoFeedEl = document.getElementById("video-feed");
  videoFeedEl.srcObject = stream;

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("./models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("./models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("./models"),
    faceapi.nets.ageGenderNet.loadFromUri("./models"),
    faceapi.nets.faceExpressionNet.loadFromUri("./models"),
  ]);

  console.log("Modelos cargados");

  const canvas = document.getElementById("canvas");
  canvas.style.left = videoFeedEl.offsetLeft + "px";
  canvas.style.top = videoFeedEl.offsetTop + "px";
  canvas.height = videoFeedEl.height;
  canvas.width = videoFeedEl.width;

  const clearCanvas = () => {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const writeText = (text) => {
    const ctx = canvas.getContext("2d");
    ctx.font = "30px Arial";
    ctx.fillStyle = text === "unknown" ? "red" : "green";
    ctx.fillText(text, 10, 50);
  };

  const authenticateFace = async (descriptorArray) => {
    try {
      const response = await axios.post("http://localhost:5000/check-face", {
        descriptor: descriptorArray,
      });
      console.log(response.data.result);
      clearCanvas();
      writeText(response.data.result._label);
    } catch (error) {
      console.error(error);
    }
  };

  const confirnmFace = async () => {
    clearCanvas();
    let faceAIData = await faceapi
      .detectAllFaces(videoFeedEl)
      .withFaceLandmarks()
      .withFaceDescriptors();

    for (const face of faceAIData) {
      const { detection, descriptor } = face;
      if (detection._score > 0.8) {
        let descriptorArray = Array.from(descriptor);
        await authenticateFace(descriptorArray);
      }
    }

    // Llamar a la función de nuevo después de que la tarea anterior haya terminado
    setTimeout(confirnmFace, 500);
  };

  confirnmFace();
};

run();
