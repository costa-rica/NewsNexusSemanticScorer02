# NewsNexusSemanticScorer02

## run

```bash
node index.js --runScorer
```

- `--runScorer` is required to run the scorer.

## Description

This is a Node.js script that scores articles based on their semantic similarity to a set of keywords using the Hugging Face Transformers library. It uses keywords from an Excel file. The excel file is stored in the env variable PATH_TO_SEMANTIC_SCORER_KEYWORDS_EXCEL_FILE.

- This project is a follow up to NewsNexusRelevancyScorer01.
- <b>Key Difference:</b> This project only saves the top scored keyword for each article in the database.
- Uses the NewsNexus07 SQLite database.
- stores scores in the NewsNexus07 SQLite database for each keyword (in the spreadsheet) and article in the ArticleEntityWhoCategorizedArticleContract table.
- - this creates a many rows # of keywords x # of articles table.
- Fully offline — no calls to the Hugging Face API.
- Designed to scale to thousands of articles and hundreds of keywords.
- Part of the NewsNexus system of microservices.

## Installation

```bash
npm install
```

## .env

necessary variables:

```bash
NAME_DB=newsnexus07.db
PATH_DATABASE=/Users/nick/Documents/_databases/NewsNexus07/
PATH_TO_SEMANTIC_SCORER_KEYWORDS_EXCEL_FILE=/Users/nick/Documents/_project_resources/NewsNexus07/utilities/relevancy_scorer/NewsNexusRelevancyScorerKeywords.xlsx
```

## model used

```bash
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-MiniLM-L6-v2"
  );
```
