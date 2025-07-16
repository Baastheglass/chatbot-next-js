// Utility functions for enhancing markdown formatting in AI responses

/**
 * Post-processes AI response text to ensure proper markdown formatting
 * @param {string} text - The raw AI response text
 * @returns {string} - Enhanced markdown text
 */
export function enhanceMarkdownFormatting(text) {
  if (!text || typeof text !== 'string') return text;

  let enhanced = text;

  // Ensure proper heading formatting
  enhanced = enhanced.replace(/^([^#\n]*)(Here's your AI.*Action Plan)([^#\n]*)/im, '# $2');
  enhanced = enhanced.replace(/^([^#\n]*)(Executive Summary)([^#\n]*)/im, '## $2');
  enhanced = enhanced.replace(/^([^#\n]*)(Detailed Solution Components?)([^#\n]*)/im, '## $2');
  enhanced = enhanced.replace(/^([^#\n]*)(Estimated Benefits?)([^#\n]*)/im, '## $2');
  enhanced = enhanced.replace(/^([^#\n]*)(Next Steps?)([^#\n]*)/im, '## $2');

  // Convert solution component headers to h3
  enhanced = enhanced.replace(/^([A-Z]\.\s*)([^#\n]+)$/gm, '### $1$2');

  // Ensure bold formatting for key terms
  enhanced = enhanced.replace(/\b(Goal|Key Challenges?|AI Solution|Trigger|Workflow|Outcome|Integration|Features?|Benefits?)\s*[:]\s*/g, '**$1:** ');

  // Ensure proper list formatting
  enhanced = enhanced.replace(/^[\s]*[-–—]\s*/gm, '* ');
  enhanced = enhanced.replace(/^[\s]*•\s*/gm, '* ');

  // Add emphasis to important outcomes and benefits
  enhanced = enhanced.replace(/(\d+%|\d+\s*hours?|\d+\s*minutes?|\d+x|\+\d+%)/g, '**$1**');

  // Ensure proper section dividers
  enhanced = enhanced.replace(/^[-=]{3,}$/gm, '---');

  // Add blockquote formatting for outcome statements
  enhanced = enhanced.replace(/^(Outcome[:\s]*)(.*)/gm, '> **Outcome:** $2');

  // Ensure proper spacing around sections
  enhanced = enhanced.replace(/(\n#{1,6}\s[^\n]+)/g, '\n$1');
  enhanced = enhanced.replace(/(#{1,6}\s[^\n]+\n)([^#\n\s>*])/g, '$1\n$2');

  // Clean up excessive newlines
  enhanced = enhanced.replace(/\n{3,}/g, '\n\n');

  return enhanced.trim();
}

/**
 * Validates if text contains proper markdown formatting
 * @param {string} text - Text to validate
 * @returns {boolean} - True if text has good markdown formatting
 */
export function hasGoodMarkdownFormatting(text) {
  if (!text) return false;

  const hasHeadings = /^#{1,6}\s/m.test(text);
  const hasBoldText = /\*\*[^*]+\*\*/.test(text);
  const hasLists = /^\s*[\*\-\+]\s/m.test(text);
  const hasProperSpacing = !/\n{4,}/.test(text);

  return hasHeadings && hasBoldText && hasLists && hasProperSpacing;
}

/**
 * Adds visual enhancements to markdown for business responses
 * @param {string} text - Markdown text
 * @returns {string} - Enhanced markdown with visual improvements
 */
export function addBusinessResponseEnhancements(text) {
  if (!text) return text;

  let enhanced = text;

  // Add callout boxes for important information
  enhanced = enhanced.replace(/^\*\*(?:Important|Note|Key Point|Remember):\*\*\s*(.*)/gm, '> 🔔 **Important:** $1');
  enhanced = enhanced.replace(/^\*\*(?:Tip|Pro Tip):\*\*\s*(.*)/gm, '> 💡 **Tip:** $1');
  enhanced = enhanced.replace(/^\*\*(?:Warning|Caution):\*\*\s*(.*)/gm, '> ⚠️ **Warning:** $1');

  // Add icons to common business terms
  enhanced = enhanced.replace(/\b(ROI|Revenue|Profit)\b/g, '💰 $1');
  enhanced = enhanced.replace(/\b(Efficiency|Productivity)\b/g, '⚡ $1');
  enhanced = enhanced.replace(/\b(Growth|Scale|Scaling)\b/g, '📈 $1');
  enhanced = enhanced.replace(/\b(Time[- ]saving|Time saved)\b/gi, '⏰ $1');
  enhanced = enhanced.replace(/\b(Automation|Automated)\b/g, '🤖 $1');

  // Enhance percentage and number formatting
  enhanced = enhanced.replace(/(\+?\d+%)/g, '**$1**');
  enhanced = enhanced.replace(/(\$\d+[\d,]*(?:\.\d+)?[KMB]?)/g, '**$1**');
  enhanced = enhanced.replace(/(\d+\s*hours?\/week)/gi, '**$1**');

  return enhanced;
}

export default {
  enhanceMarkdownFormatting,
  hasGoodMarkdownFormatting,
  addBusinessResponseEnhancements
};
