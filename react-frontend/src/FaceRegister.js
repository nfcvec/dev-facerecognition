import { useEffect, useRef, useState } from "react";
import {
  Button,
  TextField,
  CircularProgress,
  Box,
  Dialog,
  DialogContent,
  DialogContentText,
  Typography,
} from "@mui/material";
import axios from "axios";
import * as faceapi from "face-api.js";

const FaceRegistration = () => {
  const videoRef = useRef(null);
  const [label, setLabel] = useState("");
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(
    "Por favor, mueve tu cara para capturar diferentes ángulos."
  );
  const [faces, setFaces] = useState([]);

  useEffect(() => {
    Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]).then(() => {
      setLoading(false);
      startVideo();
    });
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error(err));
  };

  const handleCapture = async () => {
    if (!label) {
      alert("Por favor, ingresa una etiqueta para la cara.");
      return;
    }

    let descriptors = [];
    setProgress(0);

    while (descriptors.length < 10) {
      const detections = await faceapi
        .detectAllFaces(videoRef.current)
        .withFaceLandmarks()
        .withFaceDescriptors();
      if (detections.length === 1) {
        const detection = detections[0].detection;
        const descriptor = detections[0].descriptor;
        if (detection._score > 0.93) {
          if (
            descriptors.length === 0 ||
            faceapi.euclideanDistance(
              descriptor,
              descriptors[descriptors.length - 1]
            ) > 0.4
          ) {
            descriptors.push(Array.from(descriptor));
            setProgress(descriptors.length);
            setMessage("Buen trabajo! Sigue moviendo tu cara.");
          } else {
            setMessage(
              "Por favor, mueve tu cara para capturar diferentes ángulos."
            );
          }
        } else {
          setMessage("La veracidad de la cara es menor a 0.93");
        }
      } else {
        setMessage("Debe haber exactamente una cara en la cámara.");
      }
    }

    const response = await axios.post("http://localhost:5000/post-face", {
      label: label,
      descriptors: descriptors,
    });

    setMessage(response.data.message);

    console.log(response.data);
  };

  const handleGetFaces = async () => {
    if (!label) {
      alert("Por favor, ingresa una etiqueta para obtener las caras.");
      return;
    }

    const response = await axios.get(
      "http://localhost:5000/get-face?label=" + label
    );
    // devuelve el numero de registros en la tabla faces
    console.log(response.data);
    setFaces(response.data);
  };

  const handleRemoveFace = async () => {
    if (!label) {
      alert("Por favor, ingresa una etiqueta para eliminar.");
      return;
    }

    const response = await axios.get(
      "http://localhost:5000/remove-face?label=" + label
    );

    console.log(response.data);
    setMessage(response.data.message);
  };

  return (
    <Box p={4}>
      <Typography
        variant="h1"
        style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}
      >
        Registro de Cara
      </Typography>
      <TextField
        label="Etiqueta de la cara"
        variant="outlined"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        fullWidth
        style={{ marginBottom: "1rem" }}
      />
      <video
        ref={videoRef}
        style={{ width: "100%", maxHeight: "480px", marginBottom: "1rem" }}
        autoPlay
        muted
      ></video>
      <Box
        p={2}
        style={{
          marginBottom: "1rem",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        <Typography
          variant="h2"
          style={{
            fontSize: "1.5rem",
            fontWeight: "bold",
            marginBottom: "0.5rem",
          }}
        >
          Información de Detección
        </Typography>
        <Typography>Progreso: {progress} / 10</Typography>
        <Typography>Etiqueta: {label}</Typography>
        <Typography>{message}</Typography>
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={handleCapture}
        style={{ marginBottom: "1rem" }}
      >
        Capturar
      </Button>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleGetFaces}
        style={{ marginBottom: "1rem" }}
      >
        Obtener Caras
      </Button>
      <Button
        variant="contained"
        color="error"
        onClick={handleRemoveFace}
        style={{ marginBottom: "1rem" }}
      >
        Eliminar Cara
      </Button>
      <CircularProgress variant="determinate" value={(progress / 10) * 100} />
      <Dialog open={loading}>
        <DialogContent>
          <DialogContentText>
            Cargando modelos, por favor espera...
          </DialogContentText>
          <CircularProgress />
        </DialogContent>
      </Dialog>
      <Box>Cuenta de registros en la tabla 'faces': {faces.length}</Box>
    </Box>
  );
};

export default FaceRegistration;
