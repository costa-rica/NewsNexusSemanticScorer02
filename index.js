require("dotenv").config();
const {
  EntityWhoCategorizedArticle,
  ArtificialIntelligence,
  ArticleEntityWhoCategorizedArticleContract,
} = require("newsnexus07db");

const { scoreArticleWithKeywords } = require("./modules/utilitiesScorer");
const {
  loadKeywordsFromExcel,
  createFilteredArticlesArray,
  createLogTextFileCompletedStatus,
  createLogTextFileIsRunningStatus,
} = require("./modules/utilitiesMisc");

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
  let articlesArray = await createFilteredArticlesArray(entityWhoCategorizesId);
  console.log("Loaded articles:", articlesArray.length);
  const keywords = await loadKeywordsFromExcel(
    process.env.PATH_TO_SEMANTIC_SCORER_KEYWORDS_EXCEL_FILE
  );
  console.log("Loaded keywords:", keywords.length);

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

    // console.log(`article id: ${article.id}`);
    // console.log(`article description: ${article.description}`);
    // console.log(`keyword: ${keyword}`);
    // console.log(`keyword rating: ${keywordRating}`);
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
      // console.log(`Scored and saved article ${i}`);
      console.log(`Processed ${i + 1} articles...`);
      createLogTextFileIsRunningStatus(i + 1);
    }
  }
  createLogTextFileCompletedStatus(articlesArray.length);
  console.log("✅ All articles processed and saved.");
}

main();
