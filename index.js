require("dotenv").config();
// Initialize logger FIRST
const logger = require("./modules/logger");
// Initialize database models BEFORE importing other modules
const { initModels, sequelize } = require("newsnexus10db");
initModels();
logger.info(
  `database location: ${process.env.PATH_DATABASE}${process.env.NAME_DB}`
);

const {
  EntityWhoCategorizedArticle,
  ArtificialIntelligence,
  ArticleEntityWhoCategorizedArticleContract,
} = require("newsnexus10db");

const { scoreArticleWithKeywords } = require("./modules/utilitiesScorer");
const {
  loadKeywordsFromExcel,
  createFilteredArticlesArray,
  createLogTextFileCompletedStatus,
  createLogTextFileIsRunningStatus,
} = require("./modules/utilitiesMisc");

logger.info("--- NewsNexus Semantic Scorer 02 ---");

async function main() {
  const aiModel = await ArtificialIntelligence.findOne({
    where: {
      name: "NewsNexusSemanticScorer02",
      huggingFaceModelName: "Xenova/paraphrase-MiniLM-L6-v2",
      huggingFaceModelType: "feature-extraction",
    },
    include: [
      {
        model: EntityWhoCategorizedArticle,
        as: "EntityWhoCategorizedArticles",
      },
    ],
  });

  const entity = aiModel?.EntityWhoCategorizedArticles?.[0];
  const entityWhoCategorizesId = entity?.id;

  logger.info("EntityWhoCategorizedArticle:", entityWhoCategorizesId);
  // const articles = await Article.findAll();
  let articlesArray = await createFilteredArticlesArray(entityWhoCategorizesId);
  logger.info("Loaded articles:", articlesArray.length);
  const keywords = await loadKeywordsFromExcel(
    process.env.PATH_TO_SEMANTIC_SCORER_KEYWORDS_EXCEL_FILE
  );
  logger.info("Loaded keywords:", keywords.length);

  const embedder = await require("@xenova/transformers").pipeline(
    "feature-extraction",
    "Xenova/paraphrase-MiniLM-L6-v2"
  );

  // // For Testing
  // articlesArray = articlesArray.slice(0, 10);

  // for (let article of articlesArray) {
  for (let i = 0; i < articlesArray.length; i++) {
    const article = articlesArray[i];
    const { keyword, keywordRating } = await scoreArticleWithKeywords(
      article,
      keywords,
      embedder
    );

    // logger.info(`article id: ${article.id}`);
    // logger.info(`article description: ${article.description}`);
    // logger.info(`keyword: ${keyword}`);
    // logger.info(`keyword rating: ${keywordRating}`);
    if (keyword && keywordRating) {
      await ArticleEntityWhoCategorizedArticleContract.upsert({
        articleId: article.id,
        entityWhoCategorizesId,
        keyword,
        keywordRating,
      });
    }

    // if ((i + 1) % 100 === 0) {
    if ((i + 1) % 100 === 0) {
      // logger.info(`Scored and saved article ${i}`);
      logger.info(`Processed ${i + 1} articles...`);
      createLogTextFileIsRunningStatus(i + 1);
    }
  }
  createLogTextFileCompletedStatus(articlesArray.length);
  logger.info("✅ All articles processed and saved.");
}

main();
