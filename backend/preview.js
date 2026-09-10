/* Local preview server - shows the built site at http://localhost:3000/alistore/
   (No database required: uses the bundled offline catalog + local storage.) */
const express = require('express');
const path = require('path');

const app = express();
const OUT = path.join(__dirname, '..', 'frontend', 'out');
const IMAGES = path.join(__dirname, '..', 'frontend', 'public', 'images');

app.use('/images', express.static(IMAGES));
app.use('/alistore', express.static(OUT));
app.get('/alistore/*', (req, res) => {
  const target = path.join(OUT, (req.path.replace(/^\/alistore\//, '') || 'index.html').split('?')[0]);
  res.sendFile(target.endsWith('.html') ? target : path.join(OUT, 'index.html'));
});

const PORT = Number(process.env.PREVIEW_PORT) || 3000;
app.listen(PORT, () => console.log('AlioStore preview: http://localhost:' + PORT + '/alistore/'));