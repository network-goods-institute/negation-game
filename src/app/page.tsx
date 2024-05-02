import { HomeFeed } from "@/app/HomeFeed";
import { NewPositionButton } from "@/components/NewPositionButton";

export default function Home() {
  return (
    <main className="container-margin flex-grow min-h-screen gap-md my-md flex flex-col items-center">
      <HomeFeed />
      <NewPositionButton className="fixed bottom-16 right-sm sm:bottom-md sm:right-md rounded-full " />
    </main>
  );
}
