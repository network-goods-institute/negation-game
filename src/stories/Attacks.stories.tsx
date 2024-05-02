import { PointCard } from "@/components/PointCard";
import { PointMiniCard } from "@/components/PointMiniCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Meta, StoryObj } from "@storybook/react";
import { Ellipsis, Sword } from "lucide-react";

const meta: Meta = {};

export default meta;

type Story = StoryObj<typeof PointCard>;

/*
 *👇 Render functions are a framework specific feature to allow you control on how the component renders.
 * See https://storybook.js.org/docs/api/csf
 * to learn how to use render functions.
 */
export const Default: Story = {
  render: () => (
    <div className="flex flex-col  ">
      <PointMiniCard
        pointId="1"
        title="The Earth is an oblate spheroid"
        body="There's overwhelming evidence to back this up."
        createdAt={Date.now()}
        counterpointIds={["2", "3"]}
        amountSupporters={12}
        pledged={1500}
        favor={2800}
        viewerContext={{ pledged: 250, ally: true }}
        initiallyExpanded={false}
        className="sticky top-md z-10"
      />
      <div className="relative flex gap-sm w-full">
        <div className="absolute h-full left-sm -z-10 flex flex-col items-center justify-center w-fit">
          <Separator orientation="vertical" className="flex-grow mb-xl" />
        </div>

        <div className="flex flex-col gap-md flex-grow pt-sm">
          <div className="flex gap-sm">
            <Sword
              size={16}
              className="sticky top-[80px] bg-background my-sm"
            />
            <PointCard
              className="flex-grow"
              pointId="1"
              title="There is overwhelming evidence that it is flat"
              body="There's overwhelming evidence to back this up."
              createdAt={Date.now()}
              counterpointIds={["2", "3"]}
              amountSupporters={12}
              pledged={1500}
              favor={230}
              viewerContext={{ pledged: 250, ally: true }}
              initiallyExpanded={false}
            />
          </div>
          <div className="flex  gap-sm">
            <Sword
              size={16}
              className="sticky top-[100px] bg-background my-sm"
            />
            <PointCard
              className="flex-grow"
              pointId="1"
              title="The Earth is an oblate spheroid"
              body="There's overwhelming evidence to back this up."
              createdAt={Date.now()}
              counterpointIds={["2", "3"]}
              amountSupporters={12}
              pledged={1500}
              favor={2000}
              viewerContext={{}}
              initiallyExpanded={false}
            />
          </div>
          <div className="flex gap-sm">
            <Sword
              size={16}
              className="sticky top-[100px] bg-background my-sm"
            />
            <PointCard
              className="flex-grow"
              pointId="1"
              title="The Earth is an oblate spheroid"
              body="There's overwhelming evidence to back this up."
              createdAt={Date.now()}
              counterpointIds={["2", "3"]}
              amountSupporters={12}
              pledged={1500}
              favor={545}
              viewerContext={{ enemy: true }}
              initiallyExpanded={false}
            />
          </div>
          <div className="flex gap-sm">
            <Sword
              size={16}
              className="sticky top-[100px] bg-background my-sm"
            />
            <PointCard
              className="flex-grow"
              pointId="1"
              title="The Earth is an oblate spheroid"
              body="There's overwhelming evidence to back this up."
              createdAt={Date.now()}
              counterpointIds={["2", "3"]}
              amountSupporters={12}
              pledged={1500}
              favor={545}
              viewerContext={{ enemy: true }}
              initiallyExpanded={false}
            />
          </div>
          <div className="flex gap-sm">
            <Sword
              size={16}
              className="sticky top-[100px] bg-background my-md"
            />
            <PointCard
              className="flex-grow"
              pointId="1"
              title="The Earth is an oblate spheroid"
              body="There's overwhelming evidence to back this up."
              createdAt={Date.now()}
              counterpointIds={["2", "3"]}
              amountSupporters={12}
              pledged={1500}
              favor={545}
              viewerContext={{ enemy: true }}
              initiallyExpanded={false}
            />
          </div>
          <div className="flex gap-sm">
            <Ellipsis
              size={16}
              className="sticky top-[100px] bg-background my-sm "
            />
            <Button variant="outline" className="flex-grow">
              Load more
            </Button>
          </div>
        </div>
      </div>
    </div>
  ),
};
