import type { Preview } from "@storybook/react";
import "../src/app/globals.css";

import { withThemeByClassName } from "@storybook/addon-themes";
import React from "react";
import { ThemeProvider } from "../src/components/ui/ThemeProvider";

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },

  decorators: [
    withThemeByClassName({
      themes: {
        light: "light",
        dark: "dark",
      },
      defaultTheme: "light",
    }),
    (Story) => (
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
      >
        <Story />
      </ThemeProvider>
    ),
  ],
};

export default preview;
