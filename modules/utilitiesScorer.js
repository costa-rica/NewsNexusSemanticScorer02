// modules/utilitiesScorer.js

// cosine similarity helper
function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

async function scoreArticleWithKeywords(article, keywords, embedder) {
  let descriptionUsedToScore = article.description;

  if (!descriptionUsedToScore) {
    // console.log(
    //   `article ${article.id} has no description, using title instead`
    // );
    descriptionUsedToScore = article.title;
  }

  if (!descriptionUsedToScore) {
    console.log(`👀 article ${article.id} has no description, no title either`);
    return { keyword: null, keywordRating: null };
  }

  const articleVec = (
    await embedder(descriptionUsedToScore, {
      pooling: "mean",
      normalize: true,
    })
  ).data;

  let topKeyword = null;
  let topScore = -Infinity;

  for (let keyword of keywords) {
    const keywordVec = (
      await embedder(keyword, {
        pooling: "mean",
        normalize: true,
      })
    ).data;

    const score = cosineSimilarity(articleVec, keywordVec);

    if (score > topScore) {
      topScore = score;
      topKeyword = keyword;
    }
  }

  return { keyword: topKeyword, keywordRating: topScore };
}

module.exports = {
  scoreArticleWithKeywords,
};
