# Node.js Application for Visual Scraping

This Node.js application features a simple visual scraper that extracts reviews from product pages using Playwright. It has two APIs and a frontend built with HTML, CSS, JavaScript, and Bootstrap. The application is containerized using Docker and deployed on AWS EC2.

## Application Flow

1. **Frontend**: The frontend allows users to enter a product URL and initiate the review extraction process.
2. **API Endpoints**:
   - **Extract Reviews API**: 
     - **Endpoint**: `POST /api/reviews`
     - **Description**: Accepts a product URL and extracts reviews using Playwright.
     - **Usage**: 
       - Send a POST request to `/api/reviews` with the product URL in the body.
   - **Logs API**:
     - **Endpoint**: `GET /api/logs`
     - **Description**: Fetches the logs of review extraction attempts.

## cURL Commands

To interact with the APIs, you can use the following cURL commands:

1. **Extract Reviews**:
   ```bash
   curl --location 'http://localhost:5000/api/reviews?page=https%3A%2F%2Fsokoglam.com%2Fproducts%2Fim-from-rice-toner-150ml'
   ```

2. **Fetch Logs**:
   ```bash
   curl --location 'http://localhost:5000/api/logs'
   ```

## Setup and Run

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Dwij1704/Visual-Review-Extractor
   cd Visual-Review-Extractor
   ```

2. **Replace the OpenAI API key**:
   Make sure to replace the `OPENAI_API_KEY` in your `.env` file with your actual key.

3. **Build the Docker image**:
   ```bash
   docker build -t Visual-Review-Extractor .
   ```

4. **Run the Docker container**:
   ```bash
   docker run -p 5000:5000 Visual-Review-Extractor
   ```

The application will be accessible at `http://localhost:5000`.


## Limitations

- **Pagination Handling**: The application does not currently support pagination for scraping multiple pages of reviews, which may limit the amount of data extracted from product listings.
- **CSS Selector Identification**: There is no mechanism for dynamic CSS selector identification, meaning the scraper may fail to locate reviews on pages where the structure changes frequently.
- **Modal Rendering Compatibility**: The application is incompatible with certain sites that use modal rendering for displaying product details and reviews. This may result in incomplete data extraction or errors during the scraping process.
- **Error Handling**: While basic error handling is implemented, more robust handling could improve the user experience and provide clearer feedback on issues encountered during scraping.

## Conclusion

This project demonstrates a simple yet effective approach to web scraping using visual techniques. Your feedback is highly appreciated!
