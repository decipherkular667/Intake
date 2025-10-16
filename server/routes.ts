import dotenv from 'dotenv';
dotenv.config();

// Debug environment variables
console.log("=== SERVER STARTUP DEBUG ===");
console.log("Current working directory:", process.cwd());
console.log("GOOGLE_TRANSLATE_API_KEY exists:", !!process.env.GOOGLE_TRANSLATE_API_KEY);
console.log("API Key length:", process.env.GOOGLE_TRANSLATE_API_KEY?.length || 0);
console.log("============================");

import { Request, Response } from 'express';
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./database-storage";
import { insertHealthProfileSchema, insertFoodEntrySchema, apiFoodEntrySchema, insertInsightSchema } from "../shared/schema-sqlite";
import authRoutes from "./routes/auth";
import { requireAuth, optionalAuth } from "./auth-middleware";
import type { NutritionData, ConflictResult, Recommendation } from "../shared/schema-sqlite";
import axios from "axios";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v2 as translate } from '@google-cloud/translate';
import { checkRateLimit, getUserUsage } from "./rate-limiter";
import {
  NotFoundError,
  ValidationError,
  DatabaseError,
  sendSuccess,
  sendError,
  validateRequired,
  asyncHandler
} from "./error-utils";
import { wrapAsync, validateSchema, validatePartialSchema, validateQueryParams } from "./error-middleware";
import { healthMonitor } from "./health-monitor";
import { logger } from "./logger";

// Helper function to clean JSON response from markdown code blocks
function cleanJSONResponse(response: string | null): string {
  // Handle null or empty responses
  if (!response) {
    return '{}';
  }

  let cleaned = response.trim();

  // Remove markdown code blocks like ```json ... ``` or ``` ... ```
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7); // Remove ```json
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3); // Remove ```
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }

  cleaned = cleaned.trim();

  // Try to extract JSON if there's extra text around it
  // Look for JSON object {...} or array [...]
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);

  // Prefer array match for array responses, object match for object responses
  if (arrayMatch && cleaned.indexOf('[') < cleaned.indexOf('{')) {
    return arrayMatch[0];
  } else if (objectMatch) {
    return objectMatch[0];
  } else if (arrayMatch) {
    return arrayMatch[0];
  }

  return cleaned;
}

// Initialize AI client for AI-powered insights (lazy initialization)
let aiClient: OpenAI | null = null;
let openAIQuotaExhausted = false; // Circuit breaker for quota errors

function getAIClient(): OpenAI {
  if (!aiClient) {
    // If OpenAI quota is exhausted, switch to Llama
    if (openAIQuotaExhausted && process.env.HF_TOKEN) {
      console.log('🤖 Using Llama via HuggingFace for insights (OpenAI quota exhausted)');
      aiClient = new OpenAI({
        baseURL: "https://router.huggingface.co/v1",
        apiKey: process.env.HF_TOKEN,
      });
    } else if (process.env.OPENAI_API_KEY && !openAIQuotaExhausted) {
      console.log('🤖 Using OpenAI for insights');
      aiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    } else if (process.env.HF_TOKEN) {
      console.log('🤖 Using Llama via HuggingFace for insights');
      aiClient = new OpenAI({
        baseURL: "https://router.huggingface.co/v1",
        apiKey: process.env.HF_TOKEN,
      });
    }
  }
  return aiClient!;
}

// Universal AI completion with automatic OpenAI -> Llama -> fallback
async function callAIWithFallback(
  messages: Array<{role: string, content: string}>,
  options: {
    maxTokens?: number,
    temperature?: number,
    jsonMode?: boolean,
    fallbackFn?: () => Promise<any> | any
  } = {}
): Promise<string | null> {
  const { maxTokens = 4096, temperature = 0.7, jsonMode = false, fallbackFn } = options;

  // Check if any AI service is available
  if (!process.env.GOOGLE_GEMINI_API_KEY && !process.env.OPENAI_API_KEY && !process.env.HF_TOKEN) {
    console.log('⚠️  No AI API keys configured, using fallback');
    return fallbackFn ? await fallbackFn() : null;
  }

  // Use Gemini if API key is available
  const useGemini = !!process.env.GOOGLE_GEMINI_API_KEY;
  const useOpenAI = !useGemini && !!process.env.OPENAI_API_KEY && !openAIQuotaExhausted;
  const aiName = useGemini ? 'Gemini' : (useOpenAI ? 'OpenAI' : 'Llama');

  if (openAIQuotaExhausted && process.env.HF_TOKEN && !useGemini) {
    console.log('⚠️  OpenAI quota exhausted, using Llama');
  }

  try {
    console.log(`🤖 Calling ${aiName} AI...`);

    // Use Gemini API with native implementation (SDK has fetch issues)
    if (useGemini) {
      const https = await import('https');
      const dns = await import('dns');

      // Force IPv4 to avoid IPv6 routing issues
      dns.setDefaultResultOrder('ipv4first');

      const prompt = messages.map(m => m.content).join('\n\n');

      const requestBody = JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: maxTokens
        }
      });

      // Use native https module with improved connection handling
      const response = await new Promise<string>((resolve, reject) => {
        const options = {
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY2}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(requestBody),
            'User-Agent': 'IntakeAI-Health/1.0',
            'Connection': 'close'
          },
          timeout: 25000, // 25 seconds timeout
          family: 4 // Force IPv4
        };

        const req = https.request(options, (res) => {
          let data = '';

          res.on('data', chunk => {
            data += chunk;
          });

          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              console.log(`📥 Gemini response: ${res.statusCode}, ${data.length} bytes`);
              resolve(data);
            } else {
              console.log(`❌ Gemini error response: ${res.statusCode}`);
              reject(new Error(`Gemini API error: ${res.statusCode} - ${data.substring(0, 200)}`));
            }
          });

          res.on('error', (err) => {
            console.log(`❌ Response stream error: ${err.message}`);
            reject(err);
          });
        });

        req.on('error', (err) => {
          console.log(`❌ Request error: ${err.message}`);
          reject(err);
        });

        req.on('timeout', () => {
          console.log('❌ Request timeout after 25s');
          req.destroy();
          reject(new Error('Gemini API timeout'));
        });

        req.on('socket', (socket) => {
          socket.setTimeout(25000);
          socket.setKeepAlive(false); // Disable keep-alive to prevent connection reuse issues
          socket.on('timeout', () => {
            console.log('❌ Socket timeout');
            req.destroy();
          });
        });

        // Write the request body in chunks for large payloads
        const chunkSize = 8192; // 8KB chunks
        let offset = 0;

        const writeChunks = () => {
          while (offset < requestBody.length) {
            const chunk = requestBody.slice(offset, offset + chunkSize);
            const canContinue = req.write(chunk);
            offset += chunkSize;

            if (!canContinue) {
              // Wait for drain event before continuing
              req.once('drain', writeChunks);
              return;
            }
          }
          req.end();
        };

        writeChunks();
      });

      const data = JSON.parse(response);

      // Check for MAX_TOKENS error and retry with more tokens
      if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        const thoughtsTokens = data.usageMetadata?.thoughtsTokenCount || 0;
        console.log(`⚠️  Gemini hit MAX_TOKENS (thoughts: ${thoughtsTokens}, requested: ${maxTokens})`);
        throw new Error(`Gemini MAX_TOKENS: Need to increase maxTokens (current: ${maxTokens}, thoughts used: ${thoughtsTokens})`);
      }

      // Safely extract response
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.log('❌ Invalid Gemini response structure:', JSON.stringify(data).substring(0, 500));
        throw new Error(`Invalid Gemini API response: ${response.substring(0, 200)}`);
      }

      const aiResponse = data.candidates[0].content.parts[0].text;
      console.log(`✅ Gemini AI Response received (${aiResponse.length} chars)`);
      console.log(`📝 Preview:`, aiResponse.substring(0, 150));
      return aiResponse;
    }

    // This code should NEVER be reached when using Gemini (useGemini === true)
    // Only execute if NOT using Gemini (fallback to OpenAI or Llama)
    const client = getAIClient();
    const completion = await client.chat.completions.create({
      model: useOpenAI ? "gpt-3.5-turbo" : "meta-llama/Llama-3.2-3B-Instruct:novita",
      messages: messages as any,
      response_format: (useOpenAI && jsonMode) ? { type: "json_object" } : undefined,
      max_tokens: maxTokens,
      temperature: temperature,
    });

    const response = completion.choices[0].message.content;
    console.log(`✅ ${aiName} AI Response received`);
    return response;

  } catch (error: any) {
    console.error(`❌ ${aiName} Error:`, error.message);
    console.error(`❌ Full error:`, error);

    // If using Gemini API KEY 2 failed, try fallback to API KEY 1
    if (useGemini && process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        console.log('🔄 Trying fallback to GOOGLE_GEMINI_API_KEY (first key)...');

        const https = await import('https');
        const dns = await import('dns');
        dns.setDefaultResultOrder('ipv4first');

        const prompt = messages.map(m => m.content).join('\n\n');

        const requestBody = JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: maxTokens
          }
        });

        const response = await new Promise<string>((resolve, reject) => {
          const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(requestBody),
              'User-Agent': 'IntakeAI-Health/1.0',
              'Connection': 'close'
            },
            timeout: 25000,
            family: 4
          };

          const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
              if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                console.log(`📥 Gemini fallback response: ${res.statusCode}`);
                resolve(data);
              } else {
                reject(new Error(`Gemini fallback API error: ${res.statusCode}`));
              }
            });
            res.on('error', reject);
          });

          req.on('error', reject);
          req.on('timeout', () => {
            req.destroy();
            reject(new Error('Gemini fallback timeout'));
          });

          req.write(requestBody);
          req.end();
        });

        const data = JSON.parse(response);

        if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
          throw new Error('Invalid Gemini fallback response');
        }

        const aiResponse = data.candidates[0].content.parts[0].text;
        console.log(`✅ Gemini fallback successful (${aiResponse.length} chars)`);
        return aiResponse;

      } catch (fallbackError: any) {
        console.error(`❌ Gemini fallback also failed:`, fallbackError.message);
      }
    }

    // No fallback - just fail and show retry button
    // COMMENTED OUT: Try fallback chain: Gemini -> OpenAI -> Llama
    // if (useGemini && process.env.OPENAI_API_KEY) {
    //   try {
    //     console.log('🔄 Retrying with OpenAI...');
    //     const client = getAIClient();
    //     const completion = await client.chat.completions.create({
    //       model: "gpt-3.5-turbo",
    //       messages: messages as any,
    //       response_format: jsonMode ? { type: "json_object" } : undefined,
    //       max_tokens: maxTokens,
    //       temperature: temperature,
    //     });
    //     const response = completion.choices[0].message.content;
    //     console.log('✅ OpenAI AI Response received');
    //     return response;
    //   } catch (openaiError) {
    //     console.error('❌ OpenAI also failed:', openaiError);
    //   }
    // }
    //
    // // Detect quota exhaustion for OpenAI
    // if (error?.status === 429 && error?.code === 'insufficient_quota') {
    //   openAIQuotaExhausted = true;
    //   aiClient = null;
    //   console.error('❌ OpenAI quota exhausted');
    // }
    //
    // // Final fallback to Llama
    // if ((useGemini || useOpenAI) && process.env.HF_TOKEN) {
    //   try {
    //     console.log('🔄 Retrying with Llama...');
    //     const client = getAIClient();
    //     const completion = await client.chat.completions.create({
    //       model: "meta-llama/Llama-3.2-3B-Instruct:novita",
    //       messages: messages as any,
    //       max_tokens: maxTokens,
    //       temperature: temperature,
    //     });
    //     const response = completion.choices[0].message.content;
    //     console.log('✅ Llama AI Response received');
    //     return response;
    //   } catch (llamaError) {
    //     console.error('❌ Llama also failed:', llamaError);
    //   }
    // }

    // No fallback - throw the error
    throw error;
  }
}

// Utility function to format numbers to a maximum of 2 decimal places
const formatNumber = (value: number | string | undefined, decimals: number = 2): string => {
  const num = typeof value === 'string' ? parseFloat(value) : (value || 0);
  if (isNaN(num)) return '0';
  return Number(num.toFixed(decimals)).toString();
};

// Utility function to format AI text with proper line breaks
const formatAIText = (text: string): string => {
  if (!text) return text;

  let formatted = text;

  // Remove all asterisks (markdown bold formatting)
  formatted = formatted.replace(/\*+/g, '');

  // Convert numbered lists (1., 2., 3., etc.) to new lines with spacing
  formatted = formatted.replace(/(\d+)\.\s+/g, '\n\n$1. ');

  // Convert bullet points (-, *, •) to new lines with spacing
  formatted = formatted.replace(/\s*[-*•]\s+/g, '\n\n- ');

  // Convert "First," "Second," etc. to new lines
  formatted = formatted.replace(/(First|Second|Third|Fourth|Fifth|Additionally|Furthermore|Moreover|Also|Finally),?\s+/gi, '\n\n$1: ');

  // Remove leading newline if added at start
  formatted = formatted.replace(/^\n+/, '');

  // Clean up multiple consecutive newlines
  formatted = formatted.replace(/\n{3,}/g, '\n\n');

  return formatted.trim();
};

// Simple reverse translation mapping for common foods
const reverseTranslations: Record<string, string> = {
  '香蕉': 'Banana',
  '苹果': 'Apple',
  '橙子': 'Orange',
  '鸡肉': 'Chicken',
  '鸡胸肉': 'Chicken Breast',
  '牛肉': 'Beef',
  '猪肉': 'Pork',
  '鱼': 'Fish',
  '米饭': 'Rice',
  '面包': 'Bread',
  '牛奶': 'Milk',
  '鸡蛋': 'Egg',
  '奶酪': 'Cheese',
  '酸奶': 'Yogurt',
  '坚果': 'Nuts',
  '西兰花': 'Broccoli',
  '菠菜': 'Spinach',
  '胡萝卜': 'Carrot',
  '土豆': 'Potato',
  '红薯': 'Sweet Potato',
  '西红柿': 'Tomato',
  '洋葱': 'Onion',
  '大蒜': 'Garlic',
  '牛油果': 'Avocado',
  '三文鱼': 'Salmon',
  '金枪鱼': 'Tuna',
  '虾': 'Shrimp',
  '杏仁': 'Almonds',
  '核桃': 'Walnuts',
  '花生': 'Peanuts',
  '腰果': 'Cashews',
  '燕麦': 'Oats',
  '藜麦': 'Quinoa',
  '糙米': 'Brown Rice',
  '白米': 'White Rice',
  '意大利面': 'Pasta',
  '面条': 'Noodles',
  '豆腐': 'Tofu',
  '豆类': 'Beans',
  '扁豆': 'Lentils',
  '鹰嘴豆': 'Chickpeas',
  '草莓': 'Strawberries',
  '蓝莓': 'Blueberries',
  '葡萄': 'Grapes',
  '西瓜': 'Watermelon',
  '菠萝': 'Pineapple',
  '芒果': 'Mango',
  '啤酒': 'Beer',
  '伏特加': 'Vodka',
  '葡萄酒': 'Wine',
  '威士忌': 'Whiskey',
};

import {
  getCachedTranslation,
  setCachedTranslation,
  getCommonFoodTranslations
} from './translation-cache';

// Initialize Google Translate client
const translateClient = new translate.Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY
});

// Helper function to translate text using Google Translate API
async function translateWithGoogle(text: string, targetLang: string): Promise<string> {
  try {
    const [translation] = await translateClient.translate(text, targetLang);
    return translation;
  } catch (error) {
    console.error('Google Translate API error:', error);
    throw error;
  }
}

// Helper function to translate food entries to target language
async function translateFoodEntries(entries: any[], targetLang: string): Promise<any[]> {
  if (!entries || entries.length === 0) {
    return entries;
  }

  // Don't translate if target is English AND all entries are already in English
  // But DO translate if entries are in Chinese and target is English
  const hasNonEnglish = entries.some(entry => /[\u4e00-\u9fa5]/.test(entry.foodName));

  if (targetLang === 'en' && !hasNonEnglish) {
    console.log('⏭️  All entries already in English, skipping translation');
    return entries;
  }

  if (!hasNonEnglish && targetLang !== 'en') {
    console.log(`🔤 Entries in English, translating to ${targetLang}`);
  } else if (hasNonEnglish && targetLang === 'en') {
    console.log(`🔤 Entries contain Chinese, translating to English`);
  }

  // Map 'zh' to 'zh-CN' for Google Translate
  const googleTargetLang = targetLang === 'zh' ? 'zh-CN' : targetLang;

  console.log(`📝 Translating ${entries.length} food entries to ${googleTargetLang}`);

  try {
    // Batch translate all food names
    const foodNames = entries.map(entry => entry.foodName);

    // Translate in batches to avoid API limits
    const batchSize = 100;
    const translatedNames: string[] = [];

    for (let i = 0; i < foodNames.length; i += batchSize) {
      const batch = foodNames.slice(i, i + batchSize);
      console.log(`🔤 Translating batch ${Math.floor(i / batchSize) + 1}: ${batch.join(', ')}`);
      const [translations] = await translateClient.translate(batch, googleTargetLang);
      const translationsArray = Array.isArray(translations) ? translations : [translations];
      translatedNames.push(...translationsArray);
      console.log(`✅ Translated to: ${translationsArray.join(', ')}`);
    }

    // Map translated names back to entries
    return entries.map((entry, index) => ({
      ...entry,
      foodName: translatedNames[index] || entry.foodName,
      originalFoodName: entry.foodName // Keep original for reference
    }));
  } catch (error) {
    console.error('❌ Error translating food entries:', error);
    // Return original entries if translation fails
    return entries;
  }
}

export const translateBatch = async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { texts, targetLanguage } = req.body;

    // Input validation
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid texts array',
        translations: []
      });
    }

    // Filter out empty strings and normalize
    const validTexts = texts
      .filter((text: string) => text && text.trim().length > 0)
      .map((text: string) => text.trim());

    if (validTexts.length === 0) {
      return res.status(200).json({
        success: true,
        translations: texts,
        cached: true,
        processingTime: Date.now() - startTime
      });
    }

    // Handle same language or invalid language pairs
    if (targetLanguage === 'en' || !targetLanguage) {
      const englishTranslations = texts.map((text: string) => {
        if (!text || text.trim().length === 0) return text;

        // Use reverse translation mapping for Chinese to English
        const englishTranslation = reverseTranslations[text.trim()];
        if (englishTranslation) {
          console.log(`Using reverse translation: ${text} -> ${englishTranslation}`);
          return englishTranslation;
        }

        return text;
      });

      return res.status(200).json({
        success: true,
        translations: englishTranslations,
        cached: true,
        processingTime: Date.now() - startTime
      });
    }

    // Check cache first for exact match
    const cachedTranslations = getCachedTranslation(validTexts, targetLanguage);
    if (cachedTranslations) {
      console.log('✅ Returning cached translations');
      return res.status(200).json({
        success: true,
        translations: cachedTranslations,
        cached: true,
        processingTime: Date.now() - startTime
      });
    }

    // Try common food translations first
    const { translations: commonTranslations, hasAll } = getCommonFoodTranslations(validTexts, targetLanguage);
    if (hasAll) {
      console.log('✅ Using common food translations');
      setCachedTranslation(validTexts, targetLanguage, commonTranslations);
      return res.status(200).json({
        success: true,
        translations: commonTranslations,
        cached: false,
        source: 'common',
        processingTime: Date.now() - startTime
      });
    }

    // Check if we have API key
    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      console.log('No Google Translate API key found, returning original texts');
      return res.status(200).json({
        success: true,
        translations: texts,
        cached: false,
        source: 'fallback',
        processingTime: Date.now() - startTime
      });
    }

    // Prepare API request with timeout and optimizations
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const apiStartTime = Date.now();
      console.log(`🚀 Making Google Translate API request for ${validTexts.length} texts`);

      const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'IntakeAI-Health/1.0'
        },
        body: JSON.stringify({
          q: validTexts,
          target: targetLanguage,
          format: 'text',
          source: 'en' // Specify source language for better performance
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const apiTime = Date.now() - apiStartTime;
      console.log(`⏱️ Google Translate API took ${apiTime}ms`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google Translate API error: ${response.status}`, errorText);
        throw new Error(`Google Translate API failed: ${response.status}`);
      }

      const data = await response.json();

      // Extract translations from Google's response format
      const apiTranslations = data.data?.translations?.map((t: any) => t.translatedText) || validTexts;

      // Ensure we return the same number of translations as input texts
      const finalTranslations = texts.map((originalText: string) => {
        if (!originalText || originalText.trim().length === 0) {
          return originalText;
        }
        const validIndex = validTexts.indexOf(originalText.trim());
        return validIndex >= 0 ? apiTranslations[validIndex] : originalText;
      });

      // Cache the successful translation
      setCachedTranslation(validTexts, targetLanguage, apiTranslations);

      console.log(`✅ Translation completed in ${Date.now() - startTime}ms (API: ${apiTime}ms)`);

      return res.status(200).json({
        success: true,
        translations: finalTranslations,
        cached: false,
        source: 'google-translate',
        processingTime: Date.now() - startTime,
        apiTime
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);

      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('Google Translate API timeout');
      } else {
        console.error('Google Translate API error:', fetchError);
      }

      // Fall back to common translations or original text
      const fallbackTranslations = texts.map((text: string) => {
        if (!text || text.trim().length === 0) return text;
        const common = getCommonFoodTranslations([text.trim()], targetLanguage);
        return common.hasAll ? common.translations[0] : text;
      });

      return res.status(200).json({
        success: true,
        translations: fallbackTranslations,
        cached: false,
        source: 'fallback',
        error: 'API temporarily unavailable',
        processingTime: Date.now() - startTime
      });
    }

  } catch (error) {
    console.error('Batch translation error:', error);

    // Final fallback to original text
    const { texts } = req.body;
    return res.status(200).json({
      success: true,
      translations: texts || [],
      cached: false,
      source: 'error-fallback',
      error: 'Translation failed, using original text',
      processingTime: Date.now() - startTime
    });
  }
};

export function registerRoutes(app: Express) {
  // Authentication routes
  app.use('/api/auth', authRoutes);

  // Comprehensive health check route
  app.get("/api/health", wrapAsync(async (req, res) => {
    const healthStatus = await healthMonitor.getHealthStatus();

    // Set appropriate HTTP status code based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(statusCode);
    sendSuccess(res, healthStatus);
  }));

  // Simple liveness probe (for Kubernetes)
  app.get("/api/health/live", wrapAsync(async (req, res) => {
    const isAlive = healthMonitor.isAlive();
    res.status(isAlive ? 200 : 503);
    sendSuccess(res, { status: isAlive ? 'alive' : 'dead' });
  }));

  // Readiness probe (for Kubernetes)
  app.get("/api/health/ready", wrapAsync(async (req, res) => {
    const isReady = await healthMonitor.isReady();
    res.status(isReady ? 200 : 503);
    sendSuccess(res, { status: isReady ? 'ready' : 'not-ready' });
  }));

  // Health Profile Routes (Protected)
  app.post("/api/health-profile", requireAuth, validateSchema(insertHealthProfileSchema), wrapAsync(async (req, res) => {
    try {
      console.log('Creating health profile for user:', req.user!.id);
      console.log('Profile data:', JSON.stringify(req.body, null, 2));

      // Add userId to the profile data
      const profileData = {
        ...req.body,
        userId: req.user!.id
      };

      const profile = await storage.createHealthProfile(profileData);
      console.log('Health profile created successfully:', profile.id);
      sendSuccess(res, profile, 'Health profile created successfully', 201);
    } catch (error) {
      console.error('Error creating health profile:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        userId: req.user!.id,
        body: req.body
      });
      throw error; // Re-throw to let error handler deal with it
    }
  }));
  // Batch Translation Route
  app.post("/api/translate-batch", translateBatch);

  // Get current user's health profile
  app.get("/api/health-profile", requireAuth, wrapAsync(async (req, res) => {
    try {
      const profiles = await storage.getHealthProfilesByUser(req.user!.id);
      if (!profiles || profiles.length === 0) {
        // Return null instead of 404 to indicate no profile exists yet
        return sendSuccess(res, null);
      }
      // Return the first (and should be only) profile for the user
      sendSuccess(res, profiles[0]);
    } catch (error) {
      console.error('Error fetching health profile:', error);
      // Return null on error to allow user to create a new profile
      sendSuccess(res, null);
    }
  }));

  app.get("/api/health-profile/:id", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getHealthProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Health profile not found" });
      }
      // Ensure user can only access their own profile
      if (profile.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health profile" });
    }
  });

  app.put("/api/health-profile/:id", requireAuth, validatePartialSchema(insertHealthProfileSchema), wrapAsync(async (req, res) => {
    console.log('Health profile UPDATE request body:', JSON.stringify(req.body, null, 2));

    // First verify the profile belongs to the authenticated user
    const existingProfile = await storage.getHealthProfile(req.params.id);
    if (!existingProfile) {
      throw new NotFoundError("Health profile not found");
    }
    if (existingProfile.userId !== req.user!.id) {
      throw new ValidationError("Access denied");
    }

    console.log('Health profile validation passed:', JSON.stringify(req.body, null, 2));

    const profile = await storage.updateHealthProfile(req.params.id, req.body);
    if (!profile) {
      throw new NotFoundError("Health profile not found");
    }
    sendSuccess(res, profile, 'Health profile updated successfully');
  }));

  // Food Search and Nutrition API
  app.get("/api/food/search", validateQueryParams(['q']), wrapAsync(async (req, res) => {
    const query = req.query.q as string;

    // Detect if query is in Chinese
    const isChinese = /[\u4e00-\u9fa5]/.test(query);

    // Check if query is in Chinese and translate to English first
    let searchQuery = query;
    const translatedFromChinese = reverseTranslations[query.trim()];
    if (translatedFromChinese) {
      searchQuery = translatedFromChinese;
    }

      // Primary: Simple foods database (most reliable)
      const simpleFoodDb = JSON.parse(
        fs.readFileSync(path.join(import.meta.dirname, "data", "simple-foods.json"), "utf-8")
      );

      const filteredFoods = simpleFoodDb.filter((food: any) => {
        const queryLower = searchQuery.toLowerCase();
        const originalQueryLower = query.toLowerCase();
        const nameMatch = food.name.toLowerCase().includes(queryLower);
        const chineseMatch = food.chineseName && food.chineseName.includes(query);
        const originalNameMatch = food.name.toLowerCase().includes(originalQueryLower);
        return nameMatch || chineseMatch || originalNameMatch;
      }).slice(0, 10).map((food: any) => ({
        ...food,
        // Show only the language-appropriate name
        name: isChinese && food.chineseName ? food.chineseName : food.name,
        // Keep original name as fallback
        originalName: food.name,
        displayLanguage: isChinese ? 'zh' : 'en'
      }));

      if (filteredFoods.length > 0) {
        return res.json({ foods: filteredFoods, source: "local" });
      }
      
      // Fallback: Try USDA API
      const usdaApiKey = process.env.USDA_API_KEY || process.env.FOOD_API_KEY || "DEMO_KEY";
      try {
        const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/foods/search`, {
          params: {
            query: searchQuery, // Use translated query for USDA API
            api_key: usdaApiKey,
            pageSize: 10,
          },
          timeout: 10000,
        });

        if (usdaResponse.data.foods && usdaResponse.data.foods.length > 0) {
          const foods = usdaResponse.data.foods.map((food: any) => ({
            id: food.fdcId,
            name: food.description,
            brand: food.brandName || null,
            nutrients: food.foodNutrients?.reduce((acc: any, nutrient: any) => {
              acc[nutrient.nutrientName] = nutrient.value;
              return acc;
            }, {}),
          }));

          return res.json({ foods, source: "usda" });
        }
      } catch (usdaError: unknown) {
        const errorMsg = usdaError instanceof Error ? usdaError.message : String(usdaError);
        console.log("USDA API failed:", errorMsg);
        console.log("Trying AI search...");
      }

      // AI-powered online search as final fallback
      const aiSearchResults = await searchFoodWithAI(searchQuery, query);
      if (aiSearchResults.length > 0) {
        return res.json({ foods: aiSearchResults, source: "ai" });
      }
      
      // Final fallback: Return some basic foods so the UI works
      const basicFoods = [
        { id: "apple-1", name: "Apple", brand: null },
        { id: "banana-1", name: "Banana", brand: null },
        { id: "chicken-breast-1", name: "Chicken Breast, Grilled", brand: null },
        { id: "salmon-1", name: "Salmon, Grilled", brand: null },
        { id: "egg-1", name: "Egg, Large", brand: null }
      ];
    res.json({ foods: query ? basicFoods.filter(f => f.name.toLowerCase().includes(query.toLowerCase())) : [], source: "fallback" });
  }));

  app.get("/api/food/nutrition/:foodId", async (req, res) => {
    try {
      // Handle AI-generated food IDs
      if (req.params.foodId.startsWith("ai-")) {
        let foodId = req.params.foodId.replace("ai-", "");
        // Remove trailing index number (e.g. "-0")
        foodId = foodId.replace(/-\d+$/, "");
        // Decode the URL-encoded name
        let foodName = decodeURIComponent(foodId);
        // Clean up any remaining artifacts
        foodName = foodName.trim();
        const aiNutrition = await generateNutritionWithAI(foodName);
        return res.json({ nutrition: aiNutrition });
      }

      // Primary: Try simple foods database first
      const simpleFoodDb = JSON.parse(
        fs.readFileSync(path.join(import.meta.dirname, "data", "simple-foods.json"), "utf-8")
      );
      const food = simpleFoodDb.find((f: any) => f.id === req.params.foodId);
      
      if (food && food.nutrition) {
        return res.json({ nutrition: food.nutrition });
      }

      // Fallback: Try USDA API
      const usdaApiKey = process.env.USDA_API_KEY || process.env.FOOD_API_KEY || "DEMO_KEY";
      const usdaResponse = await axios.get(`https://api.nal.usda.gov/fdc/v1/food/${req.params.foodId}`, {
        params: { api_key: usdaApiKey },
        timeout: 2000,
      });

      const usdaFood = usdaResponse.data;
      
      // Extract vitamins and minerals from USDA data
      const vitamins: Record<string, number> = {};
      const minerals: Record<string, number> = {};
      
      usdaFood.foodNutrients?.forEach((nutrient: any) => {
        const name = nutrient.nutrient.name.toLowerCase();
        const amount = nutrient.amount || 0;
        
        // Map vitamins
        if (name.includes('vitamin c') || name.includes('ascorbic acid')) vitamins.vitamin_c = amount;
        if (name.includes('vitamin a') && name.includes('rae')) vitamins.vitamin_a = amount;
        if (name.includes('vitamin e') && name.includes('alpha')) vitamins.vitamin_e = amount;
        if (name.includes('vitamin k') && name.includes('phylloquinone')) vitamins.vitamin_k = amount;
        if (name.includes('thiamin')) vitamins.vitamin_b1 = amount;
        if (name.includes('riboflavin')) vitamins.vitamin_b2 = amount;
        if (name.includes('niacin')) vitamins.vitamin_b3 = amount;
        if (name.includes('vitamin b-6')) vitamins.vitamin_b6 = amount;
        if (name.includes('folate') && name.includes('total')) vitamins.folate = amount;
        if (name.includes('vitamin b-12')) vitamins.vitamin_b12 = amount;
        
        // Map minerals
        if (name.includes('calcium')) minerals.calcium = amount;
        if (name.includes('iron')) minerals.iron = amount;
        if (name.includes('magnesium')) minerals.magnesium = amount;
        if (name.includes('phosphorus')) minerals.phosphorus = amount;
        if (name.includes('potassium')) minerals.potassium = amount;
        if (name.includes('zinc')) minerals.zinc = amount;
        if (name.includes('copper')) minerals.copper = amount;
        if (name.includes('manganese')) minerals.manganese = amount;
        if (name.includes('selenium')) minerals.selenium = amount;
      });
      
      const nutritionData: NutritionData = {
        calories: usdaFood.foodNutrients?.find((n: any) => n.nutrient.name === "Energy")?.amount || 0,
        protein: usdaFood.foodNutrients?.find((n: any) => n.nutrient.name === "Protein")?.amount || 0,
        carbs: usdaFood.foodNutrients?.find((n: any) => n.nutrient.name === "Carbohydrate, by difference")?.amount || 0,
        fat: usdaFood.foodNutrients?.find((n: any) => n.nutrient.name === "Total lipid (fat)")?.amount || 0,
        fiber: usdaFood.foodNutrients?.find((n: any) => n.nutrient.name === "Fiber, total dietary")?.amount || 0,
        sugar: usdaFood.foodNutrients?.find((n: any) => n.nutrient.name === "Sugars, total including NLEA")?.amount || 0,
        sodium: usdaFood.foodNutrients?.find((n: any) => n.nutrient.name === "Sodium, Na")?.amount || 0,
        vitamins: Object.keys(vitamins).length > 0 ? vitamins : undefined,
        minerals: Object.keys(minerals).length > 0 ? minerals : undefined,
      };

      res.json({ nutrition: nutritionData });
    } catch (error) {
      // Fallback to simple local food database first
      try {
        let food = null;
        
        // Try simple foods database first
        try {
          const simpleFoodDb = JSON.parse(
            fs.readFileSync(path.join(import.meta.dirname, "data", "simple-foods.json"), "utf-8")
          );
          food = simpleFoodDb.find((f: any) => f.id === req.params.foodId);
        } catch (e) {
          // Simple foods not found, continue to complex database
        }
        
        // If not found in simple database, try complex database
        if (!food) {
          const localFoodDb = JSON.parse(
            fs.readFileSync(path.join(import.meta.dirname, "data", "food-database.json"), "utf-8")
          );
          food = localFoodDb.find((f: any) => f.id === req.params.foodId);
        }
        
        if (!food) {
          return res.status(404).json({ message: "Food not found" });
        }

        // Enhance local food data with additional vitamins/minerals if available
        let nutrition = food.nutrition;
        if (food.foodNutrients) {
          const vitamins: Record<string, number> = {};
          const minerals: Record<string, number> = {};
          
          // Process foodNutrients from USDA format in local data
          Object.entries(food.foodNutrients).forEach(([nutrientName, value]: [string, any]) => {
            const name = nutrientName.toLowerCase();
            const amount = typeof value === 'number' ? value : 0;
            
            // Map vitamins
            if (name.includes('vitamin c') || name.includes('ascorbic acid')) vitamins.vitamin_c = amount;
            if (name.includes('vitamin a') && name.includes('iu')) vitamins.vitamin_a = amount / 3.33; // Convert IU to mcg
            if (name.includes('iron')) minerals.iron = amount;
            if (name.includes('calcium')) minerals.calcium = amount;
            if (name.includes('potassium')) minerals.potassium = amount;
          });
          
          if (Object.keys(vitamins).length > 0) nutrition.vitamins = vitamins;
          if (Object.keys(minerals).length > 0) nutrition.minerals = minerals;
        }

        res.json({ nutrition });
      } catch (fallbackError) {
        res.status(500).json({ message: "Nutrition data unavailable" });
      }
    }
  });

  // Food Entry Routes
  // Get current user's food entries
  app.get("/api/food-entries", requireAuth, wrapAsync(async (req, res) => {
    const date = req.query.date as string;
    const targetLang = req.query.lang as string || 'en'; // Get target language from query

    console.log(`🌍 GET /api/food-entries - date: ${date}, lang: ${targetLang}`);

    // Get the user's health profile
    const userProfiles = await storage.getHealthProfilesByUser(req.user!.id);
    if (!userProfiles || userProfiles.length === 0) {
      sendSuccess(res, []); // Return empty array if no profile yet
      return;
    }

    const entries = await storage.getFoodEntries(userProfiles[0].id, date);
    console.log(`📊 Found ${entries.length} entries:`, entries.map(e => e.foodName).join(', '));

    // Translate food names to target language
    const translatedEntries = await translateFoodEntries(entries, targetLang);
    console.log(`🔄 After translation:`, translatedEntries.map(e => e.foodName).join(', '));

    sendSuccess(res, translatedEntries);
  }));

  app.get("/api/food-entries/:profileId", async (req, res) => {
    try {
      const date = req.query.date as string;
      const profileId = req.params.profileId;
      
      // Create default profile if it doesn't exist
      if (profileId === "default") {
        const existingProfile = await storage.getHealthProfile("default");
        if (!existingProfile) {
          await storage.createHealthProfile({
            userId: "demo",
            name: "Demo User",
            height: 170,
            weight: 70,
            birthYear: 1990,
            birthMonth: 1,
            medicalConditions: [],
            allergies: [],
            medications: [],
            dietaryRestrictions: [],
            healthGoals: [],
            smokingStatus: "never",
          });
          
          // Add some sample food entries for demo
          const sampleEntries = [
            {
              profileId: "default",
              foodName: "Banana",
              servingSize: 1,
              servingUnit: "piece",
              mealType: "breakfast",
              nutritionData: {
                calories: 105,
                protein: 1.3,
                carbs: 27,
                fat: 0.3,
                fiber: 3.1,
                sugar: 14,
                sodium: 1,
                vitamins: { vitamin_c: 10.3, vitamin_b6: 0.4, folate: 20 },
                minerals: { potassium: 422, magnesium: 32 }
              },
              entryDate: date,
            },
            {
              profileId: "default",
              foodName: "Greek Yogurt",
              servingSize: 1,
              servingUnit: "cup",
              mealType: "breakfast",
              nutritionData: {
                calories: 100,
                protein: 17,
                carbs: 6,
                fat: 0.4,
                fiber: 0,
                sugar: 6,
                sodium: 56,
                vitamins: { vitamin_b12: 1.3, riboflavin: 0.3 },
                minerals: { calcium: 200, phosphorus: 240 }
              },
              entryDate: date,
            },
            {
              profileId: "default",
              foodName: "Grilled Chicken Breast",
              servingSize: 100,
              servingUnit: "gram",
              mealType: "lunch",
              nutritionData: {
                calories: 165,
                protein: 31,
                carbs: 0,
                fat: 3.6,
                fiber: 0,
                sugar: 0,
                sodium: 74,
                vitamins: { niacin: 14.8, vitamin_b6: 1.0 },
                minerals: { phosphorus: 228, selenium: 27.6 }
              },
              entryDate: date,
            }
          ];
          
          for (const entry of sampleEntries) {
            await storage.createFoodEntry(entry);
          }
        }
      }
      
      const entries = await storage.getFoodEntries(profileId, date);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch food entries" });
    }
  });

  app.post("/api/food-entries", requireAuth, validateSchema(apiFoodEntrySchema), wrapAsync(async (req, res) => {
    console.log('Food entry POST data received:', req.body);
    console.log('Food entry validation passed:', req.body);

    // Get the user's health profile
    const userProfiles = await storage.getHealthProfilesByUser(req.user!.id);
    if (!userProfiles || userProfiles.length === 0) {
      throw new ValidationError("Health profile required. Please complete your profile first.");
    }

    // Use the user's profile ID instead of the submitted one
    const entryData = {
      ...req.body,
      profileId: userProfiles[0].id
    };
    console.log('Final entry data:', entryData);

    const entry = await storage.createFoodEntry(entryData);
    sendSuccess(res, entry, 'Food entry created successfully', 201);
  }));

  app.delete("/api/food-entries/:id", requireAuth, async (req, res) => {
    try {
      console.log('Delete request for entry ID:', req.params.id);
      console.log('User ID:', req.user!.id);

      // First verify the food entry belongs to the authenticated user
      const entry = await storage.getFoodEntry(req.params.id);
      console.log('Found entry:', entry);

      if (!entry) {
        console.log('Entry not found in database');
        return res.status(404).json({ message: "Food entry not found" });
      }

      // Check if the entry belongs to the user's profile
      const profiles = await storage.getHealthProfilesByUser(req.user!.id);
      console.log('User profiles:', profiles.map(p => p.id));
      const userProfileIds = profiles.map(p => p.id);
      console.log('Entry profile ID:', entry.profileId);

      if (!userProfileIds.includes(entry.profileId)) {
        console.log('Access denied - profile mismatch');
        return res.status(403).json({ message: "Access denied" });
      }

      const deleted = await storage.deleteFoodEntry(req.params.id);
      console.log('Delete result:', deleted);

      if (!deleted) {
        console.log('Delete operation failed');
        return res.status(404).json({ message: "Food entry not found" });
      }

      console.log('Delete successful');
      res.json({ success: true });
    } catch (error) {
      console.error('Food entry delete error:', error);
      res.status(500).json({ message: "Failed to delete food entry" });
    }
  });

  // Insights and Conflict Detection
  app.get("/api/insights/:profileId/:date", wrapAsync(async (req, res) => {
      const { profileId, date } = req.params;

      // Get existing insight
      let insight = await storage.getInsight(profileId, date);
      const entries = await storage.getFoodEntries(profileId, date);

      // Check if we need to regenerate based on food entry count
      const needsRegeneration = !insight ||
        (insight.data as any)?.foodEntryCount !== entries.length;

      console.log(`Existing insight found: ${!!insight}, Needs regeneration: ${needsRegeneration}`);

      // Only regenerate if food entries changed
      if (needsRegeneration) {
        console.log(`Regenerating insights (food entries changed from ${(insight?.data as any)?.foodEntryCount || 0} to ${entries.length})`);

        // Generate insights
        const profile = await storage.getHealthProfile(profileId);
        console.log(`Found ${entries.length} food entries for ${profileId} on ${date}`);

        if (!profile) {
          return res.status(404).json({ message: "Health profile not found" });
        }

        // Calculate daily totals for AI analysis
        let dailyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 };
        for (const entry of entries) {
          const nutrition = entry.nutritionData as NutritionData;
          dailyTotals.calories += nutrition.calories || 0;
          dailyTotals.protein += nutrition.protein || 0;
          dailyTotals.carbs += nutrition.carbs || 0;
          dailyTotals.fat += nutrition.fat || 0;
          dailyTotals.fiber += nutrition.fiber || 0;
          dailyTotals.sodium += nutrition.sodium || 0;
          dailyTotals.sugar += nutrition.sugar || 0;
        }

        // Prepare weekly data FIRST (for the single AI call)
        const currentDate = new Date(date);
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - 6); // Last 7 days

        const weeklyEntries = [];
        for (let i = 0; i < 7; i++) {
          const checkDate = new Date(weekStart);
          checkDate.setDate(weekStart.getDate() + i);
          const dateStr = checkDate.toISOString().split('T')[0];
          const dayEntries = await storage.getFoodEntries(profileId, dateStr);
          weeklyEntries.push(...dayEntries);
        }

        // Calculate weekly totals
        let weeklyTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
        for (const entry of weeklyEntries) {
          const nutrition = entry.nutritionData as NutritionData;
          weeklyTotals.calories += nutrition.calories || 0;
          weeklyTotals.protein += nutrition.protein || 0;
          weeklyTotals.carbs += nutrition.carbs || 0;
          weeklyTotals.fat += nutrition.fat || 0;
        }

        const uniqueDays = new Set(weeklyEntries.map(entry => entry.entryDate));
        const days = Math.max(uniqueDays.size, 1);
        const uniqueFoods = new Set(weeklyEntries.map(entry => entry.foodName.toLowerCase()));

        const weeklyData = {
          avgCalories: Math.round(weeklyTotals.calories / days),
          avgProtein: Number(formatNumber(weeklyTotals.protein / days)),
          avgCarbs: Number(formatNumber(weeklyTotals.carbs / days)),
          avgFat: Number(formatNumber(weeklyTotals.fat / days)),
          uniqueFoods: uniqueFoods.size,
          daysTracked: days
        };

        let conflicts: ConflictResult[] = [];
        let recommendations: Recommendation[] = [];
        let healthScore: number;
        let status: string;
        let aiGenerated: boolean;

        // No initial AI calls - fully on-demand to avoid rate limiting
        console.log('✅ Using fully on-demand strategy - no initial AI calls');

        // Generate weekly summary without AI (function has been modified to skip AI call)
        const weeklySummary = await generateWeeklySummary(profile, weeklyEntries);

        healthScore = calculateHealthScore(profile, entries, conflicts);
        status = determineStatus(conflicts);
        aiGenerated = false; // Will be true when user expands sections

        // Apply formatting to final totals for display
        const formattedDailyTotals = {
          calories: Number(formatNumber(dailyTotals.calories, 0)),
          protein: Number(formatNumber(dailyTotals.protein)),
          carbs: Number(formatNumber(dailyTotals.carbs)),
          fat: Number(formatNumber(dailyTotals.fat)),
          fiber: Number(formatNumber(dailyTotals.fiber)),
          sodium: Number(formatNumber(dailyTotals.sodium, 0)),
          sugar: Number(formatNumber(dailyTotals.sugar)),
        };

        console.log('📝 Creating insight with data:', {
          conflicts: conflicts.length,
          recommendations: recommendations.length,
          healthScore,
          status,
          hasWeeklySummary: !!weeklySummary,
          aiGenerated
        });

        insight = await storage.createInsight({
          profileId,
          title: `Health Insights for ${date}`,
          description: `Daily health analysis for ${new Date(date).toLocaleDateString()}`,
          type: 'daily_analysis',
          data: {
            date,
            conflicts,
            recommendations,
            healthScore,
            status,
            weeklySummary,
            dailyTotals: formattedDailyTotals,
            aiGenerated, // Flag to indicate if insights were AI-generated
            foodEntryCount: entries.length, // Track entry count for cache invalidation
          },
        });

        console.log('✅ Insight created successfully with ID:', insight.id);
      } else {
        console.log(`Using cached insights (no food entry changes)`);
      }

      // Check if response was already sent (timeout)
      if (!res.headersSent) {
        sendSuccess(res, insight);
      }
  }));

  // On-demand section endpoints for individual insight requests
  app.post("/api/insights/:profileId/:date/conflicts", requireAuth, wrapAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Check rate limit
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter,
        limit: rateCheck.limit,
        remaining: rateCheck.remaining
      });
    }

    const { profileId, date} = req.params;
    const profile = await storage.getHealthProfile(profileId);
    const entries = await storage.getFoodEntries(profileId, date);

    if (!profile || entries.length === 0) {
      return sendError(res, 'No data available', 400);
    }

    const conflicts = await detectConflicts(profile, entries);

    // Include rate limit info in response headers
    res.setHeader('X-RateLimit-Remaining-Minute', rateCheck.remaining!.minute);
    res.setHeader('X-RateLimit-Remaining-Hour', rateCheck.remaining!.hour);
    res.setHeader('X-RateLimit-Remaining-Day', rateCheck.remaining!.day);

    sendSuccess(res, { conflicts });
  }));

  app.post("/api/insights/:profileId/:date/recommendations", requireAuth, wrapAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Check rate limit
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter,
        limit: rateCheck.limit,
        remaining: rateCheck.remaining
      });
    }

    const { profileId, date } = req.params;
    const profile = await storage.getHealthProfile(profileId);
    const entries = await storage.getFoodEntries(profileId, date);

    if (!profile || entries.length === 0) {
      return sendError(res, 'No data available', 400);
    }

    const recommendations = await generateRecommendations(profile, entries);

    // Include rate limit info in response headers
    res.setHeader('X-RateLimit-Remaining-Minute', rateCheck.remaining!.minute);
    res.setHeader('X-RateLimit-Remaining-Hour', rateCheck.remaining!.hour);
    res.setHeader('X-RateLimit-Remaining-Day', rateCheck.remaining!.day);

    sendSuccess(res, { recommendations });
  }));

  app.post("/api/insights/:profileId/:date/tcm", requireAuth, wrapAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Check rate limit
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter,
        limit: rateCheck.limit,
        remaining: rateCheck.remaining
      });
    }

    const { profileId, date } = req.params;
    const profile = await storage.getHealthProfile(profileId);
    const entries = await storage.getFoodEntries(profileId, date);

    if (!profile || entries.length === 0) {
      return sendError(res, 'No data available', 400);
    }

    const recommendations = await generateTCMRecommendations(profile, entries);

    // Include rate limit info in response headers
    res.setHeader('X-RateLimit-Remaining-Minute', rateCheck.remaining!.minute);
    res.setHeader('X-RateLimit-Remaining-Hour', rateCheck.remaining!.hour);
    res.setHeader('X-RateLimit-Remaining-Day', rateCheck.remaining!.day);

    sendSuccess(res, { recommendations });
  }));

  app.post("/api/insights/:profileId/:date/weekly", wrapAsync(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    // Check rate limit
    const rateCheck = await checkRateLimit(userId);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.`,
        retryAfter: rateCheck.retryAfter,
        limit: rateCheck.limit,
        remaining: rateCheck.remaining
      });
    }

    const { profileId, date } = req.params;
    const profile = await storage.getHealthProfile(profileId);

    if (!profile) {
      return sendError(res, 'No profile found', 400);
    }

    // Get week's worth of entries
    const targetDate = new Date(date);
    const weeklyEntries: any[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(targetDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayEntries = await storage.getFoodEntries(profileId, dateStr);
      weeklyEntries.push(...dayEntries);
    }

    if (weeklyEntries.length === 0) {
      return sendError(res, 'No weekly data available', 400);
    }

    // Calculate weekly totals
    let rawTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

    for (const entry of weeklyEntries) {
      const nutrition = entry.nutritionData as NutritionData;
      rawTotals.calories += nutrition.calories || 0;
      rawTotals.protein += nutrition.protein || 0;
      rawTotals.carbs += nutrition.carbs || 0;
      rawTotals.fat += nutrition.fat || 0;
    }

    const uniqueDays = new Set(weeklyEntries.map(entry => entry.entryDate));
    const days = Math.max(uniqueDays.size, 1);
    const avgCalories = Math.round(rawTotals.calories / days);
    const avgProtein = Number(formatNumber(rawTotals.protein / days));
    const avgCarbs = Number(formatNumber(rawTotals.carbs / days));
    const avgFat = Number(formatNumber(rawTotals.fat / days));
    const uniqueFoods = new Set(weeklyEntries.map(entry => entry.foodName.toLowerCase()));

    const conditions = (profile.medicalConditions || []).join(', ');
    const allergies = (profile.allergies || []).join(', ');
    const medications = (profile.medications || []).join(', ');
    const hasConditions = conditions.length > 0;
    const hasAllergies = allergies.length > 0;
    const hasMedications = medications.length > 0;

    // Calculate age from birth year/month
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    let age = currentYear - (profile.birthYear || currentYear);
    if (profile.birthMonth && currentMonth < profile.birthMonth) {
      age--;
    }

    // AI analysis of weekly patterns
    const weeklyPrompt = `Analyze this person's weekly eating patterns:

Weekly Nutrition:
- Average daily intake: ${avgCalories} calories, ${avgProtein}g protein, ${avgCarbs}g carbs, ${avgFat}g fat
- Variety: ${uniqueFoods.size} different foods consumed
- Days tracked: ${days} days

Health Profile:
- Gender: ${profile.gender || 'Not specified'}
- Height: ${profile.height ? `${profile.height}cm` : 'Not specified'}
- Weight: ${profile.weight ? `${profile.weight}kg` : 'Not specified'}
- Age: ${age || 'Not specified'}
- Medical conditions: ${hasConditions ? conditions : 'None'}
- Food allergies: ${hasAllergies ? allergies : 'None'}
- Medications: ${hasMedications ? medications : 'None'}
- Smoking status: ${profile.smokingStatus || 'Not specified'}

Provide 3-4 specific insights about their weekly patterns, trends, and suggestions for improvement. Be brief and actionable.

Respond ONLY with plain text, no JSON formatting. Be brief and precise.`;

    const aiAnalysis = await callAIWithFallback(
      [
        {
          role: "system",
          content: "You are a professional nutritionist. Analyze weekly eating patterns and provide insights in plain text format."
        },
        {
          role: "user",
          content: weeklyPrompt
        }
      ],
      {
        maxTokens: 4096,
        temperature: 0,
        jsonMode: false
      }
    );

    if (!aiAnalysis || aiAnalysis.length < 20) {
      throw new Error('AI Service Unavailable - Failed to analyze weekly patterns');
    }

    // Remove asterisks from AI response
    const cleanedAnalysis = aiAnalysis.replace(/\*+/g, '');

    // Include rate limit info in response headers
    res.setHeader('X-RateLimit-Remaining-Minute', rateCheck.remaining!.minute);
    res.setHeader('X-RateLimit-Remaining-Hour', rateCheck.remaining!.hour);
    res.setHeader('X-RateLimit-Remaining-Day', rateCheck.remaining!.day);

    sendSuccess(res, { aiAnalysis: cleanedAnalysis });
  }));

  // Medical Conditions Autocomplete
  app.get("/api/medical-conditions", async (req, res) => {
    try {
      const query = req.query.q as string;
      const conditions = JSON.parse(
        fs.readFileSync(path.join(import.meta.dirname, "data", "medical-conditions.json"), "utf-8")
      );
      
      if (query) {
        const filtered = conditions.filter((condition: string) =>
          condition.toLowerCase().includes(query.toLowerCase())
        );
        res.json(filtered.slice(0, 10));
      } else {
        res.json(conditions.slice(0, 20));
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch medical conditions" });
    }
  });

  // Nutrient Information
  app.get("/api/nutrients/:name", async (req, res) => {
    try {
      // Try local database first
      try {
        const nutrients = JSON.parse(
          fs.readFileSync(path.join(import.meta.dirname, "data", "nutrients.json"), "utf-8")
        );

        const nutrient = nutrients.find((n: any) =>
          n.name.toLowerCase() === req.params.name.toLowerCase()
        );

        if (nutrient) {
          return res.json(nutrient);
        }
      } catch (err) {
        console.log('Local nutrient database not found, generating with AI');
      }

      // If not found locally, generate with AI
      const nutrientName = req.params.name;
      const aiNutrientInfo = await generateNutrientInfoWithAI(nutrientName);

      if (aiNutrientInfo) {
        return res.json(aiNutrientInfo);
      }

      return res.status(404).json({ message: "Nutrient information not found" });
    } catch (error) {
      console.error('Error fetching nutrient info:', error);
      res.status(500).json({ message: "Failed to fetch nutrient information" });
    }
  });
}



// AI-powered analysis functions
async function analyzeWithAI(prompt: string): Promise<string> {
  const response = await callAIWithFallback(
    [
      {
        role: "system",
        content: "You are a professional nutritionist providing brief, actionable health insights. Keep responses concise and specific."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    {
      maxTokens: 4096,
      temperature: 0
    }
  );

  if (!response) {
    throw new Error('AI Service Unavailable');
  }

  // Remove asterisks from response
  return response.replace(/\*+/g, '');
}

async function generateSmartResponse(prompt: string): Promise<string> {
  // Smart rule-based analysis that mimics AI behavior
  const lowerPrompt = prompt.toLowerCase();
  
  // Health condition analysis
  if (lowerPrompt.includes('diabetes') && lowerPrompt.includes('sugar')) {
    return "High sugar content detected. Consider monitoring blood glucose levels and consulting with your healthcare provider about portion sizes.";
  }
  
  if (lowerPrompt.includes('hypertension') && lowerPrompt.includes('sodium')) {
    return "Elevated sodium intake identified. This may impact blood pressure management.";
  }
  
  if (lowerPrompt.includes('heart') && lowerPrompt.includes('fat')) {
    return "Consider the type of fats consumed. Focus on healthy unsaturated fats from sources like fish, nuts, and olive oil.";
  }
  
  // Nutritional balance analysis
  if (lowerPrompt.includes('protein') && lowerPrompt.includes('low')) {
    return "Protein intake appears low. Consider adding lean proteins like chicken, fish, legumes, or Greek yogurt.";
  }
  
  if (lowerPrompt.includes('fiber') && lowerPrompt.includes('low')) {
    return "Fiber intake could be improved. Add more vegetables, fruits, whole grains, and legumes to your diet.";
  }
  
  return "Overall dietary pattern looks balanced. Continue monitoring your nutritional intake.";
}

// AI-powered insight generation with fallback to rule-based system
// Now includes weekly analysis in ONE call
async function generateAIInsights(dailyTotals: any, healthProfile: any, foodData: any[], analysisDate: string, weeklyData?: any) {
  // Calculate age from birth year/month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  let age = currentYear - (healthProfile.birthYear || currentYear);
  if (healthProfile.birthMonth && currentMonth < healthProfile.birthMonth) {
    age--;
  }

  const prompt = `Analyze this person's nutrition and provide comprehensive health insights.

PERSON'S PROFILE:
- Gender: ${healthProfile.gender || 'Not specified'}
- Height: ${healthProfile.height || 'Not provided'}cm
- Weight: ${healthProfile.weight || 'Not provided'}kg
- Age: ${age || 'Not provided'}
- Health Conditions: ${healthProfile.medicalConditions?.join(', ') || 'None reported'}
- Allergies: ${healthProfile.allergies?.join(', ') || 'None'}
- Medications: ${healthProfile.medications?.join(', ') || 'None'}
- Smoking Status: ${healthProfile.smokingStatus || 'Not specified'}
- Activity Level: ${healthProfile.activityLevel || 'Moderate'}
- Health Goals: ${healthProfile.healthGoals?.join(', ') || 'General wellness'}

TODAY'S NUTRITION (${analysisDate}):
- Calories: ${dailyTotals.calories} kcal
- Protein: ${dailyTotals.protein}g
- Carbohydrates: ${dailyTotals.carbs}g
- Fat: ${dailyTotals.fat}g
- Fiber: ${dailyTotals.fiber}g
- Sodium: ${dailyTotals.sodium}mg
- Sugar: ${dailyTotals.sugar}g

FOODS CONSUMED TODAY:
${foodData.map((f: any, i: number) => `${i + 1}. ${f.foodName} (${f.servingSize || 1} ${f.servingUnit || 'serving'})`).join('\n')}
${weeklyData ? `
WEEKLY SUMMARY (Last 7 days):
- Average daily calories: ${weeklyData.avgCalories} kcal
- Average protein: ${weeklyData.avgProtein}g
- Average carbs: ${weeklyData.avgCarbs}g
- Average fat: ${weeklyData.avgFat}g
- Unique foods eaten: ${weeklyData.uniqueFoods}
- Days tracked: ${weeklyData.daysTracked}
` : ''}

REQUIRED JSON RESPONSE FORMAT:
{
  "overallStatus": "safe" | "caution" | "avoid",
  "healthScore": 1-10,
  "healthScoreExplanation": "specific explanation for the score",
  "conflicts": [
    {
      "severity": "low" | "medium" | "high",
      "title": "brief conflict title",
      "description": "detailed explanation"
    }
  ],
  "recommendations": [
    {
      "type": "diet" | "lifestyle" | "tcm",
      "title": "specific recommendation title",
      "description": "detailed actionable advice",
      "priority": "low" | "medium" | "high"
    }
  ],
  "nutritionSummary": "comprehensive nutrition assessment",
  "safetyMessage": "food safety assessment for this person",
  "weeklyAnalysis": "AI analysis of weekly patterns and trends (if weekly data provided)"
}

Focus on:
1. Personalized advice based on their health conditions and goals
2. Specific, actionable recommendations
3. Potential food-medication interactions if applicable
4. Nutritional gaps or excesses
5. Food safety considerations for their health profile

Keep all text fields brief and precise (1-2 sentences maximum). Respond ONLY with valid JSON.`;

  const aiResponse = await callAIWithFallback(
    [
      {
        role: "system",
        content: "You are a professional nutritionist and health advisor. Analyze nutrition data and provide personalized health insights. Always respond in valid JSON format with the exact structure requested. Be brief, specific, and actionable. Keep all descriptions concise (1-2 sentences, maximum 30 words each)."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    {
      maxTokens: 4096,
      temperature: 0,
      jsonMode: true
    }
  );

  if (!aiResponse) {
    console.log('⚠️  No AI response, using rule-based fallback');
    return null;
  }

  console.log('📝 AI Response preview:', aiResponse.substring(0, 500));
  return parseAIResponse(aiResponse);
}

// Parse AI response with robust error handling
function parseAIResponse(aiResponse: string): any {
  try {
    // Use cleanJSONResponse to extract JSON even if there's extra text
    const cleaned = cleanJSONResponse(aiResponse);
    console.log('🧹 Cleaned JSON response:', cleaned.substring(0, 500));

    const parsed = JSON.parse(cleaned);

    // Validate the structure
    if (parsed.overallStatus && parsed.healthScore) {
      // Format all text fields for better readability
      const formattedConflicts = Array.isArray(parsed.conflicts)
        ? parsed.conflicts.map((c: any) => ({
            ...c,
            description: formatAIText(c.description || '')
          }))
        : [];

      const formattedRecommendations = Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map((r: any) => ({
            ...r,
            description: formatAIText(r.description || '')
          }))
        : [];

      return {
        overallStatus: parsed.overallStatus,
        healthScore: Math.min(10, Math.max(1, parsed.healthScore)),
        healthScoreExplanation: formatAIText(parsed.healthScoreExplanation || "AI-generated health assessment"),
        conflicts: formattedConflicts,
        recommendations: formattedRecommendations,
        nutritionSummary: formatAIText(parsed.nutritionSummary || "AI nutrition analysis completed"),
        safetyMessage: formatAIText(parsed.safetyMessage || "No specific safety concerns identified"),
        weeklyAnalysis: formatAIText(parsed.weeklyAnalysis || ''),
        aiGenerated: true
      };
    }

  } catch (parseError) {
    console.log('⚠️  JSON parse failed');
    console.log('📝 Full AI response for debugging:', aiResponse.substring(0, 1000));
    console.log('❌ Parse error:', parseError);
  }

  console.log('❌ parseAIResponse returning null - no valid JSON found');
  return null;
}

// Enhanced helper functions for conflict detection and recommendations
async function detectConflicts(profile: any, entries: any[]): Promise<ConflictResult[]> {
  const conflicts: ConflictResult[] = [];

  // Calculate total daily nutrients
  let totalSodium = 0;
  let totalSugar = 0;
  let totalSaturatedFat = 0;
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let totalFiber = 0;

  for (const entry of entries) {
    const nutrition = entry.nutritionData as NutritionData;
    totalSodium += nutrition.sodium || 0;
    totalSugar += nutrition.sugar || 0;
    totalSaturatedFat += (nutrition.fat || 0) * 0.3;
    totalCalories += nutrition.calories || 0;
    totalProtein += nutrition.protein || 0;
    totalCarbs += nutrition.carbs || 0;
    totalFat += nutrition.fat || 0;
    totalFiber += nutrition.fiber || 0;
  }

  // Apply formatting to totals
  totalSodium = Number(formatNumber(totalSodium, 0));
  totalSugar = Number(formatNumber(totalSugar));
  totalSaturatedFat = Number(formatNumber(totalSaturatedFat));
  totalCalories = Number(formatNumber(totalCalories, 0));
  totalProtein = Number(formatNumber(totalProtein));
  totalCarbs = Number(formatNumber(totalCarbs));
  totalFat = Number(formatNumber(totalFat));
  totalFiber = Number(formatNumber(totalFiber));

  // Build comprehensive AI prompt for conflict detection
  // Simplified food list - just food names without nutritional details
  const foodList = entries.map(e => e.foodName).join(', ');

  const conditions = (profile.medicalConditions || []).join(', ');
  const allergies = (profile.allergies || []).join(', ');
  const medications = (profile.medications || []).join(', ');
  const hasConditions = conditions.length > 0;
  const hasAllergies = allergies.length > 0;
  const hasMedications = medications.length > 0;

  // Calculate age from birth year/month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  let age = currentYear - (profile.birthYear || currentYear);
  if (profile.birthMonth && currentMonth < profile.birthMonth) {
    age--;
  }

  const comprehensivePrompt = `
Analyze potential health conflicts for this person's food intake:

Foods eaten today: ${foodList}

Daily Totals:
- Calories: ${totalCalories}, Sugar: ${totalSugar}g, Sodium: ${totalSodium}mg
- Protein: ${totalProtein}g, Carbs: ${totalCarbs}g, Fat: ${totalFat}g, Fiber: ${totalFiber}g

Health Profile:
- Gender: ${profile.gender || 'Not specified'}
- Age: ${age || 'Not specified'}
- Medical conditions: ${hasConditions ? conditions : 'None'}
- Food allergies: ${hasAllergies ? allergies : 'None'}
- Medications: ${hasMedications ? medications : 'None'}

Return conflicts as JSON array. If no conflicts, return empty array [].
Format: [{"type":"allergy or condition","severity":"high/medium/low","description":"brief description","foodItem":"food name"}]

Be brief and precise.`;

  console.log('🤖 Calling Gemini for conflict detection...');
  console.log('📋 Prompt preview:', comprehensivePrompt.substring(0, 500) + '...');

  const aiResponse = await callAIWithFallback(
    [
      {
        role: "system",
        content: "You are a health and nutrition expert. Analyze food intake for potential conflicts with medical conditions and allergies. Keep descriptions brief (1-2 sentences maximum). Always respond with valid JSON only."
      },
      {
        role: "user",
        content: comprehensivePrompt
      }
    ],
    {
      maxTokens: 4096,
      temperature: 0,
      jsonMode: false
    }
  );

  console.log('📥 Gemini raw response:', aiResponse?.substring(0, 500));

  if (!aiResponse) {
    console.error('❌ AI conflict detection failed - no response from Gemini');
    throw new Error('AI Service Unavailable - Failed to analyze conflicts');
  }

  try {
    // Clean and parse AI response
    const cleaned = cleanJSONResponse(aiResponse);
    console.log('🧹 Cleaned response:', cleaned.substring(0, 500));

    const aiConflicts = JSON.parse(cleaned);
    console.log('📊 Parsed conflicts:', JSON.stringify(aiConflicts, null, 2));

    if (Array.isArray(aiConflicts)) {
      console.log(`✅ AI detected ${aiConflicts.length} conflicts`);
      return aiConflicts;
    } else {
      console.error('❌ AI response is not an array:', aiConflicts);
      throw new Error('Invalid AI response format');
    }
  } catch (error) {
    console.error('❌ Failed to parse AI conflict response:', error);
    console.error('Raw response:', aiResponse);
    throw new Error('Failed to parse AI response');
  }
}

async function generateRecommendations(profile: any, entries: any[]): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  // Calculate daily totals - fix floating point precision issues
  let rawTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 };

  for (const entry of entries) {
    const nutrition = entry.nutritionData as NutritionData;
    rawTotals.calories += nutrition.calories || 0;
    rawTotals.protein += nutrition.protein || 0;
    rawTotals.carbs += nutrition.carbs || 0;
    rawTotals.fat += nutrition.fat || 0;
    rawTotals.fiber += nutrition.fiber || 0;
    rawTotals.sodium += nutrition.sodium || 0;
    rawTotals.sugar += nutrition.sugar || 0;
  }

  // Apply formatting to final totals to fix floating point precision
  const totals = {
    calories: Number(formatNumber(rawTotals.calories, 0)),
    protein: Number(formatNumber(rawTotals.protein)),
    carbs: Number(formatNumber(rawTotals.carbs)),
    fat: Number(formatNumber(rawTotals.fat)),
    fiber: Number(formatNumber(rawTotals.fiber)),
    sodium: Number(formatNumber(rawTotals.sodium, 0)),
    sugar: Number(formatNumber(rawTotals.sugar)),
  };

  // Build comprehensive prompt for single AI call
  const foodList = entries.map(e => e.foodName).join(', ');
  const conditions = (profile.medicalConditions || []).join(', ');
  const allergies = (profile.allergies || []).join(', ');
  const medications = (profile.medications || []).join(', ');
  const hasConditions = conditions.length > 0;
  const hasAllergies = allergies.length > 0;
  const hasMedications = medications.length > 0;

  // Calculate age from birth year/month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  let age = currentYear - (profile.birthYear || currentYear);
  if (profile.birthMonth && currentMonth < profile.birthMonth) {
    age--;
  }

  const comprehensivePrompt = `
Analyze this person's nutrition and provide personalized health recommendations:

Today's Intake:
- Foods eaten: ${foodList}
- Calories: ${formatNumber(rawTotals.calories, 0)}
- Protein: ${formatNumber(rawTotals.protein)}g
- Carbs: ${formatNumber(rawTotals.carbs)}g
- Sugar: ${formatNumber(rawTotals.sugar)}g
- Fat: ${formatNumber(rawTotals.fat)}g
- Fiber: ${formatNumber(rawTotals.fiber)}g
- Sodium: ${formatNumber(rawTotals.sodium, 0)}mg

Health Profile:
- Gender: ${profile.gender || 'Not specified'}
- Height: ${profile.height ? `${profile.height}cm` : 'Not specified'}
- Weight: ${profile.weight ? `${profile.weight}kg` : 'Not specified'}
- Age: ${age || 'Not specified'}
- Medical conditions: ${hasConditions ? conditions : 'None'}
- Food allergies: ${hasAllergies ? allergies : 'None'}
- Medications: ${hasMedications ? medications : 'None'}
- Smoking status: ${profile.smokingStatus || 'Not specified'}
- Activity level: ${profile.activityLevel || 'Moderate'}

Please provide 3-5 specific, actionable health recommendations. For each recommendation, be brief and focus on:
1. What nutrient or health aspect needs attention
2. Specific action to take
3. Why it matters for this person

Keep each recommendation to 1-2 sentences. Be brief and precise.`;

  // Make single AI call for all recommendations
  const aiResponse = await analyzeWithAI(comprehensivePrompt);
  const isAiAvailable = !aiResponse.includes("AI Service Unavailable");

  // Check if AI failed - throw error instead of using fallback
  if (!isAiAvailable || aiResponse.length < 50) {
    throw new Error('AI Service Unavailable - Failed to generate recommendations');
  }

  // AI provided comprehensive recommendations
  recommendations.push({
    type: "diet",
    title: "Personalized Health Recommendations",
    description: aiResponse,
    priority: "high",
    confidence: 0.9,
    specificActions: ["Review AI recommendations above", "Focus on priority items first", "Track progress daily"],
    expectedBenefit: "Improved overall health and nutrition",
    aiReasoning: "AI-powered comprehensive analysis"
  });

  // Rule-based supplementary recommendations (always add these)
  if (false) {
    // This code is kept for reference but never executed
    // Fallback to rule-based recommendations
    if (totals.protein < 50) {
      recommendations.push({
        type: "diet",
        title: "Optimize Protein Intake",
        description: `Current intake: ${formatNumber(rawTotals.protein)}g is below recommended levels. Include lean meats, fish, eggs, or plant-based proteins at each meal.`,
        priority: totals.protein < 30 ? "high" : "medium",
        confidence: 0.85,
        specificActions: ["Include lean meats, fish, eggs, or plant-based proteins", "Aim for protein with each meal"],
        expectedBenefit: "Improved muscle health and satiety",
        aiReasoning: "Rule-based analysis"
      });
    }

    if (totals.fiber < 25) {
      recommendations.push({
        type: "diet",
        title: "Increase Fiber Intake",
        description: `Current fiber: ${formatNumber(rawTotals.fiber)}g. Add more vegetables, fruits, whole grains, and legumes to reach 25-30g daily.`,
        priority: "medium",
        confidence: 0.9,
        specificActions: ["Add vegetables to each meal", "Choose whole grains over refined", "Include beans and legumes"],
        expectedBenefit: "Better digestive health and blood sugar control",
        aiReasoning: "Rule-based analysis"
      });
    }

    if (totals.sodium > 2300) {
      recommendations.push({
        type: "diet",
        title: "Reduce Sodium Intake",
        description: `Current sodium: ${formatNumber(rawTotals.sodium, 0)}mg exceeds the recommended 2300mg daily limit. Choose low-sodium foods and cook at home more often.`,
        priority: totals.sodium > 3000 ? "high" : "medium",
        confidence: 0.8,
        specificActions: ["Choose low-sodium foods", "Cook at home instead of eating out", "Use herbs and spices instead of salt"],
        expectedBenefit: "Lower blood pressure and reduced cardiovascular risk",
        aiReasoning: "Rule-based analysis"
      });
    }

    // Medical condition-specific recommendations
    for (const condition of profile.medicalConditions || []) {
      const conditionLower = condition.toLowerCase();

      if (conditionLower.includes("diabetes")) {
        recommendations.push({
          type: "diet",
          title: "Blood Sugar Management",
          description: `Today's carbs: ${formatNumber(rawTotals.carbs)}g, sugars: ${formatNumber(rawTotals.sugar)}g. Monitor portions and choose low glycemic index foods.`,
          priority: "high",
          confidence: 0.95,
          specificActions: ["Monitor carbohydrate portions", "Choose low glycemic index foods", "Include protein with meals"],
          expectedBenefit: "Better blood glucose control",
          aiReasoning: "Rule-based analysis for diabetes management"
        });
      }

      if (conditionLower.includes("hypertension")) {
        recommendations.push({
          type: "lifestyle",
          title: "Blood Pressure Support",
          description: `Monitor sodium intake (today: ${formatNumber(rawTotals.sodium, 0)}mg). Consider DASH diet principles with more potassium-rich foods.`,
          priority: "high",
          confidence: 0.9,
          specificActions: ["Reduce sodium intake", "Increase potassium-rich foods", "Follow DASH diet principles"],
          expectedBenefit: "Lower blood pressure and cardiovascular risk",
          aiReasoning: "Rule-based analysis for hypertension management"
        });
      }

      if (conditionLower.includes("heart") || conditionLower.includes("cardiac")) {
        recommendations.push({
          type: "diet",
          title: "Heart-Healthy Nutrition",
          description: `Focus on omega-3 fatty acids, limit saturated fats. Today's fat intake: ${formatNumber(rawTotals.fat)}g.`,
          priority: "high",
          confidence: 0.9,
          specificActions: ["Choose omega-3 rich fish", "Limit saturated fat sources", "Include nuts and olive oil"],
          expectedBenefit: "Improved cardiovascular health",
          aiReasoning: "Rule-based analysis for heart health"
        });
      }
    }

    // Activity-based recommendations
    if (totals.calories > 0) {
      const avgCaloriesPerMeal = totals.calories / Math.max(entries.length, 1);
      if (avgCaloriesPerMeal > 600) {
        recommendations.push({
          type: "lifestyle",
          title: "Portion Control",
          description: `Consider smaller, more frequent meals. Current average: ${Math.round(avgCaloriesPerMeal)} calories per meal.`,
          priority: "medium",
          confidence: 0.8,
          specificActions: ["Use smaller plates", "Eat 5-6 smaller meals", "Practice mindful eating"],
          expectedBenefit: "Better portion management and metabolism",
          aiReasoning: "Rule-based analysis"
        });
      }
    }
  }

  return recommendations;
}

async function generateTCMRecommendations(profile: any, entries: any[]): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = [];

  const currentSeason = new Date().getMonth() < 6 ? "spring/summer" : "fall/winter";
  const foodList = entries.map(e => e.foodName).join(', ');

  const conditions = (profile.medicalConditions || []).join(', ');
  const allergies = (profile.allergies || []).join(', ');
  const medications = (profile.medications || []).join(', ');
  const hasConditions = conditions.length > 0;
  const hasAllergies = allergies.length > 0;
  const hasMedications = medications.length > 0;

  // Calculate age from birth year/month
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  let age = currentYear - (profile.birthYear || currentYear);
  if (profile.birthMonth && currentMonth < profile.birthMonth) {
    age--;
  }

  const tcmPrompt = `Based on Traditional Chinese Medicine principles and current season (${currentSeason}), provide dietary advice for someone with the following profile:

Foods eaten today: ${foodList}

Health Profile:
- Gender: ${profile.gender || 'Not specified'}
- Height: ${profile.height ? `${profile.height}cm` : 'Not specified'}
- Weight: ${profile.weight ? `${profile.weight}kg` : 'Not specified'}
- Age: ${age || 'Not specified'}
- Medical conditions: ${hasConditions ? conditions : 'None'}
- Food allergies: ${hasAllergies ? allergies : 'None'}
- Medications: ${hasMedications ? medications : 'None'}
- Smoking status: ${profile.smokingStatus || 'Not specified'}

Provide 2-3 sentences focusing on seasonal balance and food temperature properties. Be brief and actionable.

Respond ONLY with plain text, no JSON formatting. Be brief and precise.`;

  const tcmAdvice = await callAIWithFallback(
    [
      {
        role: "system",
        content: "You are a Traditional Chinese Medicine expert. Provide seasonal dietary advice in plain text format."
      },
      {
        role: "user",
        content: tcmPrompt
      }
    ],
    {
      maxTokens: 4096,
      temperature: 0,
      jsonMode: false
    }
  );

  if (!tcmAdvice || tcmAdvice.length < 20) {
    throw new Error('AI Service Unavailable - Failed to generate TCM recommendations');
  }

  // Remove asterisks from TCM advice
  const cleanedTcmAdvice = tcmAdvice.replace(/\*+/g, '');

  recommendations.push({
    type: "tcm",
    title: `TCM Seasonal Balance (${currentSeason})`,
    description: cleanedTcmAdvice,
    priority: "low",
    confidence: 0.8,
    specificActions: currentSeason === "spring/summer" ? ["Add cooling foods", "Drink more water", "Include raw vegetables"] : ["Add warming spices", "Choose cooked foods", "Include hot beverages"],
    expectedBenefit: "Better seasonal adaptation and digestive comfort",
    aiReasoning: "AI analysis based on Traditional Chinese Medicine principles"
  });

  return recommendations;
}

function calculateHealthScore(profile: any, entries: any[], conflicts: ConflictResult[]): number {
  let score = 10; // Start with perfect score
  
  // Calculate nutritional totals - fix floating point precision issues
  let rawTotals = { calories: 0, protein: 0, fiber: 0, sodium: 0, sugar: 0, fat: 0 };
  
  for (const entry of entries) {
    const nutrition = entry.nutritionData as NutritionData;
    rawTotals.calories += nutrition.calories || 0;
    rawTotals.protein += nutrition.protein || 0;
    rawTotals.fiber += nutrition.fiber || 0;
    rawTotals.sodium += nutrition.sodium || 0;
    rawTotals.sugar += nutrition.sugar || 0;
    rawTotals.fat += nutrition.fat || 0;
  }
  
  // Apply formatting to final totals
  const totals = {
    calories: Number(formatNumber(rawTotals.calories, 0)),
    protein: Number(formatNumber(rawTotals.protein)),
    fiber: Number(formatNumber(rawTotals.fiber)),
    sodium: Number(formatNumber(rawTotals.sodium, 0)),
    sugar: Number(formatNumber(rawTotals.sugar)),
    fat: Number(formatNumber(rawTotals.fat)),
  };

  // Deduct points for conflicts
  for (const conflict of conflicts) {
    if (conflict.severity === "high") score -= 2;
    else if (conflict.severity === "medium") score -= 1;
    else score -= 0.5;
  }

  // Nutritional balance scoring
  // Protein adequacy (50-100g ideal range)
  if (totals.protein < 30) score -= 1.5;
  else if (totals.protein < 50) score -= 0.5;
  else if (totals.protein > 150) score -= 0.5; // Too much protein

  // Fiber adequacy (25-35g ideal range)  
  if (totals.fiber < 15) score -= 1;
  else if (totals.fiber < 25) score -= 0.5;

  // Sodium levels (< 2300mg recommended)
  if (totals.sodium > 3500) score -= 2;
  else if (totals.sodium > 2300) score -= 1;

  // Sugar intake (< 50g recommended)
  if (totals.sugar > 100) score -= 2;
  else if (totals.sugar > 50) score -= 1;

  // Calorie balance (1800-2200 for average adult)
  if (totals.calories < 1200) score -= 1.5; // Too low
  else if (totals.calories > 3000) score -= 1; // Too high

  // Meal variety bonus
  const uniqueFoods = new Set(entries.map(e => e.foodName.toLowerCase()));
  if (uniqueFoods.size >= 5) score += 0.5; // Bonus for variety
  
  // Medical condition considerations
  for (const condition of profile.medicalConditions || []) {
    const conditionLower = condition.toLowerCase();
    
    if (conditionLower.includes("diabetes") && totals.sugar > 75) {
      score -= 1.5; // Extra penalty for diabetics with high sugar
    }
    
    if (conditionLower.includes("hypertension") && totals.sodium > 2000) {
      score -= 1; // Extra penalty for hypertension with high sodium
    }
  }

  // Reduce score for conflicts
  const highSeverityConflicts = conflicts.filter(c => c.severity === "high").length;
  score -= highSeverityConflicts * 2;
  
  const mediumSeverityConflicts = conflicts.filter(c => c.severity === "medium").length;
  score -= mediumSeverityConflicts * 1;

  // Ensure score stays within 1-10 range
  return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
}

function determineStatus(conflicts: ConflictResult[]): string {
  const hasHighSeverity = conflicts.some(c => c.severity === "high");
  const hasMediumSeverity = conflicts.some(c => c.severity === "medium");
  
  if (hasHighSeverity) return "avoid";
  if (hasMediumSeverity) return "caution";
  return "safe";
}

async function generateWeeklySummary(profile: any, entriesThisWeek: any[]): Promise<any> {
  // Calculate weekly totals - fix floating point precision issues
  let rawTotals = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 };
  
  for (const entry of entriesThisWeek) {
    const nutrition = entry.nutritionData as NutritionData;
    rawTotals.calories += nutrition.calories || 0;
    rawTotals.protein += nutrition.protein || 0;
    rawTotals.carbs += nutrition.carbs || 0;
    rawTotals.fat += nutrition.fat || 0;
    rawTotals.fiber += nutrition.fiber || 0;
    rawTotals.sodium += nutrition.sodium || 0;
    rawTotals.sugar += nutrition.sugar || 0;
  }
  
  // Apply formatting to final totals
  const weeklyTotals = {
    calories: Number(formatNumber(rawTotals.calories, 0)),
    protein: Number(formatNumber(rawTotals.protein)),
    carbs: Number(formatNumber(rawTotals.carbs)),
    fat: Number(formatNumber(rawTotals.fat)),
    fiber: Number(formatNumber(rawTotals.fiber)),
    sodium: Number(formatNumber(rawTotals.sodium, 0)),
    sugar: Number(formatNumber(rawTotals.sugar)),
  };

  // Calculate unique days from entry dates
  const uniqueDays = new Set(entriesThisWeek.map(entry => entry.entryDate));
  const days = Math.max(uniqueDays.size, 1);

  // Calculate date range (last 7 days from most recent entry)
  const sortedDates = Array.from(uniqueDays).sort();
  const startDate = sortedDates.length > 0 ? sortedDates[0] : null;
  const endDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null;

  console.log(`Weekly entries: ${entriesThisWeek.length}, Unique days: ${uniqueDays.size}`, Array.from(uniqueDays));
  const avgCalories = Math.round(weeklyTotals.calories / days);
  const avgProtein = Number(formatNumber(weeklyTotals.protein / days));
  const avgCarbs = Number(formatNumber(weeklyTotals.carbs / days));
  const avgFat = Number(formatNumber(weeklyTotals.fat / days));
  const avgFiber = Number(formatNumber(weeklyTotals.fiber / days));

  // Count unique foods consumed
  const uniqueFoods = new Set(entriesThisWeek.map(entry => entry.foodName.toLowerCase()));
  const varietyScore = Math.min(10, uniqueFoods.size);

  // No AI call on initial load to avoid rate limiting - insights provided on-demand
  const aiAnalysis = null;

  // Generate insights based on weekly data
  const insights = [];
  
  if (avgCalories < 1200) {
    insights.push("Consider increasing caloric intake - current levels may be too low for optimal health");
  } else if (avgCalories > 2500) {
    insights.push("Caloric intake is above recommended levels - consider portion control");
  }

  if (avgProtein < 50) {
    insights.push("Protein intake could be improved - aim for more lean proteins");
  }

  if (weeklyTotals.fiber / days < 25) {
    insights.push("Increase fiber intake with more fruits, vegetables, and whole grains");
  }

  if (varietyScore < 5) {
    insights.push("Try incorporating more variety in your diet for better nutrition");
  }

  return {
    period: "This Week",
    startDate,
    endDate,
    calories: avgCalories,
    protein: avgProtein,
    carbs: avgCarbs,
    fat: avgFat,
    fiber: avgFiber,
    variety: varietyScore,
    insights: insights.length > 0 ? insights : ["Your dietary patterns look balanced this week"],
    aiAnalysis,
    daysTracked: days,
    totalFoodsConsumed: uniqueFoods.size
  };
}

// AI-powered food search and nutrition generation
async function searchFoodWithAI(query: string, originalQuery?: string): Promise<any[]> {
  try {
    console.log(`Searching for "${query}" with AI...`);

    // Generate AI-powered food suggestions based on the query
    const foodSuggestions = await generateFoodSuggestionsWithAI(query, originalQuery);
    
    return foodSuggestions.map((food, index) => ({
      id: `ai-${encodeURIComponent(food.name.toLowerCase())}-${index}`,
      name: food.name,
      chineseName: food.chineseName,
      brand: food.brand || null,
      nutrients: food.estimatedNutrients || {},
      source: "ai"
    }));
  } catch (error) {
    console.error("AI food search failed:", error);
    return [];
  }
}

async function generateFoodSuggestionsWithAI(query: string, originalQuery?: string): Promise<any[]> {
  try {
    const lowerQuery = query.toLowerCase();
    const suggestions = [];

    // Add comprehensive food matching logic here
    if (lowerQuery.includes("apple") || lowerQuery.includes("nuts") || lowerQuery.includes("nut")) {
      const displayName = originalQuery && originalQuery !== query ? originalQuery : query;
      suggestions.push({
        name: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        estimatedNutrients: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 }
      });
    }

    // If no specific matches, generate AI-powered nutrition data
    if (suggestions.length === 0) {
      const displayName = originalQuery && originalQuery !== query ? originalQuery : query;
      const foodName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

      // Get AI-generated nutrition data
      const nutritionData = await generateNutritionWithAI(foodName);

      suggestions.push({
        name: foodName,
        estimatedNutrients: {
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.carbs,
          fat: nutritionData.fat,
          fiber: nutritionData.fiber,
          sugar: nutritionData.sugar,
          sodium: nutritionData.sodium,
          vitamins: nutritionData.vitamins,
          minerals: nutritionData.minerals,
          alcohol: nutritionData.alcohol,
          caffeine: nutritionData.caffeine,
          bioactive: nutritionData.bioactive
        }
      });
    }

    return suggestions;
  } catch (error) {
    console.error('Error generating food suggestions:', error);

    // Fallback to basic suggestion
    const foodName = query.charAt(0).toUpperCase() + query.slice(1);
    const fallbackNutrition = getFallbackNutrition(foodName);

    return [{
      name: foodName,
      estimatedNutrients: {
        calories: fallbackNutrition.calories,
        protein: fallbackNutrition.protein,
        carbs: fallbackNutrition.carbs,
        fat: fallbackNutrition.fat,
        fiber: fallbackNutrition.fiber,
        sugar: fallbackNutrition.sugar,
        sodium: fallbackNutrition.sodium,
        vitamins: fallbackNutrition.vitamins,
        minerals: fallbackNutrition.minerals,
        alcohol: fallbackNutrition.alcohol,
        caffeine: fallbackNutrition.caffeine,
        bioactive: fallbackNutrition.bioactive
      }
    }];
  }
}

async function generateNutritionWithAI(foodName: string): Promise<NutritionData> {
  try {
    console.log(`Generating nutrition data for: ${foodName}`);

    // Detect if food name is in Chinese and translate it
    const isChinese = /[\u4e00-\u9fa5]/.test(foodName);
    let englishFoodName = foodName;

    if (isChinese) {
      console.log(`Translating Chinese food name: ${foodName}`);
      try {
        englishFoodName = await translateWithGoogle(foodName, 'en');
        console.log(`✅ Translated to: ${englishFoodName}`);
      } catch (translateErr) {
        console.log('⚠️ Translation failed, using original name:', translateErr);
      }
    }

    const prompt = `Provide accurate nutrition information for "${englishFoodName}" (original name: "${foodName}") per 100g.

IMPORTANT: Respond with ONLY a valid JSON object containing comprehensive nutrition data per 100g serving.

Required JSON format:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number,
  "fiber": number,
  "sugar": number,
  "sodium": number,
  "vitamins": {
    "vitamin_c": number (mg),
    "vitamin_a": number (mcg RAE),
    "vitamin_e": number (mg),
    "vitamin_k": number (mcg),
    "vitamin_b1": number (mg),
    "vitamin_b2": number (mg),
    "vitamin_b3": number (mg),
    "vitamin_b6": number (mg),
    "folate": number (mcg),
    "vitamin_b12": number (mcg)
  },
  "minerals": {
    "calcium": number (mg),
    "iron": number (mg),
    "magnesium": number (mg),
    "phosphorus": number (mg),
    "potassium": number (mg),
    "zinc": number (mg),
    "copper": number (mg),
    "manganese": number (mg),
    "selenium": number (mcg)
  },
  "alcohol": number (% by volume, if alcoholic),
  "caffeine": number (mg, if caffeinated),
  "bioactive": ["compound1", "compound2"] (important bioactive compounds)
}

Base your response on standard nutrition databases like USDA. Include realistic micronutrient values - use 0 for nutrients that are minimal/absent in this food.
For alcoholic beverages, include alcohol percentage. For coffee/tea, include caffeine. Include notable bioactive compounds.
Respond with ONLY the JSON object, no additional text.`;

    // Use Gemini for nutrition generation
    const aiResponse = await callAIWithFallback(
      [
        {
          role: "system",
          content: "You are a nutrition database. Provide accurate nutrition data in JSON format only. No explanations or additional text."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      {
        maxTokens: 4096, // Increased to account for Gemini thinking tokens + response
        temperature: 0.1, // Low temperature for factual data
        jsonMode: true
      }
    );

    console.log('🤖 Gemini nutrition response received:', aiResponse ? 'YES' : 'NO');
    console.log('📝 Response preview:', aiResponse?.substring(0, 200));

    if (!aiResponse) {
      console.log('❌ No AI response received, using fallback for:', foodName);
      return getFallbackNutrition(foodName);
    }

    // Parse the JSON response with error handling
    let nutritionData;
    try {
      // Clean the response - remove any markdown formatting and ensure complete JSON
      const cleanResponse = aiResponse.trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .replace(/,\s*$/, ''); // Remove trailing comma

      // Try to fix incomplete JSON by checking if it ends properly
      let jsonString = cleanResponse;
      if (!jsonString.endsWith('}')) {
        // If JSON is incomplete, try to close it properly
        const openBraces = (jsonString.match(/{/g) || []).length;
        const closeBraces = (jsonString.match(/}/g) || []).length;
        const missingBraces = openBraces - closeBraces;

        if (missingBraces > 0) {
          console.log('Incomplete JSON detected, attempting to fix...');
          // Remove incomplete last property and close the JSON
          jsonString = jsonString.replace(/,?\s*"[^"]*":\s*$/, '') + '}';
          for (let i = 1; i < missingBraces; i++) {
            jsonString += '}';
          }
        }
      }

      nutritionData = JSON.parse(jsonString);
    } catch (parseError: unknown) {
      const errorMsg = parseError instanceof Error ? parseError.message : String(parseError);
      console.log('JSON parsing failed:', errorMsg);
      console.log('AI response was:', aiResponse);
      console.log('Using fallback nutrition data');
      return getFallbackNutrition(foodName);
    }

    // Validate response completeness - if missing vitamins and minerals, it's incomplete
    if (!nutritionData.vitamins && !nutritionData.minerals) {
      console.log('❌ Incomplete AI response: missing vitamins and minerals, using fallback for:', foodName);
      console.log('📊 Parsed data:', JSON.stringify(nutritionData, null, 2));
      return getFallbackNutrition(foodName);
    }

    // Validate and sanitize the data
    const validatedNutrition = {
      calories: Math.max(0, Math.round(nutritionData.calories || 0)),
      protein: Math.max(0, parseFloat((nutritionData.protein || 0).toFixed(1))),
      carbs: Math.max(0, parseFloat((nutritionData.carbs || 0).toFixed(1))),
      fat: Math.max(0, parseFloat((nutritionData.fat || 0).toFixed(1))),
      fiber: Math.max(0, parseFloat((nutritionData.fiber || 0).toFixed(1))),
      sugar: Math.max(0, parseFloat((nutritionData.sugar || 0).toFixed(1))),
      sodium: Math.max(0, Math.round(nutritionData.sodium || 0)),
      vitamins: nutritionData.vitamins ? {
        vitamin_c: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_c || 0).toFixed(1))),
        vitamin_a: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_a || 0).toFixed(1))),
        vitamin_e: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_e || 0).toFixed(1))),
        vitamin_k: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_k || 0).toFixed(1))),
        vitamin_b1: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_b1 || 0).toFixed(2))),
        vitamin_b2: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_b2 || 0).toFixed(2))),
        vitamin_b3: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_b3 || 0).toFixed(1))),
        vitamin_b6: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_b6 || 0).toFixed(2))),
        folate: Math.max(0, parseFloat((nutritionData.vitamins.folate || 0).toFixed(1))),
        vitamin_b12: Math.max(0, parseFloat((nutritionData.vitamins.vitamin_b12 || 0).toFixed(2)))
      } : undefined,
      minerals: nutritionData.minerals ? {
        calcium: Math.max(0, Math.round(nutritionData.minerals.calcium || 0)),
        iron: Math.max(0, parseFloat((nutritionData.minerals.iron || 0).toFixed(1))),
        magnesium: Math.max(0, Math.round(nutritionData.minerals.magnesium || 0)),
        phosphorus: Math.max(0, Math.round(nutritionData.minerals.phosphorus || 0)),
        potassium: Math.max(0, Math.round(nutritionData.minerals.potassium || 0)),
        zinc: Math.max(0, parseFloat((nutritionData.minerals.zinc || 0).toFixed(1))),
        copper: Math.max(0, parseFloat((nutritionData.minerals.copper || 0).toFixed(2))),
        manganese: Math.max(0, parseFloat((nutritionData.minerals.manganese || 0).toFixed(2))),
        selenium: Math.max(0, parseFloat((nutritionData.minerals.selenium || 0).toFixed(1)))
      } : undefined,
      alcohol: nutritionData.alcohol ? Math.max(0, parseFloat((nutritionData.alcohol).toFixed(1))) : undefined,
      caffeine: nutritionData.caffeine ? Math.max(0, Math.round(nutritionData.caffeine)) : undefined,
      bioactive: Array.isArray(nutritionData.bioactive) ? nutritionData.bioactive : undefined
    };

    console.log('Generated nutrition data:', validatedNutrition);
    return validatedNutrition;

  } catch (error) {
    console.error('Error generating nutrition with AI:', error);
    return getFallbackNutrition(foodName);
  }
}

function getFallbackNutrition(foodName: string): NutritionData {
  // Enhanced fallback based on food type detection with bioactive compounds
  const foodLower = foodName.toLowerCase();

  // Alcoholic beverages (beer, wine, vodka, etc.)
  if (foodLower.includes('beer') || foodLower.includes('lager') || foodLower.includes('ale')) {
    return {
      calories: 43, protein: 0.5, carbs: 3.6, fat: 0, fiber: 0, sugar: 0, sodium: 4,
      vitamins: { vitamin_b3: 0.9, vitamin_b6: 0.046, folate: 21, vitamin_b2: 0.025, vitamin_b12: 0.02, vitamin_b1: 0.005, vitamin_c: 0, vitamin_a: 0, vitamin_e: 0, vitamin_k: 0 },
      minerals: { potassium: 27, magnesium: 6, calcium: 4, phosphorus: 14, iron: 0.02, zinc: 0.01, copper: 0.006, manganese: 0.008, selenium: 0.6 },
      alcohol: 4.5, // % alcohol by volume
      bioactive: {
        'hops_compounds': 1,
        'polyphenols': 1,
        'ethanol': 4.5
      }
    };
  }

  if (foodLower.includes('vodka') || foodLower.includes('vodca') || foodLower.includes('spirit')) {
    return {
      calories: 231, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 1,
      vitamins: { vitamin_c: 0, vitamin_a: 0, vitamin_e: 0, vitamin_k: 0, vitamin_b1: 0, vitamin_b2: 0, vitamin_b3: 0, vitamin_b6: 0, folate: 0, vitamin_b12: 0 },
      minerals: { calcium: 0, iron: 0.04, magnesium: 0, phosphorus: 1, potassium: 1, zinc: 0.04, copper: 0, manganese: 0, selenium: 0 },
      alcohol: 40, // % alcohol by volume
      bioactive: { 'ethanol': 40, 'congeners': 1 }
    };
  }

  if (foodLower.includes('wine') || foodLower.includes('红酒') || foodLower.includes('白酒')) {
    return {
      calories: 83, protein: 0.1, carbs: 2.6, fat: 0, fiber: 0, sugar: 1, sodium: 4,
      vitamins: { vitamin_c: 0, vitamin_a: 0, vitamin_e: 0, vitamin_k: 0.3, vitamin_b1: 0.001, vitamin_b2: 0.001, vitamin_b3: 0.1, vitamin_b6: 0.04, folate: 1, vitamin_b12: 0 },
      minerals: { potassium: 99, magnesium: 10, calcium: 8, phosphorus: 18, iron: 0.46, zinc: 0.07, copper: 0.001, manganese: 0.13, selenium: 0.1 },
      alcohol: 12.5, // % alcohol by volume
      bioactive: { 'resveratrol': 1, 'anthocyanins': 1, 'tannins': 1, 'quercetin': 1, 'ethanol': 12 }
    };
  }

  // Dark chocolate (rich in flavonoids)
  if (foodLower.includes('chocolate') || foodLower.includes('cocoa') || foodLower.includes('巧克力')) {
    return {
      calories: 546, protein: 7.8, carbs: 45.9, fat: 31.3, fiber: 10.9, sugar: 24, sodium: 24,
      vitamins: { vitamin_c: 0, vitamin_a: 2, vitamin_e: 0.6, vitamin_k: 7.3, vitamin_b1: 0.03, vitamin_b2: 0.08, vitamin_b3: 2.2, vitamin_b6: 0.04, folate: 12, vitamin_b12: 0.3 },
      minerals: { calcium: 73, iron: 11.9, magnesium: 228, phosphorus: 308, potassium: 715, zinc: 3.3, copper: 1.8, manganese: 1.9, selenium: 6.8 },
      bioactive: { 'epicatechin': 1, 'catechin': 1, 'theobromine': 272, 'caffeine': 43, 'phenylethylamine': 1 }
    };
  }

  // Coffee (caffeine and antioxidants)
  if (foodLower.includes('coffee') || foodLower.includes('咖啡') || foodLower.includes('espresso')) {
    return {
      calories: 2, protein: 0.1, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 2,
      vitamins: { vitamin_c: 0, vitamin_a: 0, vitamin_e: 0, vitamin_k: 0.1, vitamin_b1: 0, vitamin_b2: 0.01, vitamin_b3: 0.7, vitamin_b6: 0, folate: 5, vitamin_b12: 0 },
      minerals: { calcium: 2, iron: 0.01, magnesium: 3, phosphorus: 3, potassium: 49, zinc: 0.02, copper: 0.001, manganese: 0.023, selenium: 0 },
      caffeine: 95, // mg per 100ml
      bioactive: { 'chlorogenic_acids': 1, 'caffeine': 95, 'trigonelline': 1, 'quinides': 1 }
    };
  }

  // Fruits (rich in vitamin C, potassium, antioxidants)
  if (foodLower.includes('apple') || foodLower.includes('banana') || foodLower.includes('orange') || foodLower.includes('苹果') || foodLower.includes('香蕉')) {
    return {
      calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1,
      vitamins: { vitamin_c: 10.3, vitamin_a: 3, vitamin_b6: 0.4, folate: 20, vitamin_k: 2.2, vitamin_e: 0.2, vitamin_b1: 0.02, vitamin_b2: 0.03, vitamin_b3: 0.4, vitamin_b12: 0 },
      minerals: { potassium: 422, magnesium: 32, calcium: 6, iron: 0.3, phosphorus: 26, zinc: 0.2, copper: 0.1, manganese: 0.3, selenium: 1 },
      bioactive: { 'quercetin': 1, 'catechins': 1, 'anthocyanins': 1, 'pectin': 1 }
    };
  }

  // Vegetables (rich in vitamins A, C, K, folate, phytonutrients)
  if (foodLower.includes('carrot') || foodLower.includes('broccoli') || foodLower.includes('spinach') || foodLower.includes('kale') || foodLower.includes('西兰花')) {
    return {
      calories: 25, protein: 2.8, carbs: 5, fat: 0.3, fiber: 3, sugar: 2, sodium: 24,
      vitamins: { vitamin_c: 89.2, vitamin_a: 469, vitamin_k: 101.6, folate: 63, vitamin_e: 0.7, vitamin_b6: 0.2, vitamin_b1: 0.07, vitamin_b2: 0.19, vitamin_b3: 0.6, vitamin_b12: 0 },
      minerals: { calcium: 47, iron: 2.7, magnesium: 79, phosphorus: 49, potassium: 558, zinc: 0.5, copper: 0.1, manganese: 0.9, selenium: 1.5 },
      bioactive: { 'beta_carotene': 1, 'lutein': 1, 'zeaxanthin': 1, 'sulforaphane': 1, 'indole_3_carbinol': 1 }
    };
  }

  // Meat/Protein (rich in B vitamins, iron, zinc, creatine)
  if (foodLower.includes('chicken') || foodLower.includes('beef') || foodLower.includes('fish') || foodLower.includes('salmon') || foodLower.includes('鸡肉')) {
    return {
      calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74,
      vitamins: { vitamin_b3: 14.8, vitamin_b6: 1.0, vitamin_b12: 0.3, vitamin_b1: 0.08, vitamin_b2: 0.16, folate: 4, vitamin_e: 0.3, vitamin_k: 0.4, vitamin_a: 6, vitamin_c: 0 },
      minerals: { phosphorus: 228, selenium: 27.6, zinc: 1.0, iron: 0.9, magnesium: 29, calcium: 15, potassium: 256, copper: 0.05, manganese: 0.02 },
      bioactive: { 'creatine': 500, 'carnosine': 1, 'taurine': 1, 'coq10': 1 }
    };
  }

  // Tea (antioxidants and caffeine)
  if (foodLower.includes('tea') || foodLower.includes('绿茶') || foodLower.includes('红茶')) {
    return {
      calories: 1, protein: 0, carbs: 0.3, fat: 0, fiber: 0, sugar: 0, sodium: 3,
      vitamins: { vitamin_c: 0, vitamin_a: 0, vitamin_e: 0, vitamin_k: 0, vitamin_b1: 0, vitamin_b2: 0.01, vitamin_b3: 0, vitamin_b6: 0, folate: 1, vitamin_b12: 0 },
      minerals: { calcium: 0, iron: 0.02, magnesium: 1, phosphorus: 1, potassium: 8, zinc: 0.02, copper: 0.001, manganese: 0.18, selenium: 0 },
      caffeine: 28, // mg per 100ml
      bioactive: { 'egcg': 1, 'catechins': 1, 'theaflavins': 1, 'l_theanine': 1 }
    };
  }

  // Grains/Carbs (B vitamins, some minerals, phytic acid)
  if (foodLower.includes('rice') || foodLower.includes('bread') || foodLower.includes('pasta') || foodLower.includes('米饭')) {
    return {
      calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 1.4, sugar: 0.1, sodium: 5,
      vitamins: { vitamin_b1: 0.07, vitamin_b3: 1.6, folate: 8, vitamin_b6: 0.16, vitamin_b2: 0.05, vitamin_e: 0.1, vitamin_k: 0.1, vitamin_a: 0, vitamin_b12: 0, vitamin_c: 0 },
      minerals: { magnesium: 25, phosphorus: 115, potassium: 115, zinc: 1.1, iron: 0.8, calcium: 28, copper: 0.2, manganese: 1.1, selenium: 15.1 },
      bioactive: { 'phytic_acid': 1, 'resistant_starch': 1, 'beta_glucan': 1 }
    };
  }

  // More intelligent default fallback based on food name patterns
  // Nuts and seeds (坚果类)
  if (foodLower.includes('nut') || foodLower.includes('seed') || foodLower.includes('坚果') ||
      foodLower.includes('杏仁') || foodLower.includes('核桃') || foodLower.includes('花生')) {
    return {
      calories: 580, protein: 20, carbs: 20, fat: 50, fiber: 8, sugar: 5, sodium: 5,
      vitamins: { vitamin_e: 25, vitamin_b1: 0.7, vitamin_b2: 0.3, vitamin_b3: 4, vitamin_b6: 0.3, folate: 50, vitamin_c: 0, vitamin_a: 1, vitamin_k: 7, vitamin_b12: 0 },
      minerals: { magnesium: 270, phosphorus: 480, potassium: 700, zinc: 3, iron: 3, calcium: 250, copper: 1.1, manganese: 2.3, selenium: 4 },
      bioactive: { 'omega_3': 1, 'vitamin_e_tocopherols': 1, 'phytosterols': 1 }
    };
  }

  // Fruits (水果类)
  if (foodLower.includes('fruit') || foodLower.includes('apple') || foodLower.includes('banana') ||
      foodLower.includes('水果') || foodLower.includes('苹果') || foodLower.includes('香蕉')) {
    return {
      calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1,
      vitamins: { vitamin_c: 5, vitamin_a: 3, vitamin_k: 2, vitamin_b6: 0.1, folate: 3, vitamin_e: 0.2, vitamin_b1: 0.02, vitamin_b2: 0.03, vitamin_b3: 0.1, vitamin_b12: 0 },
      minerals: { potassium: 107, calcium: 6, magnesium: 5, phosphorus: 11, iron: 0.1, zinc: 0.04, copper: 0.03, manganese: 0.04, selenium: 0 },
      bioactive: { 'flavonoids': 1, 'pectin': 1, 'natural_sugars': 1 }
    };
  }

  // Vegetables (蔬菜类)
  if (foodLower.includes('vegetable') || foodLower.includes('green') || foodLower.includes('lettuce') ||
      foodLower.includes('蔬菜') || foodLower.includes('菠菜') || foodLower.includes('白菜')) {
    return {
      calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 2, sodium: 79,
      vitamins: { vitamin_c: 28, vitamin_a: 469, vitamin_k: 483, folate: 194, vitamin_e: 2, vitamin_b6: 0.2, vitamin_b1: 0.08, vitamin_b2: 0.19, vitamin_b3: 0.7, vitamin_b12: 0 },
      minerals: { potassium: 558, calcium: 99, magnesium: 79, phosphorus: 49, iron: 2.7, zinc: 0.5, copper: 0.1, manganese: 0.9, selenium: 1 },
      bioactive: { 'chlorophyll': 1, 'carotenoids': 1, 'nitrates': 1 }
    };
  }

  // Dairy products (乳制品)
  if (foodLower.includes('milk') || foodLower.includes('cheese') || foodLower.includes('yogurt') ||
      foodLower.includes('牛奶') || foodLower.includes('酸奶') || foodLower.includes('奶酪')) {
    return {
      calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44,
      vitamins: { vitamin_b12: 0.5, vitamin_b2: 0.2, vitamin_a: 46, vitamin_d: 1, vitamin_k: 0.3, vitamin_c: 0, vitamin_e: 0.1, vitamin_b1: 0.04, vitamin_b3: 0.1, vitamin_b6: 0.04, folate: 5 },
      minerals: { calcium: 125, phosphorus: 95, potassium: 150, zinc: 0.4, selenium: 3.3, magnesium: 11, iron: 0.03, copper: 0.01, manganese: 0.004 },
      bioactive: { 'lactoferrin': 1, 'immunoglobulins': 1, 'probiotics': 1 }
    };
  }

  // Meat and poultry (肉类)
  if (foodLower.includes('meat') || foodLower.includes('chicken') || foodLower.includes('beef') ||
      foodLower.includes('肉') || foodLower.includes('鸡肉') || foodLower.includes('牛肉')) {
    return {
      calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74,
      vitamins: { vitamin_b3: 14.8, vitamin_b6: 1.0, vitamin_b12: 0.3, vitamin_b1: 0.08, vitamin_b2: 0.16, folate: 4, vitamin_e: 0.3, vitamin_k: 0.4, vitamin_a: 6, vitamin_c: 0 },
      minerals: { phosphorus: 228, selenium: 27.6, zinc: 1.0, iron: 0.9, magnesium: 29, calcium: 15, potassium: 256, copper: 0.05, manganese: 0.02 },
      bioactive: { 'creatine': 500, 'carnosine': 1, 'taurine': 1, 'coq10': 1 }
    };
  }

  // Generic default fallback (balanced micronutrients)
  return {
    calories: 100,
    protein: 3,
    carbs: 15,
    fat: 2,
    fiber: 2,
    sugar: 3,
    sodium: 50,
    vitamins: { vitamin_c: 5, vitamin_a: 10, vitamin_e: 0.5, vitamin_k: 5, vitamin_b1: 0.05, vitamin_b2: 0.05, vitamin_b3: 1, vitamin_b6: 0.1, folate: 10, vitamin_b12: 0.1 },
    minerals: { calcium: 20, iron: 1, magnesium: 15, phosphorus: 50, potassium: 150, zinc: 0.5, copper: 0.1, manganese: 0.2, selenium: 2 },
    bioactive: { 'phytonutrients': 1, 'antioxidants': 1 }
  };
}

// AI-powered nutrient information generation
async function generateNutrientInfoWithAI(nutrientName: string): Promise<any> {
  try {
    console.log(`Generating nutrient information for: ${nutrientName}`);

    // Check if we have Hugging Face token
    if (!process.env.HF_TOKEN) {
      console.log('No HF_TOKEN found, using fallback nutrient info');
      return getFallbackNutrientInfo(nutrientName);
    }

    // Initialize Llama client
    const llamaClient = new OpenAI({
      baseURL: "https://router.huggingface.co/v1",
      apiKey: process.env.HF_TOKEN,
    });

    const prompt = `Provide comprehensive information about the nutrient "${nutrientName}".

IMPORTANT: Respond with ONLY a valid JSON object containing detailed nutrient information.

Required JSON format:
{
  "name": "Nutrient Name",
  "description": "Clear explanation of what this nutrient does in the body",
  "benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "sources": ["good food source 1", "good food source 2", "good food source 3"],
  "unit": "mg/mcg/g",
  "dailyValue": number,
  "deficiencySymptoms": ["symptom 1", "symptom 2"],
  "functions": ["function 1", "function 2"],
  "absorptionTips": ["tip 1", "tip 2"]
}

Nutrient: ${nutrientName}
Base your response on established nutritional science. Be accurate and informative.
Respond with ONLY the JSON object, no additional text.`;

    const completion = await llamaClient.chat.completions.create({
      model: "meta-llama/Llama-3.2-3B-Instruct:novita",
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert. Provide accurate, evidence-based information about nutrients in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.1, // Low temperature for factual information
    });

    const aiResponse = completion.choices[0].message.content;
    console.log('Llama nutrient response:', aiResponse);

    if (!aiResponse) {
      console.log('No AI response received, using fallback');
      return getFallbackNutrientInfo(nutrientName);
    }

    // Parse the JSON response
    const nutrientInfo = JSON.parse(aiResponse);

    console.log('Generated nutrient info:', nutrientInfo);
    return nutrientInfo;

  } catch (error) {
    console.error('Error generating nutrient info with AI:', error);
    return getFallbackNutrientInfo(nutrientName);
  }
}

function getFallbackNutrientInfo(nutrientName: string): any {
  const nutrientLower = nutrientName.toLowerCase();

  // Common nutrient information fallbacks
  const fallbackNutrients: { [key: string]: any } = {
    'vitamin_c': {
      name: 'Vitamin C',
      description: 'An essential water-soluble vitamin that acts as an antioxidant and supports immune function.',
      benefits: ['Supports immune system', 'Promotes collagen synthesis', 'Enhances iron absorption', 'Protects against oxidative stress'],
      sources: ['Citrus fruits', 'Strawberries', 'Bell peppers', 'Broccoli', 'Kiwi'],
      unit: 'mg',
      dailyValue: 90,
      deficiencySymptoms: ['Scurvy', 'Fatigue', 'Poor wound healing', 'Weakened immunity'],
      functions: ['Collagen production', 'Antioxidant protection', 'Iron absorption', 'Immune support'],
      absorptionTips: ['Take with meals', 'Avoid excessive heat when cooking', 'Combine with bioflavonoids']
    },
    'vitamin_a': {
      name: 'Vitamin A',
      description: 'A fat-soluble vitamin essential for vision, immune function, and cellular communication.',
      benefits: ['Supports vision', 'Maintains healthy skin', 'Boosts immune function', 'Supports reproduction'],
      sources: ['Carrots', 'Sweet potatoes', 'Spinach', 'Liver', 'Eggs'],
      unit: 'mcg RAE',
      dailyValue: 900,
      deficiencySymptoms: ['Night blindness', 'Dry skin', 'Poor immune function', 'Delayed growth'],
      functions: ['Vision maintenance', 'Cell differentiation', 'Immune response', 'Gene regulation'],
      absorptionTips: ['Take with healthy fats', 'Cook vegetables to break down cell walls', 'Avoid excessive alcohol']
    },
    'iron': {
      name: 'Iron',
      description: 'An essential mineral that helps transport oxygen throughout the body via red blood cells.',
      benefits: ['Prevents anemia', 'Supports energy production', 'Maintains cognitive function', 'Supports immune system'],
      sources: ['Red meat', 'Spinach', 'Lentils', 'Fortified cereals', 'Dark chocolate'],
      unit: 'mg',
      dailyValue: 18,
      deficiencySymptoms: ['Fatigue', 'Weakness', 'Pale skin', 'Cold hands and feet', 'Brittle nails'],
      functions: ['Oxygen transport', 'Energy metabolism', 'DNA synthesis', 'Immune function'],
      absorptionTips: ['Take with vitamin C', 'Avoid with calcium or tea', 'Cook in cast iron cookware']
    },
    'calcium': {
      name: 'Calcium',
      description: 'The most abundant mineral in the body, essential for bone health and muscle function.',
      benefits: ['Builds strong bones', 'Supports muscle function', 'Enables nerve transmission', 'Helps blood clotting'],
      sources: ['Dairy products', 'Leafy greens', 'Sardines', 'Almonds', 'Fortified plant milks'],
      unit: 'mg',
      dailyValue: 1000,
      deficiencySymptoms: ['Weak bones', 'Muscle cramps', 'Numbness in fingers', 'Abnormal heart rhythm'],
      functions: ['Bone formation', 'Muscle contraction', 'Nerve signaling', 'Blood clotting'],
      absorptionTips: ['Take with vitamin D', 'Spread intake throughout day', 'Limit caffeine and sodium']
    }
  };

  // Try to match the nutrient name
  const matched = Object.keys(fallbackNutrients).find(key =>
    nutrientLower.includes(key) || key.includes(nutrientLower)
  );

  if (matched) {
    return fallbackNutrients[matched];
  }

  // Generic fallback
  return {
    name: nutrientName.charAt(0).toUpperCase() + nutrientName.slice(1),
    description: `${nutrientName} is an important nutrient that supports various body functions.`,
    benefits: ['Supports overall health', 'Contributes to normal body functions', 'Part of a balanced diet'],
    sources: ['Various foods', 'Balanced diet', 'Nutritional supplements'],
    unit: 'mg',
    dailyValue: 'Varies',
    deficiencySymptoms: ['May vary', 'Consult healthcare provider'],
    functions: ['Various metabolic processes', 'Body maintenance'],
    absorptionTips: ['Take as part of balanced diet', 'Follow recommended dosages']
  };
}