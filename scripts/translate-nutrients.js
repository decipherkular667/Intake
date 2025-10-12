// scripts/translate-nutrients.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const GOOGLE_TRANSLATE_API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

if (!GOOGLE_TRANSLATE_API_KEY) {
  console.error('GOOGLE_TRANSLATE_API_KEY not found in environment variables');
  process.exit(1);
}

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Batch translate function
async function translateTexts(texts, targetLanguage = 'zh') {
  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: texts,
        source: 'en',
        target: targetLanguage,
        format: 'text'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Translate API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.data?.translations?.map(t => t.translatedText) || texts;
  } catch (error) {
    console.error('Translation error:', error);
    return texts; // Return original texts as fallback
  }
}

async function translateNutrients() {
  // Read the original nutrients.json file
  const nutrientsPath = path.join(__dirname, '../server/data/nutrients.json');
  const nutrients = JSON.parse(fs.readFileSync(nutrientsPath, 'utf8'));

  const translatedData = {
    en: {},
    zh: {}
  };

  console.log(`Starting translation of ${nutrients.length} nutrients...`);

  for (let i = 0; i < nutrients.length; i++) {
    const nutrient = nutrients[i];
    console.log(`\nTranslating ${i + 1}/${nutrients.length}: ${nutrient.name}`);

    // Store English version
    translatedData.en[nutrient.name] = { ...nutrient };

    // Collect all texts to translate for this nutrient
    const textsToTranslate = [
      nutrient.name,
      nutrient.description,
      ...nutrient.benefits,
      ...nutrient.sources,
      nutrient.unit
    ];

    console.log(`  - Translating ${textsToTranslate.length} text segments...`);

    // Translate all texts at once
    const translations = await translateTexts(textsToTranslate, 'zh');

    // Map translations back to structure
    let translationIndex = 0;
    translatedData.zh[nutrient.name] = {
      name: translations[translationIndex++],
      description: translations[translationIndex++],
      benefits: nutrient.benefits.map(() => translations[translationIndex++]),
      sources: nutrient.sources.map(() => translations[translationIndex++]),
      unit: translations[translationIndex++],
      dailyValue: nutrient.dailyValue // Keep numeric value unchanged
    };

    console.log(`  ✓ Completed: ${nutrient.name} -> ${translatedData.zh[nutrient.name].name}`);

    // Add delay between nutrients to avoid rate limiting
    await delay(500);
  }

  // Write the translated data to file
  const outputPath = path.join(__dirname, '../client/src/data/nutrients-translated.ts');
  const outputContent = `// Auto-generated translated nutrient data
// Generated on: ${new Date().toISOString()}

export const nutrientData = ${JSON.stringify(translatedData, null, 2)};

export type Language = 'en' | 'zh';

export function getNutrientInfo(name: string, language: Language) {
  return nutrientData[language]?.[name];
}
`;

  // Ensure the directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, outputContent);
  
  console.log(`\n🎉 Translation complete!`);
  console.log(`📁 Output saved to: ${outputPath}`);
  console.log(`📊 Translated ${nutrients.length} nutrients`);
  console.log(`🌐 Available languages: English, Chinese`);
}

// Run the translation
translateNutrients().catch(error => {
  console.error('Script failed:', error);
  process.exit(1);
});