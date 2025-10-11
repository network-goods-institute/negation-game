import { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const title = `Board | ${id}`;

    return {
        title: `${title} | Negation Game`,
    };
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
