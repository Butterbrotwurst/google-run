const express = require("express");
const app = express();

app.use(express.json());

// Health / Test
app.get("/", (req, res) => {
  res.status(200).send("OK - glb-generator-api is running");
});

// Beispiel: Adresse rein -> (später GLB) -> jetzt Demo-JSON zurück
app.post("/generate", async (req, res) => {
  const { address } = req.body || {};
  if (!address) return res.status(400).json({ error: "address fehlt" });

  // TODO: hier später: Geocoding -> 3D -> GLB erzeugen -> in Storage speichern
  return res.json({
    address,
    status: "demo",
    glb_url: "https://example.com/demo.glb"
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`Listening on ${port}`));

