const express = require("express");
const app = express();

app.use(express.json());

app.post("/generate", (req, res) => {
  const { address } = req.body;

  // Platzhalter – hier kommt später deine GLB-Logik rein
  res.json({
    message: "GLB würde hier generiert werden",
    address: address || "keine Adresse übergeben"
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server läuft auf Port", PORT);
});
