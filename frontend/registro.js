const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('capture');
const progressBar = document.getElementById('progress');
const labelInput = document.getElementById('label');

Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromUri('./models'),
  faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
  faceapi.nets.faceRecognitionNet.loadFromUri('./models')
]).then(startVideo);

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => video.srcObject = stream,
    err => console.error(err)
  );
}

captureButton.addEventListener('click', async () => {
  const label = labelInput.value;
  if (!label) {
    alert('Por favor, ingresa una etiqueta para la cara.');
    return;
  }

  let descriptors = [];
  progressBar.value = 0;

  while (descriptors.length < 10) {
    const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
    if (detections.length === 1) {
      const detection = detections[0].detection;
      const descriptor = detections[0].descriptor;
      if (detection._score > 0.93) {
        //descriptor es un array de 128 elementos
        descriptorArray = Array.from(descriptor);
        descriptors.push(descriptorArray);
        progressBar.value = descriptors.length;
      } else {
        console.log('La veracidad de la cara es menor a 0.93');
      }
    } else {
      console.log('Debe haber exactamente una cara en la cámara.');
    }
  }

  const response = await axios.post('http://localhost:5000/post-face', {
    label: label,
    descriptors: descriptors
  });

  console.log(response.data);
});