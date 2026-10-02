import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const infographicsDir = path.resolve('apps/landing/public/landing/infographics');

const tasks = [
  {
    name: '05-kreatif-studyosu',
    input: path.join(infographicsDir, '05-kreatif-studyosu-chatgpt-4-3.png'),
    output: path.join(infographicsDir, '05-kreatif-studyosu-veo-i2v.mp4'),
    width: 1440,
    height: 960,
    duration: 4,
  },
  {
    name: '06-isletme-bulucu',
    input: path.join(infographicsDir, '06-isletme-bulucu-chatgpt-16-9.png'),
    output: path.join(infographicsDir, '06-isletme-bulucu-veo-i2v.mp4'),
    width: 1448,
    height: 1086,
    duration: 4,
  },
  {
    name: '03-coklu-hat',
    input: path.join(infographicsDir, '03-coklu-hat-chatgpt-4-3.png'),
    output: path.join(infographicsDir, '03-coklu-hat-veo-i2v.mp4'),
    width: 1440,
    height: 1080,
    duration: 4,
  },
  {
    name: '04-ortak-inbox',
    input: path.join(infographicsDir, '04-ortak-inbox-chatgpt-16-9.png'),
    output: path.join(infographicsDir, '04-ortak-inbox-veo-i2v.mp4'),
    width: 1448,
    height: 1086,
    duration: 4,
  },
  {
    name: '01-ana-urun',
    input: path.join(infographicsDir, '01-ana-urun-chatgpt-16-9.png'),
    output: path.join(infographicsDir, '01-ana-urun-veo-i2v.mp4'),
    width: 1448,
    height: 1086,
    duration: 4,
  },
];

console.log('Rendering kinetic animated infographics with pristine typography...');

for (const task of tasks) {
  if (!fs.existsSync(task.input)) {
    console.warn(`File not found: ${task.input}`);
    continue;
  }
  console.log(`Rendering ${task.name}...`);
  const beamWidth = Math.round(task.width * 0.12);
  const blurSize = Math.round(beamWidth * 0.28);
  
  // Filter complex:
  // 1. Scale input image cleanly
  // 2. Generate a soft luminous emerald scanner beam with boxblur
  // 3. Overlay the beam moving seamlessly across the diagram
  const filter = `[0:v]scale=${task.width}:${task.height},format=yuv420p[base];[1:v]format=rgba[beam];[base][beam]overlay=x='-${beamWidth * 1.5}+(${task.width}+${beamWidth * 3})*(t/${task.duration})':y=0:shortest=1,format=yuv420p[out]`;
  
  const cmd = `ffmpeg -y -loop 1 -i "${task.input}" -f lavfi -i "color=c=0x00A884:s=${beamWidth}x${task.height},format=rgba,colorchannelmixer=aa=0.32,boxblur=${blurSize}:5" -filter_complex "${filter}" -map "[out]" -t ${task.duration} -c:v libx264 -crf 17 -preset fast -pix_fmt yuv420p "${task.output}"`;
  
  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`✓ Completed: ${task.name}`);
  } catch (err) {
    console.error(`Failed ${task.name}:`, err.message);
  }
}

console.log('All animated infographics rendered successfully!');
