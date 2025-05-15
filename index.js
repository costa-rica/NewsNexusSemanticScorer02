require("dotenv").config();
const {
  Article,
  EntityWhoCategorizedArticle,
  ArtificialIntelligence,
  ArticleEntityWhoCategorizedArticleContract,
  ArticleApproved,
} = require("newsnexus07db");

const { scoreArticleWithKeywords } = require("./modules/utilitiesScorer");
const { loadKeywordsFromExcel } = require("./modules/utilitiesExcel");
// const runScorerFlag = process.argv.includes("--runScorer");
const runScorerFlag =
  process.env.RUN_SCORER === "true" || process.argv.includes("--runScorer");
console.log("--- NewsNexus Semantic Scorer 02 ---");
console.log("runScorerFlag: ", runScorerFlag);
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

if (runScorerFlag) {
  main();
} else {
  console.log("Run with --runScorer flag to run the scorer.");
}
