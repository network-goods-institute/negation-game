import { PointCard } from "@/components/PointCard";
import { PointMiniCard } from "@/components/PointMiniCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Meta, StoryObj } from "@storybook/react";
import { Ellipsis, ShieldBan, Sword } from "lucide-react";

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
      <div className="flex flex-col sticky top-md z-10 gap-xs">
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
        />
        <Sword size={16} className="fill-background drop-shadow-bg-border" />
      </div>
      <div className="relative flex gap-sm w-full">
        <div className="absolute h-full left-sm -z-10 flex flex-col items-center justify-center w-fit">
          <Separator orientation="vertical" className="flex-grow " />
        </div>

        <div className="flex flex-col gap-md flex-grow py-sm">
          <div className="flex gap-sm">
            <ShieldBan
              size={16}
              className="sticky top-[100px] bg-background my-sm"
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
            <ShieldBan
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
            <ShieldBan
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
            <Ellipsis
              size={16}
              className="sticky top-[100px] bg-background my-sm"
            />
            <Button variant="outline" className="flex-grow">
              Load more
            </Button>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-xs sticky bottom-md z-10">
        <Sword size={16} className="fill-background drop-shadow-bg-border" />
        <PointMiniCard
          className="sticky bottom-md"
          pointId="1"
          title="The Earth is a disc"
          body="Nobody can prove otherwise."
          createdAt={Date.now()}
          counterpointIds={["2", "3"]}
          amountSupporters={12}
          pledged={1500}
          favor={80}
          viewerContext={{ enemy: true }}
          initiallyExpanded={false}
        />
      </div>
    </div>
  ),
};
