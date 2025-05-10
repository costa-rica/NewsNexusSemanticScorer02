require("dotenv").config();
const {
  Article,
  EntityWhoCategorizedArticle,
  ArtificialIntelligence,
  ArticleEntityWhoCategorizedArticleContract,
} = require("newsnexus07db");

const { scoreArticleWithKeywords } = require("./modules/utilitiesScorer");
const { loadKeywordsFromExcel } = require("./modules/utilitiesExcel");

console.log("--- NewsNexus Semantic Scorer 02 ---");

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

  const embedder = await require("@xenova/transformers").pipeline(
    "feature-extraction",
    "Xenova/paraphrase-MiniLM-L6-v2"
  );

  // for (let article of articlesArray) {
  for (let i = 0; i < articlesArray.length; i++) {
    const article = articlesArray[i];
    const { keyword, keywordRating } = await scoreArticleWithKeywords(
      article,
      keywords,
      embedder
    );

    await ArticleEntityWhoCategorizedArticleContract.upsert({
      articleId: article.id,
      entityWhoCategorizesId,
      keyword,
      keywordRating,
    });

    if ((i + 1) % 100 === 0) {
      // console.log(`Scored and saved article ${i}`);
      console.log(`Processed ${i + 1} articles...`);
    }
  }

  console.log("✅ All articles processed and saved.");
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
