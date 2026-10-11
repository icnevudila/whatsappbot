'use strict';
const path = require('node:path');
const MEDIA_EXTENSIONS = new Set(['.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm','.mp3','.wav','.ogg','.m4a']);
function isPublicMediaFilename(filename) {
  return typeof filename === 'string' && MEDIA_EXTENSIONS.has(path.extname(filename).toLowerCase());
}
module.exports = { isPublicMediaFilename };
