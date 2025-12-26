import React from 'react';

export const metadata = {
    title: 'Terms of Service | Negation Game',
    description: 'Terms of Service for Negation Game - Learn about our terms and conditions.',
};

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-4xl px-4 py-12">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    <h1 className="text-4xl font-bold text-center mb-2">Terms of Service</h1>
                    <p className="text-center text-muted-foreground mb-12">
                        Last updated: December 25, 2025
                    </p>

                    <div className="space-y-8">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                By accessing and using Negation Game (&quot;the Service&quot;), you accept and agree to be bound by the terms and provision of this agreement. By visiting our site, you also accept and consent to our use of cookies and similar tracking technologies as described in our Privacy Policy. If you do not agree to abide by the above, please do not use this service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
                            <p className="text-muted-foreground">
                                Negation Game is a collaborative reasoning and debate platform where users can create, share, and discuss arguments, viewpoints, and rationales. The service allows users to connect their wallets, social accounts, and participate in community discussions.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
                            <p className="text-muted-foreground mb-4">To use certain features of the Service, you must register for an account. You agree to:</p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Provide accurate and complete information</li>
                                <li>Maintain the security of your account credentials</li>
                                <li>Accept responsibility for all activities under your account</li>
                                <li>Notify us immediately of any unauthorized use</li>
                            </ul>
                            <p className="text-muted-foreground mt-4">Account deletion is currently not supported at this time. If you wish to stop using our service, you can discontinue account usage.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">4. User Conduct</h2>
                            <p className="text-muted-foreground mb-4">You agree not to use the Service to:</p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Violate any applicable laws or regulations</li>
                                <li>Infringe on intellectual property rights</li>
                                <li>Harass, abuse, or harm others</li>
                                <li>Distribute spam or malicious content</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">5. Content Ownership</h2>
                            <p className="text-muted-foreground">
                                You retain ownership of content you create and share on the platform. By posting content, you grant us a non-exclusive, royalty-free license to use, display, and distribute your content for the purpose of operating and improving the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
                            <p className="text-muted-foreground mb-4">
                                Our service integrates with various third-party providers. Their terms and policies apply to their respective services:
                            </p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li><strong>Privy</strong>: Authentication and wallet services - <a href="https://privy.io/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a></li>
                                <li><strong>Google (Gemini AI)</strong>: AI content generation - <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a></li>
                                <li><strong>OpenAI</strong>: AI assistance features - <a href="https://openai.com/policies/terms-of-use/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a></li>
                                <li><strong>Vercel</strong>: Hosting and analytics - <a href="https://vercel.com/legal/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a></li>
                                <li><strong>PostHog</strong>: Product analytics - <a href="https://posthog.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a></li>
                                <li><strong>Supabase</strong>: Database services - <a href="https://supabase.com/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Terms of Service</a></li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">7. Privacy</h2>
                            <p className="text-muted-foreground">
                                Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">8. Termination</h2>
                            <p className="text-muted-foreground">
                                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">9. Disclaimer of Warranties</h2>
                            <p className="text-muted-foreground">
                                The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. We make no warranties, expressed or implied, and hereby disclaim all warranties including but not limited to merchantability and fitness for a particular purpose.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">10. Limitation of Liability</h2>
                            <p className="text-muted-foreground">
                                In no event shall Negation Game be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">11. Changes to Terms</h2>
                            <p className="text-muted-foreground">
                                We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or through the Service. Continued use constitutes acceptance of the modified terms.
                            </p>
                        </section>

                        <section className="bg-muted/50 rounded-lg p-6 mt-12">
                            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
                            <p className="text-muted-foreground mb-2">
                                If you have any questions about these Terms of Service, please contact us at:
                            </p>
                            <p className="text-primary font-medium">support@networkgoods.institute</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
