// modules/utilitiesExcel.js
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

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

async function createOutputExcel(scoredArticles, keywords, outputDirPath) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Relevance Scores");

  // Setup headers
  const columns = [
    { header: "Article ID", key: "id", width: 15 },
    { header: "Description", key: "description", width: 60 },
    ...keywords.map((keyword) => ({
      header: keyword,
      key: keyword,
      width: 15,
    })),
  ];
  worksheet.columns = columns;

  // Add rows
  for (let article of scoredArticles) {
    const row = {
      id: article.id,
      description: article.description,
      ...article.scores,
    };
    worksheet.addRow(row);
  }

  // Ensure directory
  fs.mkdirSync(outputDirPath, { recursive: true });

  const outputPath = path.join(outputDirPath, "output.xlsx");
  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Excel file saved to: ${outputPath}`);
}

module.exports = {
  createOutputExcel,
  loadKeywordsFromExcel,
};
