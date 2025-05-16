// modules/utilitiesMisc.js
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const {
  Article,
  ArticleEntityWhoCategorizedArticleContract,
  ArticleApproved,
} = require("newsnexus07db");

async function loadKeywordsFromExcel(excelPath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);
  const worksheet = workbook.worksheets[0];

  const keywords = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header
    const keyword = row.getCell(1).value;
    if (keyword) keywords.push(String(keyword));
  });

  return keywords;
}

async function createFilteredArticlesArray(entityWhoCategorizesId) {
  // Step 1: Find all existing articleId values for this entityWhoCategorizesId
  const existingContracts =
    await ArticleEntityWhoCategorizedArticleContract.findAll({
      where: { entityWhoCategorizesId },
      attributes: ["articleId"],
      raw: true,
    });

  const alreadyProcessedIds = new Set(
    existingContracts.map((entry) => entry.articleId)
  );

  // Step 2: Get all articles
  const allArticles = await Article.findAll({
    include: [
      {
        model: ArticleApproved,
      },
    ],
  });

  // Step 3: Filter out articles already processed
  const filteredArticles = allArticles.filter(
    (article) => !alreadyProcessedIds.has(article.id)
  );

  const articlesArrayModified = filteredArticles.map((article) => {
    let description = article.description;
    if (article.description === null || article.description === "") {
      // console.log(
      //   `article ${article.id} has no description replaced with approved text`
      // );
      const articleApproved = article.ArticleApproveds?.[0];
      if (articleApproved) {
        description = articleApproved.textForPdfReport;
      }
    }
    return {
      ...article.dataValues,
      description,
    };
  });

  return articlesArrayModified;
}

function createLogTextFileStatus(scoredArticleCount) {
  // Create timestamp in format YYYYMMDD-HHMMSS
  const now = new Date();
  const timestamp = now.toISOString();

  const fileName = `lastRun.txt`;
  const logDir = process.env.PATH_TO_SEMANTIC_SCORER_DIR;

  if (!logDir) {
    console.error("PATH_TO_SEMANTIC_SCORER_DIR is not defined in .env");
    return;
  }

  const fullPath = path.join(logDir, fileName);
  const content = `Count of Loops: ${scoredArticleCount}, on ${timestamp}`;

  fs.writeFile(fullPath, content, (err) => {
    if (err) {
      console.error("Failed to write log file:", err);
    } else {
      console.log(`Log file created at ${fullPath}`);
    }
  });
}

module.exports = {
  loadKeywordsFromExcel,
  createFilteredArticlesArray,
  createLogTextFileStatus,
};
