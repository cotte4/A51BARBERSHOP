import { removeBackground } from "@imgly/background-removal-node";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public/ar-test");

const files = [
  { input: "avatar-francisco.jpg", output: "avatar-francisco-nobg.png" },
  { input: "avatar-lautaro.jpg",   output: "avatar-lautaro-nobg.png"   },
];

for (const { input, output } of files) {
  const inputPath  = join(publicDir, input);
  const outputPath = join(publicDir, output);

  console.log(`Processing ${input}...`);
  const blob = new Blob([readFileSync(inputPath)], { type: "image/jpeg" });
  const result = await removeBackground(blob);
  const buf = Buffer.from(await result.arrayBuffer());
  writeFileSync(outputPath, buf);
  console.log(`  ✓ Saved ${output} (${(buf.length / 1024).toFixed(0)} KB)`);
}

console.log("Done.");
