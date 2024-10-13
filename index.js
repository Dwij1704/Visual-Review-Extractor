const express = require('express');
const { chromium } = require('playwright');
const OpenAI = require('openai');
const fs = require('fs').promises;
const path = require('path');
const winston = require('winston');

const app = express();
const port = process.env.PORT;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'server.log' })
  ]
});

app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
  next();
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const screenshotsDir = path.join(__dirname, 'screenshots');

// Utility to clear the screenshots directory
async function clearScreenshotsFolder() {
  try {
    const files = await fs.readdir(screenshotsDir);
    await Promise.all(files.map(file => fs.unlink(path.join(screenshotsDir, file))));
    logger.info('Screenshots folder emptied');
  } catch (err) {
    logger.error('Error clearing screenshots folder', { message: err.message, stack: err.stack });
  }
}

/**
 * Analyzes multiple base64-encoded screenshots to extract reviews using OpenAI.
 * @param {Array<string>} base64Images - An array of base64-encoded image strings.
 * @returns {Object} - An object containing the extracted reviews.
 */
async function analyzeScreenshots(base64Images) {
  logger.info('Starting multiple screenshot analysis');

  const prompt = `
  Analyze the following screenshots of a product review page. Extract the reviews you can see. For each review, provide:
  1. Review title (exactly as shown, if available)
  2. Review body (full text, do not summarize)
  3. Rating (as a number out of 5)
  4. Reviewer name (exactly as shown)

  Present the information in a JSON format like this:
  {
    "reviews": [
      {
        "title": "Great product!",
        "body": "This item exceeded my expectations. I've been using it for a month now and I can already see significant improvements...",
        "rating": 5,
        "reviewer": "John Doe"
      },
      ...
    ]
  }

  If you can't see the full content of a review, include as much as you can see and add "[truncated]" at the end of the body.
  If you can't extract any reviews or there's an issue, return an empty array for "reviews".
  Do not include any explanations or additional text outside of the JSON structure.
  `;

  const imageContent = base64Images.map((imageBase64) => ({
    type: "image_url",
    image_url: {
      url: `data:image/png;base64,${imageBase64}`,
    },
  }));

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...imageContent,
          ],
        },
      ],
    });

    logger.info('OpenAI API response received');
    const content = response.choices[0].message.content;
    logger.debug('Raw OpenAI API response content:', content);

    // Remove any potential markdown formatting
    const cleanedContent = content.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const parsedContent = JSON.parse(cleanedContent);
      logger.info('OpenAI API response parsed successfully');
      return parsedContent;
    } catch (parseError) {
      logger.error('Error parsing OpenAI response', { message: parseError.message, stack: parseError.stack });

      // If parsing fails, attempt to extract JSON from the response
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          logger.info('Extracted JSON from OpenAI response');
          return extractedJson;
        } catch (extractError) {
          logger.error('Error extracting JSON from OpenAI response', { message: extractError.message, stack: extractError.stack });
        }
      }
      return { reviews: [] };
    }
  } catch (error) {
    logger.error('Error in analyzeScreenshots', { message: error.message, stack: error.stack, error });
    return { reviews: [] };
  }
}

async function extractReviews(url) {
  logger.info('Starting review extraction', { url });
  const browser = await chromium.launch();
  const page = await browser.newPage();

  let allReviews = [];
  let errorDetails = null;

  try {
    await page.goto(url, { timeout: 60000, waitUntil: 'domcontentloaded' });
    logger.info('Page loaded successfully', { url });

    await page.waitForSelector('body', { state: 'attached', timeout: 10000 });

    // Attempt to bypass potential anti-bot measures
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    const viewportHeight = 1000;
    const viewportWidth = 1920;
    await page.setViewportSize({ width: viewportWidth, height: viewportHeight });

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(5000); // Wait for 5 seconds after scrolling

    const bodyHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      );
    });

    const numScreenshots = Math.ceil(bodyHeight / viewportHeight);
    logger.info('Number of screenshots to capture', { numScreenshots });

    const screenshotsBase64 = [];

    const screenshotsDirPath = path.join(__dirname, 'screenshots');
    await clearScreenshotsFolder();
    await fs.mkdir(screenshotsDirPath, { recursive: true });

    for (let i = 0; i < numScreenshots; i++) {
      const yOffset = i * viewportHeight;

      await page.evaluate((y) => window.scrollTo(0, y), yOffset);
      await page.waitForTimeout(2000); // Increased wait time

      const screenshotBuffer = await page.screenshot({ fullPage: false });
      const base64Image = screenshotBuffer.toString('base64');
      screenshotsBase64.push(base64Image);

      const screenshotPath = path.join(screenshotsDirPath, `screenshot_${i}.png`);
      await fs.writeFile(screenshotPath, screenshotBuffer);
      logger.info('Screenshot saved', { path: screenshotPath });
    }

    try {
      const reviews = await analyzeScreenshots(screenshotsBase64);
      allReviews = allReviews.concat(reviews.reviews);
    } catch (analysisError) {
      logger.error('Error analyzing screenshots', { message: analysisError.message, stack: analysisError.stack });
      errorDetails = analysisError; // Capture error details to return later
      const errorLogPath = path.join(screenshotsDirPath, 'openai_error_response.txt');
      await fs.writeFile(errorLogPath, JSON.stringify(analysisError, null, 2));
      logger.info('Error details saved', { path: errorLogPath });
    }

    return { reviews: allReviews, errorDetails };
  } catch (error) {
    logger.error('Error in extractReviews', { message: error.message, stack: error.stack, error });
    throw error;
  } finally {
    await browser.close();
    logger.info('Browser closed');
  }
}

app.get('/api/reviews', async (req, res) => {
  const { page } = req.query;
  if (!page) {
    logger.warn('Request received without page URL parameter');
    return res.status(400).json({ error: 'Missing page URL parameter' });
  }

  logger.info('Review extraction requested', { url: page });

  try {
    const result = await extractReviews(page);
    logger.info('Reviews extracted successfully', { url: page, count: result.reviews.length });

    // Send response with reviews and any error details
    res.json({
      reviews_count: result.reviews.length,
      reviews: result.reviews,
      errorDetails: result.errorDetails || null, // Include error details if any
    });
  } catch (error) {
    logger.error('Error processing request', { url: page, message: error.message, stack: error.stack, error });
    if (error.name === 'TimeoutError') {
      res.status(504).json({ error: 'Request timed out. The page may be slow to load or blocking automated access.' });
    } else {
      res.status(500).json({ error: 'Failed to extract reviews', details: error.message });
    }
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, 'server.log');
    const logContent = await fs.readFile(logFilePath, 'utf-8');
    res.type('text/plain').send(logContent);
  } catch (error) {
    logger.error('Error reading log file', { message: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to read log file' });
  }
});

app.get('/', async (req, res) => {
  try {
    const htmlPath = path.join(__dirname, 'index.html');
    const htmlContent = await fs.readFile(htmlPath, 'utf-8');
    res.send(htmlContent);
  } catch (error) {
    logger.error('Error serving HTML file', { message: error.message, stack: error.stack });
    res.status(500).send('Error loading the page');
  }
});
app.listen(port, () => {
  logger.info(`Server running at http://localhost:${port}`);
});
