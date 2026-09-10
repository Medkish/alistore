const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ||
  path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'images', 'uploads');

const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, Date.now() + '-' + crypto.randomBytes(4).toString('hex') + ext);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (!/\.(jpe?g|png|webp|gif)$/i.test(file.originalname || '')) {
      return cb(new Error('Only image files are allowed (jpg, png, webp, gif).'));
    }
    cb(null, true);
  }
});

module.exports = { upload, UPLOAD_DIR };