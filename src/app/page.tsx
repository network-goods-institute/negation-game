import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Shield, Zap } from "lucide-react";
import { fetchSpace } from "@/actions/spaces/fetchSpace";
import { GoToSpaceButton } from "@/components/GoToSpaceButton";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Metadata } from "next";
import { OnboardingProvider } from "@/components/contexts/OnboardingContext";
import { KnowledgeBaseProvider } from "@/components/contexts/KnowledgeBaseContext";
import { WriteupProvider } from "@/components/contexts/WriteupContext";
import { OnboardingSection } from "@/components/OnboardingSection";
import { HomePageDialogs } from "@/components/HomePageDialogs";
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel";
import { RedirectLoggedInUsers } from "@/components/RedirectLoggedInUsers";


export const metadata: Metadata = {
    title: "Make better decisions. Reward quality participation",
    description: "The Negation Game enables DAOs to define which problems to solve, brainstorm options, debate their pros and cons, and decide. Quality participation and intellectual honesty are rewarded, transitioning DAOs from slow and political to fast and effective.",
    keywords: [
        "DAO decision making",
        "quality participation",
        "intellectual honesty",
        "structured debates",
        "effective DAOs",
        "decentralized governance",
        "problem solving",
        "pros and cons analysis",
        "incentivized participation",
        "community decision making"
    ],
    openGraph: {
        title: "Make better decisions. Reward quality participation",
        description: "The Negation Game enables DAOs to define which problems to solve, brainstorm options, debate their pros and cons, and decide. Quality participation and intellectual honesty are rewarded, transitioning DAOs from slow and political to fast and effective.",
        type: "website",
        url: "/",
        images: [
            {
                url: "/img/negation-game.png",
                width: 1200,
                height: 630,
                alt: "Negation Game - Protocol for Reasoned Disagreement",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Make better decisions. Reward quality participation",
        description: "The Negation Game enables DAOs to define which problems to solve, brainstorm options, debate their pros and cons, and decide. Quality participation and intellectual honesty are rewarded, transitioning DAOs from slow and political to fast and effective.",
        images: ["/img/negation-game.png"],
    },
    alternates: {
        canonical: "/",
    },
};

export default async function HomePage() {
    const globalSpace = await fetchSpace("global");
    const scrollSpace = await fetchSpace("scroll");

    // Structured data for the homepage
    const websiteStructuredData = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Negation Game",
        "alternateName": "Make better decisions. Reward quality participation",
        "url": process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`,
        "description": "The Negation Game enables DAOs to define which problems to solve, brainstorm options, debate their pros and cons, and decide. Quality participation and intellectual honesty are rewarded, transitioning DAOs from slow and political to fast and effective.",
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": `${process.env.NODE_ENV === "development"
                    ? "http://localhost:3000"
                    : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`}/s/global?q={search_term_string}`
            },
            "query-input": "required name=search_term_string"
        }
    };

    const applicationStructuredData = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Negation Game",
        "description": "The Negation Game enables DAOs to define which problems to solve, brainstorm options, debate their pros and cons, and decide. Quality participation and intellectual honesty are rewarded, transitioning DAOs from slow and political to fast and effective.",
        "url": process.env.NODE_ENV === "development"
            ? "http://localhost:3000"
            : `https://${process.env.NEXT_PUBLIC_DOMAIN || "negationgame.com"}`,
        "applicationCategory": "CommunicationApplication",
        "operatingSystem": "Web Browser",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
        },
        "featureList": [
            "Structured argument mapping",
            "Economic incentives for honesty",
            "Commitment mechanisms",
            "Epistemic discourse",
            "Collaborative reasoning"
        ]
    };

    return (
        <>
            <RedirectLoggedInUsers />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(websiteStructuredData),
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(applicationStructuredData),
                }}
            />
            <KnowledgeBaseProvider>
                <WriteupProvider>
                    <OnboardingProvider>
                        <HomePageDialogs />
                        <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
                            <header className="sticky top-0 w-full z-50 backdrop-blur-sm bg-white/75 dark:bg-slate-900/75 border-b border-slate-200 dark:border-slate-800">
                                <div className="max-w-7xl mx-auto flex items-center justify-between p-4">
                                    <Link href="/" className="flex items-center space-x-2">
                                        <Zap className="w-6 h-6 text-primary" />
                                        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
                                            Negation Game
                                        </span>
                                    </Link>
                                    <nav className="flex items-center space-x-6">
                                        <Link href="#spaces" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                            Spaces
                                        </Link>
                                        <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                            Features
                                        </Link>
                                        <Link href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                            Testimonials
                                        </Link>
                                        <Link href="#get-started" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                            Get Started
                                        </Link>
                                        <a href="https://t.me/+a0y-MpvjAchkM2Qx" target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                                            Contact
                                        </a>
                                    </nav>
                                </div>
                            </header>

                            <main className="flex-grow">
                                {/* Hero */}
                                <section className="relative py-24 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10" />
                                    <div className="max-w-7xl mx-auto px-4 relative">
                                        <div className="max-w-3xl mx-auto text-center">
                                            <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 mb-8 pb-2">
                                                Make Better Decisions. Reward Quality Participation.
                                            </h1>
                                            <p className="text-xl text-muted-foreground dark:text-slate-400 mb-10 leading-relaxed">
                                                The Negation Game enables DAOs to define which problems to solve, brainstorm options, debate their pros and cons, and decide. Quality participation and intellectual honesty are rewarded, transitioning DAOs from slow and political to fast and effective.
                                            </p>
                                            <div className="flex items-center justify-center gap-4">
                                                <Button size="lg" className="font-medium gap-2 text-base" asChild>
                                                    <Link href="/s/global">
                                                        Get Started
                                                        <ArrowRight className="w-4 h-4" />
                                                    </Link>
                                                </Button>
                                                <Button size="lg" variant="outline" className="font-medium gap-2 text-base" asChild>
                                                    <Link href="#features">Learn More</Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Explore Spaces */}
                                <section id="spaces" className="py-20 bg-slate-100 dark:bg-slate-800">
                                    <div className="max-w-7xl mx-auto px-4 text-center mb-12">
                                        <h2 className="text-3xl font-bold dark:text-white">Explore Spaces</h2>
                                        <p className="mt-2 text-muted-foreground dark:text-slate-400">
                                            Choose a space to dive into tailored discussions.
                                        </p>
                                    </div>
                                    <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition flex flex-col items-center text-center">
                                            <Avatar className="mb-4 h-16 w-16">
                                                {globalSpace?.icon ? (
                                                    <AvatarImage src={globalSpace.icon} alt="s/global icon" />
                                                ) : (
                                                    <AvatarFallback>G</AvatarFallback>
                                                )}
                                            </Avatar>
                                            <h3 className="text-2xl font-semibold dark:text-white">Global</h3>
                                            <p className="mt-2 text-muted-foreground dark:text-slate-400">
                                                Browse community-wide conversations and topics across the platform.
                                            </p>
                                            <GoToSpaceButton href="/s/global" />
                                        </div>
                                        <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition flex flex-col items-center text-center">
                                            <Avatar className="mb-4 h-16 w-16">
                                                {scrollSpace?.icon ? (
                                                    <AvatarImage src={scrollSpace.icon} alt="s/scroll icon" />
                                                ) : (
                                                    <AvatarFallback>S</AvatarFallback>
                                                )}
                                            </Avatar>
                                            <h3 className="text-2xl font-semibold dark:text-white">Scroll DAO</h3>
                                            <p className="mt-2 text-muted-foreground dark:text-slate-400">
                                                Explore governance discussions and proposals within the Scroll DAO community.
                                            </p>
                                            <GoToSpaceButton href="/s/scroll" />
                                        </div>
                                    </div>
                                </section>

                                {/* Features */}
                                <section id="features" className="py-24 bg-white dark:bg-slate-900">
                                    <div className="max-w-7xl mx-auto px-4">
                                        <div className="max-w-3xl mx-auto text-center mb-16">
                                            <h2 className="text-3xl font-bold mb-4 dark:text-white">Powerful Features</h2>
                                            <p className="text-lg text-muted-foreground dark:text-slate-400">
                                                Transform how you engage in debates with our innovative tools and mechanisms
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            <div className="group bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-8 rounded-2xl transition-colors">
                                                <MessageCircle className="w-10 h-10 text-primary mb-4" />
                                                <h3 className="text-xl font-semibold mb-3 dark:text-white">Points & Negations</h3>
                                                <p className="text-muted-foreground dark:text-slate-400 leading-relaxed">
                                                    Create structured arguments and counter-arguments backed by economic incentives for truthful discourse.
                                                </p>
                                            </div>
                                            <div className="group bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-8 rounded-2xl transition-colors">
                                                <Shield className="w-10 h-10 text-primary mb-4" />
                                                <h3 className="text-xl font-semibold mb-3 dark:text-white">Commitment Mechanisms</h3>
                                                <p className="text-muted-foreground dark:text-slate-400 leading-relaxed">
                                                    Put your reputation on the line with Cred staking, and demonstrate integrity through accountable actions.
                                                </p>
                                            </div>
                                            <div className="group bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 p-8 rounded-2xl transition-colors">
                                                <Zap className="w-10 h-10 text-primary mb-4" />
                                                <h3 className="text-xl font-semibold mb-3 dark:text-white">Structured Rationales</h3>
                                                <p className="text-muted-foreground dark:text-slate-400 leading-relaxed">
                                                    Build compelling arguments with our structured framework for maximum clarity and impact.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* What People Are Saying */}
                                <section id="testimonials" className="py-24 bg-slate-100 dark:bg-slate-800">
                                    <div className="max-w-7xl mx-auto px-4">
                                        <div className="max-w-3xl mx-auto text-center mb-16">
                                            <h2 className="text-3xl font-bold mb-4 dark:text-white">What People Are Saying</h2>
                                            <p className="text-lg text-muted-foreground dark:text-slate-400">
                                                See what DAO operators and delegates think about the Negation Game
                                            </p>
                                        </div>
                                        <TestimonialsCarousel />
                                    </div>
                                </section>

                                <div id="get-started">
                                    <OnboardingSection />
                                </div>
                            </main>

                            <footer className="border-t border-slate-200 dark:border-slate-800 py-8">
                                <div className="max-w-7xl mx-auto px-4">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div className="text-sm text-muted-foreground dark:text-slate-400">
                                            © 2024-{new Date().getFullYear()} Negation Game. All rights reserved.
                                        </div>
                                        <div className="flex items-center gap-6 text-sm">
                                            <Link
                                                href="/privacy"
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                Privacy Policy
                                            </Link>
                                            <Link
                                                href="/tos"
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                Terms of Service
                                            </Link>
                                            <a
                                                href="https://t.me/+a0y-MpvjAchkM2Qx"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                Contact
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </footer>
                        </div>
                    </OnboardingProvider>
                </WriteupProvider>
            </KnowledgeBaseProvider>
        </>
    );
} 