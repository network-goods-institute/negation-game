import resolveConfig from "tailwindcss/resolveConfig";
import partialTailwindConfig from "../../tailwind.config";

export const tailwindConfig = resolveConfig(partialTailwindConfig);
