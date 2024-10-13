# Node.js Visual Scraper Application

## Overview

This Node.js application implements a visual scraping solution designed to extract reviews from product pages. The application consists of a backend with two APIs and a frontend built using HTML, CSS, JavaScript, and Bootstrap. The backend is containerized and deployed on an AWS EC2 instance, providing a robust environment for executing scraping tasks.

### Key Features
- **Two APIs**:
  1. **Review Extraction API**: Retrieves reviews from specified URLs by capturing screenshots of the web pages and analyzing them using the OpenAI API.
  2. **Logs API**: Provides access to server logs for monitoring and debugging purposes.

- **Frontend**: The user interface is developed using HTML, CSS, JavaScript, and Bootstrap, allowing users to interact with the scraping functionality easily.

## Application Flow

1. **Frontend Interaction**: Users input the URL of the product page they want to scrape on the frontend interface. This is done using a simple HTML form.

2. **Review Extraction API**: Upon form submission, a GET request is made to the Review Extraction API with the specified URL. The server handles this request by:
   - Launching a browser instance using Playwright.
   - Navigating to the specified URL and capturing multiple screenshots of the page content.
   - Converting the screenshots into base64-encoded images.

3. **Image Analysis**: The application sends the captured screenshots to the OpenAI API for analysis. The API extracts reviews based on the provided prompt and returns the results in a structured JSON format.

4. **Response**: The extracted reviews are sent back to the frontend, where they are displayed to the user. Additionally, any errors encountered during the scraping or analysis process are logged and can be accessed through the Logs API.

### Visual Scraping Approach

The application uses a visual scraping approach by capturing screenshots of web pages and analyzing them instead of directly parsing HTML content. This method can handle dynamic content more effectively, although it has limitations:
- **Pagination Handling**: The application currently lacks pagination handling, meaning it may not extract all reviews from pages that require navigation to multiple views.
- **CSS Selector Identification**: The application does not include functionality for dynamically identifying CSS selectors, which can impact its ability to scrape content from various websites effectively.
- **Incompatibility with Modal Rendering**: Some websites that render content in modal windows may not be compatible with this visual scraping approach, limiting the effectiveness of the application in certain scenarios.

## Docker Setup

To run the application, you will need to build and start the Docker container using the following commands:

1. **Build the Docker Image**:
   ```bash
   docker build -t visual-scraper .
   ```

2. **Run the Docker Container**:
   ```bash
   docker run -d -p 5000:5000 --env-file .env visual-scraper
   ```

> **Note**: Ensure to replace `OPENAI_API_KEY` in the `.env` file with your actual OpenAI API key to enable the application to communicate with the OpenAI API.

## Conclusion

This Node.js visual scraper application provides a functional approach to extracting product reviews from various web pages. While it effectively utilizes visual scraping techniques, future improvements could include handling pagination, identifying CSS selectors dynamically, and enhancing compatibility with modal-rendering sites.
