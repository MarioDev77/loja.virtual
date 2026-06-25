'use strict';

/**
 * upload.js — middleware de upload de imagens seguro
 *
 * Proteções:
 *  - Só aceita JPEG, PNG e WebP (validação por magic bytes, não extensão)
 *  - Limite de tamanho: 5MB por arquivo
 *  - Filename gerado por nanoid (nunca usa nome original do cliente)
 *  - Armazenamento em disco em pasta configurável (fora do webroot)
 *  - Processamento com sharp: redimensiona, converte para WebP, remove EXIF/metadata
 *  - Sem path traversal: destino fixo, nome sanitizado
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// ─── Pasta de destino ─────────────────────────────────────────────────────────
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, '../../uploads');

// Garante que a pasta existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true, mode: 0o750 });
}

// ─── Magic bytes permitidos ───────────────────────────────────────────────────
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAGIC = [
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },       // JPEG
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },  // PNG
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // WebP (RIFF)
];

function detectMimeFromBuffer(buf) {
  for (const { bytes, mime } of MAGIC) {
    if (bytes.every((b, i) => buf[i] === b)) return mime;
  }
  return null;
}

// ─── Multer — memória temporária (não grava raw no disco) ────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Validação pelo mimetype declarado (primeira barreira)
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(Object.assign(new Error('Only JPEG, PNG and WebP images are allowed'), { status: 415 }));
    }
    cb(null, true);
  },
});

// ─── Middleware de processamento pós-upload ───────────────────────────────────
async function processImage(req, res, next) {
  if (!req.file) return next();

  try {
    // Validação por magic bytes (segunda barreira — ignora extensão/mimetype do cliente)
    const detectedMime = detectMimeFromBuffer(req.file.buffer);
    if (!detectedMime) {
      return res.status(415).json({ error: 'Invalid image file' });
    }

    // Nome aleatório seguro — nunca usa originalname
    const safeFilename = `${crypto.randomBytes(16).toString('hex')}.webp`;
    const destPath = path.join(UPLOAD_DIR, safeFilename);

    // Processa com sharp:
    //  - Converte tudo para WebP (consistência + compressão)
    //  - Redimensiona se maior que 1200px (mantém aspect ratio)
    //  - Strip de todos os metadados (EXIF, GPS, ICC, XMP…)
    await sharp(req.file.buffer)
      .rotate()                    // corrige orientação EXIF antes de strip
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .withMetadata(false)         // remove EXIF / GPS / ICC
      .toFile(destPath);

    // Expõe para o controller
    req.uploadedFile = {
      filename: safeFilename,
      path: destPath,
      // URL pública relativa — o controller monta a URL completa
      url: `/uploads/${safeFilename}`,
    };

    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Middleware completo: multer + validação magic bytes + sharp.
 * Uso: router.post('/upload', uploadImage, handler)
 */
function uploadImage(req, res, next) {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE')
        return res.status(413).json({ error: 'Image too large. Max 5MB.' });
      if (err.status) return res.status(err.status).json({ error: err.message });
      return next(err);
    }
    processImage(req, res, next);
  });
}

module.exports = { uploadImage, UPLOAD_DIR };
