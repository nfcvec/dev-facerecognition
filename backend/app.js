const express = require("express");
const faceapi = require("face-api.js");
const { Pool } = require("pg");
const { Canvas, Image } = require("canvas");
//import cors
const cors = require("cors");
faceapi.env.monkeyPatch({ Canvas, Image });

const app = express();

const path = require("path");

//servir archivos estaticos desde la carpeta frontend
app.use(express.static(path.join(__dirname, "frontend")));

app.use(express.json()); // Para poder recibir JSON en el cuerpo de la solicitud
//use cors
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "face_api",
  password: "postgres",
  port: 5434,
});

async function LoadModels() {
  await faceapi.nets.faceRecognitionNet.loadFromDisk(__dirname + "/models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk(__dirname + "/models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(__dirname + "/models");
}
LoadModels();

async function createTable() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS vector;
      CREATE TABLE IF NOT EXISTS faces (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        description VECTOR(128)
      );
    `);

    // Contar el número de filas en la tabla 'faces'
    const result = await client.query("SELECT COUNT(*) FROM faces");
    const rowCount = result.rows[0].count;
    console.log(`Número de filas en la tabla 'faces': ${rowCount}`);
  } finally {
    client.release();
  }
}
createTable();

async function uploadLabeledDescriptors(descriptors, label) {
  try {
    console.log(
      new Date().toLocaleString() + ": Connecting to the database..."
    );
    const client = await pool.connect();
    console.log(new Date().toLocaleString() + ": Connected to the database.");
    try {
      for (let i = 0; i < descriptors.length; i++) {
        console.log(
          new Date().toLocaleString() +
            ": Processing descriptor " +
            (i + 1) +
            "..."
        );
        const descriptor = JSON.stringify(descriptors[i]);
        console.log(
          new Date().toLocaleString() + ": Descriptor " + (i + 1) + " received."
        );
        await client.query(
          "INSERT INTO faces (label, description) VALUES ($1, $2)",
          [label, descriptor]
        );
        console.log(
          new Date().toLocaleString() +
            ": Descriptor " +
            (i + 1) +
            " processed successfully."
        );
      }
    } finally {
      client.release();
    }
    return true;
  } catch (error) {
    console.log(error);
    return error;
  }
}

async function checkDescriptor(descriptor) {
  const client = await pool.connect();
  try {
    console.log(new Date().toLocaleString() + ": Processing descriptor...");
    const descriptorString = JSON.stringify(descriptor);

    // Query the database for the closest matches (e.g., top 5)
    const res = await client.query(
      `SELECT label, description
       FROM faces
       ORDER BY description <-> $1::vector
       LIMIT 5`,
      [descriptorString]
    );
    console.log(new Date().toLocaleString() + ": Query executed.");

    if (res.rows.length === 0) {
      return "No match found";
    }

    // Convert the results to LabeledFaceDescriptors
    const labeledDescriptors = res.rows.map((row) => {
      return new faceapi.LabeledFaceDescriptors(row.label, [
        new Float32Array(JSON.parse(row.description)),
      ]);
    });
    console.log(new Date().toLocaleString() + ": Labeled descriptors created.");

    // Create a FaceMatcher with the labeled descriptors
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
    console.log(new Date().toLocaleString() + ": Face matcher created.");

    // Find the best match
    const bestMatchResult = faceMatcher.findBestMatch(
      new Float32Array(descriptor)
    );
    console.log(new Date().toLocaleString() + ": Best match result found.");

    return bestMatchResult;
  } finally {
    client.release();
  }
}

// Ruta para subir descriptores etiquetados
app.post("/post-face", async (req, res) => {
  const { descriptors, label } = req.body;

  if (!descriptors || !label) {
    return res
      .status(400)
      .json({ message: "Descriptors and label are required." });
  }

  let result = await uploadLabeledDescriptors(descriptors, label);

  if (result === true) {
    res.json({ message: "Face data stored successfully" });
  } else {
    res
      .status(500)
      .json({ message: "Something went wrong, please try again." });
  }
});

// Ruta para verificar un descriptor

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
  const client = await pool.connect();
  const { label } = req.query;

  if (!label) {
    return res.status(400).json({ message: "Label is required." });
  }

  try {
    const result = await client.query("SELECT * FROM faces WHERE label = $1", [
      label,
    ]);
    res.json(result.rows);
  } finally {
    client.release();
  }
});

app.get("/remove-face", async (req, res) => {
  const { label } = req.query;

  if (!label) {
    return res.status(400).json({ message: "Label is required." });
  }

  const client = await pool.connect();
  try {
    await client.query("DELETE FROM faces WHERE label = $1", [label]);
    res.json({ message: "Face data removed successfully" });
  } finally {
    client.release();
  }
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server is running.");
});
