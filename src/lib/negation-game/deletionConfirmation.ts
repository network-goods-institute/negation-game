/**
 * Utilities for generating secure deletion confirmation requirements
 */

export interface ConfirmationRequirement {
  type: "content" | "phrase";
  required: string;
  displayText: string;
  description: string;
}

/**
 * Generate a secure confirmation requirement based on point content and context
 */
export const generateConfirmationRequirement = (
  pointContent: string,
  pointId: number
): ConfirmationRequirement => {
  // Clean the content and get first few words
  const cleanContent = pointContent
    .trim()
    .replace(/[^\w\s]/g, "")
    .toLowerCase();
  const words = cleanContent.split(/\s+/).filter((word) => word.length > 0);

  if (words.length <= 3) {
    const required = words.join(" ");
    return {
      type: "content",
      required,
      displayText: required,
      description: `Type the first ${words.length === 1 ? "word" : "words"} of the point content`,
    };
  }
  // For longer points, use first 3 words
  const required = words.slice(0, 3).join(" ");
  return {
    type: "content",
    required,
    displayText: required,
    description:
      "Type the first 3 words of the point content (without punctuation)",
  };
};

/**
 * Validate if the user input matches the confirmation requirement
 */
export const validateConfirmation = (
  userInput: string,
  requirement: ConfirmationRequirement
): boolean => {
  const cleanInput = userInput
    .trim()
    .replace(/[^\w\s]/g, "")
    .toLowerCase();
  const cleanRequired = requirement.required.toLowerCase();

  return cleanInput === cleanRequired;
};

/**
 * Get a preview of what the user needs to type (with some characters hidden for security)
 */
export const getConfirmationPreview = (
  requirement: ConfirmationRequirement
): string => {
  if (requirement.type === "phrase") {
    return requirement.required;
  }

  // For content-based confirmations, show first letter of each word + dots
  const words = requirement.required.split(" ");
  return words
    .map((word) => {
      if (word.length <= 2) return word;
      return word[0] + "•".repeat(word.length - 1);
    })
    .join(" ");
};
