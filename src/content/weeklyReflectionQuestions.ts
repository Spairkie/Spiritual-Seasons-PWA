/** Ported verbatim from legacy/js/modules/weekly-reflection.js — 17 weeks
 * of distinct prompts (120 days / 7 ≈ 17.1 weeks), with a rotating
 * fallback for any week number outside that range. */

export const REFLECTION_FREQUENCY = 7;
export const MAX_REFLECTION_WEEK = 17;

interface WeekQuestions {
  week: number;
  questions: string[];
}

const REFLECTION_QUESTIONS: WeekQuestions[] = [
  { week: 1, questions: ["What has God been teaching you this week?", "How have you experienced His presence?", "What scripture has spoken most deeply to you?"] },
  { week: 2, questions: ["What spiritual growth have you noticed in yourself?", "Where have you struggled, and what did you learn?", "How has journaling helped your faith journey?"] },
  { week: 3, questions: ["What patterns do you notice in your spiritual life?", "How has your prayer life deepened?", "What are you most grateful for this week?"] },
  { week: 4, questions: ["How has God answered prayer in your life?", "What area of growth is God highlighting?", "How can you apply what you've learned?"] },
  { week: 5, questions: ["What has been the biggest challenge this week?", "How have you seen God's faithfulness?", "What truth do you need to hold onto?"] },
  { week: 6, questions: ["In what ways have you grown spiritually?", "What has brought you the most joy?", "How are you trusting God more deeply?"] },
  { week: 7, questions: ["What scriptures have encouraged you most?", "How has God's love become more real to you?", "What do you want to focus on moving forward?"] },
  { week: 8, questions: ["Where have you experienced breakthrough?", "What old patterns are you leaving behind?", "How is God renewing your mind and heart?"] },
  { week: 9, questions: ["What spiritual practices have been most meaningful?", "How has worship deepened your relationship with God?", "What are you learning about God's character?"] },
  { week: 10, questions: ["How has God been speaking to you?", "What areas need more surrender?", "What promises are you claiming?"] },
  { week: 11, questions: ["What transformation have you witnessed?", "How has hope grown in your heart?", "What legacy of faith are you building?"] },
  { week: 12, questions: ["What has been the greatest blessing this week?", "How have you shared your faith with others?", "What are you carrying into the next season?"] },
  { week: 13, questions: ["How has your understanding of God's grace deepened?", "What relationships has God been healing?", "Where do you see His hand at work?"] },
  { week: 14, questions: ["What fears has God been addressing?", "How has faith replaced worry?", "What miracles have you witnessed?"] },
  { week: 15, questions: ["How has this devotional journey changed you?", "What will you continue practicing?", "How will you keep growing spiritually?"] },
  { week: 16, questions: ["What has God revealed about His plans for you?", "How has obedience led to blessing?", "What legacy are you leaving?"] },
  { week: 17, questions: ["Looking back, how have you grown?", "What do you want to remember from this journey?", "How will you continue walking with God?"] },
];

export function getReflectionQuestions(week: number): string[] {
  const exact = REFLECTION_QUESTIONS.find((r) => r.week === week);
  if (exact) return exact.questions;
  const index = (week - 1) % REFLECTION_QUESTIONS.length;
  return REFLECTION_QUESTIONS[index]?.questions ?? REFLECTION_QUESTIONS[0]!.questions;
}
