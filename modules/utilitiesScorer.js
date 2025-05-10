// modules/utilitiesScorer.js
const { pipeline } = require("@xenova/transformers");

// cosine similarity helper
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

async function scoreArticlesWithKeywords(articles, keywords) {
  console.log("Scoring articles with keywords...");
  const embedder = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-MiniLM-L6-v2"
  );

  // Encode all keywords
  const keywordEmbeddings = {};
  for (let keyword of keywords) {
    // console.log(`Processing keyword: ${keyword}`);
    const output = await embedder(keyword, {
      pooling: "mean",
      normalize: true,
    });
    keywordEmbeddings[keyword] = output.data;
  }

  console.log("Keywords encoded");
  // Score each article
  const scoredArticles = [];
  for (let article of articles) {
    const articleVec = await embedder(article.description, {
      pooling: "mean",
      normalize: true,
    });

    let topKeyword = null;
    let topScore = -Infinity;

    for (let keyword of keywords) {
      const keywordVec = keywordEmbeddings[keyword];
      const score = cosineSimilarity(articleVec.data, keywordVec);

      if (score > topScore) {
        topScore = score;
        topKeyword = keyword;
      }
    }

    scoredArticles.push({
      id: article.id,
      description: article.description,
      keyword: topKeyword,
      keywordRating: topScore,
    });

    if (article.id % 1000 === 0) {
      console.log(`Processed article: ${article.id}`);
    }
  }
  // for (let article of articles) {
  //   const articleVec = await embedder(article.description, {
  //     pooling: "mean",
  //     normalize: true,
  //   });

  //   const keywordScores = {};
  //   for (let keyword of keywords) {
  //     const keywordVec = keywordEmbeddings[keyword];
  //     const score = cosineSimilarity(articleVec.data, keywordVec);
  //     keywordScores[keyword] = score;
  //   }

  //   scoredArticles.push({
  //     id: article.id,
  //     description: article.description,
  //     scores: keywordScores,
  //   });
  //   if (article.id % 1000 === 0) {
  //     console.log(`Processed article: ${article.id}`);
  //   }
  // }

  console.log("Articles scored");

  return scoredArticles;
}

module.exports = {
  scoreArticlesWithKeywords,
};
