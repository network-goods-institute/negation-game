import React from 'react';

export const metadata = {
    title: 'Privacy Policy | Negation Game',
    description: 'Privacy Policy for Negation Game - Learn how we collect, use, and protect your data.',
};

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto max-w-4xl px-4 py-12">
                <div className="prose prose-lg dark:prose-invert max-w-none">
                    <h1 className="text-4xl font-bold text-center mb-2">Privacy Policy</h1>
                    <p className="text-center text-muted-foreground mb-12">
                        Last updated: September 13, 2025
                    </p>

                    <div className="space-y-8">
                        <section>
                            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Negation Game ("we", "us", or "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
                            </p>
                            <p className="text-muted-foreground leading-relaxed mt-4">
                                By visiting our site, you accept and consent to the practices described in this policy, including our use of cookies and similar technologies.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">2. Information We Collect</h2>

                            <h3 className="text-xl font-medium mb-2">2.1 Information You Provide</h3>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Account information (username, email, bio)</li>
                                <li>Content you create (points, negations, rationales, messages)</li>
                                <li>Communication preferences and settings</li>
                            </ul>

                            <h3 className="text-xl font-medium mb-2 mt-6">2.2 Information Collected Automatically</h3>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Device information and browser data</li>
                                <li>Usage data and interaction patterns</li>
                                <li>IP addresses and location data</li>
                                <li>Cookies and similar tracking technologies</li>
                            </ul>

                            <h3 className="text-xl font-medium mb-2 mt-6">2.3 Third-Party Information</h3>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Wallet addresses and blockchain data</li>
                                <li>Social media account information</li>
                                <li>Data from authentication providers</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">3. How We Use Your Information</h2>
                            <p className="text-muted-foreground mb-4">We use the collected information to:</p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Provide and maintain our services</li>
                                <li>Process transactions and economic interactions</li>
                                <li>Generate AI-assisted content and recommendations</li>
                                <li>Improve user experience and platform functionality</li>
                                <li>Ensure platform security and prevent abuse</li>
                                <li>Communicate with you about your account and our services</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">4. Information Sharing and Disclosure</h2>
                            <p className="text-muted-foreground mb-4">We may share your information:</p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>With service providers who assist our operations</li>
                                <li>To comply with legal obligations</li>
                                <li>To protect our rights and prevent fraud</li>
                                <li>In connection with a business transfer or merger</li>
                                <li>With your explicit consent</li>
                            </ul>
                            <p className="text-muted-foreground mt-4">We do not sell your personal information to third parties.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">5. Cookies and Tracking Technologies</h2>
                            <p className="text-muted-foreground mb-4">
                                By visiting our site, you accept and consent to our use of cookies and similar technologies to:
                            </p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Authenticate your account and maintain your session</li>
                                <li>Remember your preferences and settings</li>
                                <li>Analyze usage patterns and improve our services</li>
                                <li>Provide personalized content and recommendations</li>
                            </ul>
                            <p className="text-muted-foreground mt-4">You can control cookie settings through your browser preferences.</p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">6. Third-Party Services</h2>
                            <p className="text-muted-foreground mb-4">
                                Our service integrates with various third-party providers. Their privacy practices are governed by their respective policies:
                            </p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li><strong>Privy</strong>: Authentication and wallet services - <a href="https://privy.io/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a></li>
                                <li><strong>Google (Gemini AI)</strong>: AI content generation - <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a></li>
                                <li><strong>OpenAI</strong>: AI assistance features - <a href="https://openai.com/policies/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a></li>
                                <li><strong>Vercel</strong>: Hosting and analytics - <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a></li>
                                <li><strong>Supabase</strong>: Database services - <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Privacy Policy</a></li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
                            <p className="text-muted-foreground">
                                We implement appropriate technical and organizational measures to protect your personal data against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
                            <p className="text-muted-foreground">
                                We retain your information for as long as necessary to provide our services and comply with legal obligations. Account deletion is currently not supported at this time. If you wish to stop using our service, you can discontinue account usage.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">9. International Data Transfers</h2>
                            <p className="text-muted-foreground">
                                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">10. Your Rights</h2>
                            <p className="text-muted-foreground mb-4">
                                Depending on your location, you may have certain rights regarding your personal data, including:
                            </p>
                            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                                <li>Access to your personal data</li>
                                <li>Correction of inaccurate data</li>
                                <li>Deletion of your data (subject to limitations)</li>
                                <li>Data portability</li>
                                <li>Objection to processing</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">11. Children's Privacy</h2>
                            <p className="text-muted-foreground">
                                Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold mb-4">12. Changes to This Policy</h2>
                            <p className="text-muted-foreground">
                                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.
                            </p>
                        </section>

                        <section className="bg-muted/50 rounded-lg p-6 mt-12">
                            <h3 className="text-xl font-semibold mb-4">Contact Us</h3>
                            <p className="text-muted-foreground mb-2">
                                If you have any questions about this Privacy Policy, please contact us at:
                            </p>
                            <p className="text-primary font-medium">support@networkgoods.institute</p>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
