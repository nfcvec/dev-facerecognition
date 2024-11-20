const express = require("express");
const faceapi = require("face-api.js");
const fs = require("fs");
const { Canvas, Image } = require("canvas");
const { Vector } = require("vectorious");
const cors = require("cors");
faceapi.env.monkeyPatch({ Canvas, Image });

const app = express();

const path = require("path");

app.use(express.static(path.join(__dirname, "frontend")));
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

const dataFilePath = path.join(__dirname, "faces.json");

async function LoadModels() {
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models");
}
LoadModels();

function readDataFromFile() {
  if (!fs.existsSync(dataFilePath)) {
    fs.writeFileSync(dataFilePath, JSON.stringify([]));
  }
  const data = fs.readFileSync(dataFilePath);
  return JSON.parse(data);
}

function writeDataToFile(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
}

async function uploadLabeledDescriptors(descriptors, label) {
  try {
    console.log(new Date().toLocaleString() + ": Reading data from file...");
    const data = readDataFromFile();
    console.log(new Date().toLocaleString() + ": Data read successfully.");

    for (let i = 0; i < descriptors.length; i++) {
      console.log(new Date().toLocaleString() + ": Processing descriptor " + (i + 1) + "...");
      data.push({ label, descriptor: descriptors[i] });
      console.log(new Date().toLocaleString() + ": Descriptor " + (i + 1) + " processed successfully.");
    }

    console.log(new Date().toLocaleString() + ": Writing data to file...");
    writeDataToFile(data);
    console.log(new Date().toLocaleString() + ": Data written successfully.");

    return true;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function checkDescriptor(descriptor) {
  try {
    console.log(new Date().toLocaleString() + ": Reading data from file...");
    const data = readDataFromFile();
    console.log(new Date().toLocaleString() + ": Data read successfully.");

    if (data.length === 0) {
      return "No match found";
    }

    const labeledDescriptors = data.map((item) => {
      return new faceapi.LabeledFaceDescriptors(item.label, [new Float32Array(item.descriptor)]);
    });

    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    const bestMatchResult = faceMatcher.findBestMatch(new Float32Array(descriptor));

    return bestMatchResult;
  } catch (error) {
    console.log(error);
    return error;
  }
}

app.post("/post-face", async (req, res) => {
  const { descriptors, label } = req.body;

  if (!descriptors || !label) {
    return res.status(400).json({ message: "Descriptors and label are required." });
  }

  let result = await uploadLabeledDescriptors(descriptors, label);

  if (result === true) {
    res.json({ message: "Face data stored successfully" });
  } else {
    res.status(500).json({ message: "Something went wrong, please try again." });
  }
});

app.post("/check-face", async (req, res) => {
  console.log(new Date().toLocaleString() + ": Processing request...");
  const { descriptor } = req.body;
  console.log(new Date().toLocaleString() + ": Descriptor received.");

  if (!descriptor) {
    return res.status(400).json({ message: "Descriptor is required." });
  }

  let result = await checkDescriptor(descriptor);

  res.json({ result });
});

app.get("/get-face", async (req, res) => {
  const { label } = req.query;

  if (!label) {
    return res.status(400).json({ message: "Label is required." });
  }

  const data = readDataFromFile();
  const result = data.filter((item) => item.label === label);
  res.json(result);
});

app.get("/remove-face", async (req, res) => {
  const { label } = req.query;

  if (!label) {
    return res.status(400).json({ message: "Label is required." });
  }

  const data = readDataFromFile();
  const newData = data.filter((item) => item.label !== label);
  writeDataToFile(newData);
  res.json({ message: "Face data removed successfully" });
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running.");
});