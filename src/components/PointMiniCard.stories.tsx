import { PointMiniCard } from "@/components/PointMiniCard";
import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta<typeof PointMiniCard> = {
  component: PointMiniCard,
};

export default meta;

type Story = StoryObj<typeof PointMiniCard>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Default: Story = {
  render: () => (
    <PointMiniCard
      pointId="1"
      title="I neither agree nor disagree"
      body="Much to the contrary"
      createdAt={Date.now()}
      amountSupporters={4}
      pledged={360}
      favor={2800}
      counterpointIds={["2", "3"]}
    />
  ),
};

export const Ally: Story = {
  render: () => (
    <PointMiniCard
      pointId="1"
      title="The Earth is an oblate spheroid"
      body="There's overwhelming evidence to back this up."
      createdAt={Date.now()}
      counterpointIds={["2", "3"]}
      amountSupporters={12}
      pledged={1500}
      favor={280}
      viewerContext={{ pledged: 250, ally: true }}
    />
  ),
};

export const Enemy: Story = {
  render: () => (
    <PointMiniCard
      pointId="1"
      title="The Earth is a disc"
      body="Nobody can prove otherwise."
      createdAt={Date.now()}
      counterpointIds={["2", "3"]}
      amountSupporters={12}
      pledged={1500}
      favor={80}
      viewerContext={{ enemy: true }}
    />
  ),
};

export const Contradicting: Story = {
  render: () => (
    <PointMiniCard
      pointId="1"
      title="The Government should control food prices"
      body="That way food will be accessible to everyone"
      createdAt={Date.now()}
      counterpointIds={["2", "3"]}
      amountSupporters={12}
      pledged={1500}
      favor={10}
      viewerContext={{ pledged: 250, ally: true, enemy: true }}
    />
  ),
};
