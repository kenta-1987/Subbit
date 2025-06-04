const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('🎉 Subbit is running on Railway!');
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
