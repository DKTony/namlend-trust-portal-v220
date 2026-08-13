import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const distDirectory = path.resolve(process.cwd(), 'dist');
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const requiredAssets = [
  { fileName: 'og-financial-logo-v2.svg', type: 'svg' },
  { fileName: 'og-financial-favicon-v2.svg', type: 'svg' },
  { fileName: 'og-financial-social-v2.png', type: 'png' },
];

function assertSvg(fileName, contents) {
  const source = contents
    .toString('utf8')
    .replace(/^\uFEFF/, '')
    .trimStart();

  if (!source.startsWith('<svg') && !source.startsWith('<?xml')) {
    throw new Error(`${fileName} is not valid SVG content`);
  }

  if (!/<svg(?:\s|>)/i.test(source) || /<!doctype\s+html|<html(?:\s|>)/i.test(source)) {
    throw new Error(`${fileName} contains HTML instead of SVG content`);
  }
}

function assertPng(fileName, contents) {
  if (contents.length < pngSignature.length || !contents.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`${fileName} does not have a valid PNG signature`);
  }
}

for (const asset of requiredAssets) {
  const assetPath = path.join(distDirectory, asset.fileName);
  const metadata = await stat(assetPath);

  if (!metadata.isFile() || metadata.size === 0) {
    throw new Error(`${asset.fileName} is missing or empty in dist`);
  }

  const contents = await readFile(assetPath);
  if (asset.type === 'svg') assertSvg(asset.fileName, contents);
  if (asset.type === 'png') assertPng(asset.fileName, contents);
}

console.log(`Verified ${requiredAssets.length} OG Financial Services brand assets in dist.`);
