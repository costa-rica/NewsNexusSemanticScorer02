require("dotenv").config();
const {
  Article,
  EntityWhoCategorizedArticle,
  ArtificialIntelligence,
  ArticleEntityWhoCategorizedArticleContract,
} = require("newsnexus07db");

// const { loadKeywordsFromExcel } = require("./modules/utilitiesKeywords");
const { scoreArticlesWithKeywords } = require("./modules/utilitiesScorer");
const { loadKeywordsFromExcel } = require("./modules/utilitiesExcel");
const { saveScoresToDatabase } = require("./modules/utilitiesSaver");

console.log("--- NewsNexus Relevancy Scorer 01 ---");

async function main() {
  const aiModel = await ArtificialIntelligence.findOne({
    where: {
      name: "NewsNexusRelevancyScorer01",
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

  console.log("EntityWhoCategorizedArticle:", entityWhoCategorizesId);
  // const articles = await Article.findAll();
  const articlesArray = await createFilteredArticlesArray(
    entityWhoCategorizesId
  );
  console.log("Loaded articles:", articlesArray.length);
  const keywords = await loadKeywordsFromExcel(
    process.env.PATH_TO_KEYWORDS_EXCEL_FILE
  );
  console.log("Loaded keywords:", keywords.length);

  // const scoredArticles = await scoreArticlesWithKeywords(articles, keywords);
  const scoredArticles = await scoreArticlesWithKeywords(
    articlesArray,
    keywords
  );
  console.log("Scoring complete");

  await saveScoresToDatabase(scoredArticles, keywords, entityWhoCategorizesId);
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
  const allArticles = await Article.findAll();

  // Step 3: Filter out articles already processed
  const filteredArticles = allArticles.filter(
    (article) => !alreadyProcessedIds.has(article.id)
  );

  return filteredArticles;
}

main();
