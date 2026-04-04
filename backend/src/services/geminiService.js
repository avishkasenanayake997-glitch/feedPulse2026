export const analyzeFeedback = async (title, description) => {
  try {
    // 🔥 MOCK AI RESPONSE

    return {
      category: "Bug",
      sentiment: "Negative",
      priority_score: 8,
      summary: "The application crashes when uploading images.",
      tags: ["crash", "upload", "bug"]
    };

  } catch (error) {
    console.log("AI Error:", error.message);
    return null;
  }
};