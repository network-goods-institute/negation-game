'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MemoizedMarkdown } from '@/components/editor/MemoizedMarkdown';
import { FC } from 'react';
import { useOnboarding } from '@/components/contexts/OnboardingContext';

export interface WriteupDialogProps {
    isOpen: boolean;
    onClose: () => void;
    showBack?: boolean;
}

const WRITEUP_CONTENT = `# Introduction to the Negation Game

## What is the Negation Game?

> A protocol layer for reasoned disagreement: powered by economic incentives, governed by epistemic values, and designed for minds willing to change.

The Negation Game is a discussion platform built on principles of epistemic accountability and honest intellectual discourse. Unlike traditional discussion platforms that rely solely on upvotes or likes, the Negation Game implements a sophisticated system of economic incentives designed to reward intellectual honesty, evidence-based reasoning, and the willingness to change your mind when presented with compelling counterevidence.

At its core, the Negation Game is an implementation of epistocratic principles, creating a mechanism where users stake their reputation on claims and are rewarded for intellectual integrity rather than stubborn commitment to potentially false beliefs.

## Key Concepts

### Points and Negations

- **Points**: These are statements or arguments that users make in the system. When you make a point, you're essentially putting forward a claim or position.

- **Negations**: These are counterarguments to points. A negation challenges a point directly, creating a paired relationship between the original point and its counterevidence. You can endorse your negation while creating it.

### Cred and Favor

- **Cred**: The primary resource in the system. Each user starts with a fixed allocation of Cred, which acts like a delegation power. You spend Cred to endorse Points and place Doubts; Restakes and Slashes do not cost additional Cred. When you Doubt, your earnings accumulate passively from the favor bonus until the Restaker Slashes, which cuts off further earnings. Use the "Collect Earnings" button in your profile to redeem any accumulated earnings. You must check in on it regularly to collect your earnings or you may miss out if the Restaker Slashes.

- **Favor**: A measure of how much the community believes in a Point. It's calculated based on the point/negation Cred ratio and is boosted by Restakes but reduced by Slashes and Doubts.

### Rationales

- **Rationales**: These are structured collections of points and negations that represent complete arguments. They allow users to create and share comprehensive reasoning structures rather than isolated points.

### Spaces

Spaces are separate communities or contexts within the Negation Game. Each space can have its own focus, culture, and set of discussions:

- **Global Space**: The default space where all users can participate
- **Specialized Spaces**: Topic, community, or DAO-specific spaces 

Each space has its own feed of points, negations, and rationales, allowing communities to develop focused conversations around their specific interests or domains.

## Advanced Mechanisms

### The Commitment Mechanism: Restakes, Slashes, and Doubts

- **Restaking**: Commit to reconsider your endorsement if a specific negation proves true. Restaking does not cost additional Cred; it allocates a portion of your existing Cred endorsed to the parent Point and grants a favor bonus to the parent Point. This bonus is at risk and can be claimed by Doubters until you Slash.

- **Slashing**: Fulfill your Restake commitment by acknowledging the negation changed your mind. Slashing costs no additional Cred, removes the favor bonus, and you earn Cred based on the conditions you committed to.

- **Doubting**: Bet against a Restaker's likelihood of Slashing. Doubting costs Cred to place; if the Restaker does not Slash when expected, you win your Doubt and earn Cred, redeemable via the "Collect Earnings" button. If they Slash, you lose your Doubted Cred.

## How to Use the Negation Game

### Getting Started

1. **Connect your account**: Use the connect button to authenticate. You can link your wallet, email, Google Account, or Farcaster.
2. **Explore the feed**: Browse existing points and negations in your chosen space. Use the search feature to find specific topics or rationales.
3. **Make a point**: Create your first statement to start participating
4. **Use the AI Assistant**: Navigate to the Chat tab to ask questions, generate points, and explore rationales with the built-in AI Assistant.

### Basic Interactions

- **Endorse a point**: When you see a point you agree with, you can endorse it with cred
- **Negate a point**: Create a counterargument to challenge an existing point
- **Create a rationale**: Organize multiple points into a structured argument

### Complex Interactions

- **Restake on a point**: Show your conviction by committing to change your mind if a negation proves true
- **Slash your restake**: Acknowledge when a negation has changed your mind
- **Doubt a restake**: Challenge someone's commitment to intellectual honesty

## The Economic Game

The Negation Game creates a system where:

1. Making strong claims without evidence is risky
2. Being willing to change your mind is rewarded
3. Intellectual honesty has real economic benefits
4. Deep, evidence-based discussions are incentivized

By aligning economic incentives with epistemic values, the Negation Game creates an environment where the truth-seeking process itself becomes the core activity, rather than merely winning arguments.

## Theoretical Foundations

The Negation Game implements principles from epistocracy, which improves upon futarchy by:

1. Integrating information dissemination directly into the market mechanism
2. Making the reasons for beliefs transparent and disputable
3. Creating economic incentives for revealing information that might falsify your own position
4. Establishing a recursive system where claims can be examined at increasing levels of nuance
5. Rewarding those who demonstrate willingness to change their minds based on evidence

The result is a discussion platform where the quality of your reasoning and your intellectual integrity matter more than merely holding popular opinions or having the most followers.`;

export const WriteupDialog: FC<WriteupDialogProps> = ({ isOpen, onClose, showBack = false }) => {
    const { openDialog: openOnboarding } = useOnboarding();
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Negation Game - Full Write-up</DialogTitle>
                </DialogHeader>
                <div className="overflow-y-auto flex-grow pr-6 mb-4">
                    <MemoizedMarkdown content={WRITEUP_CONTENT} id="writeup-content" space="global" discourseUrl="lol" storedMessages={[]} />
                </div>
                <DialogFooter className="mt-auto flex-shrink-0 flex-col sm:flex-row sm:justify-between gap-2 pt-4 border-t">
                    {showBack && (
                        <Button variant="outline" onClick={() => { onClose(); openOnboarding(); }}>
                            Back to Guide
                        </Button>
                    )}
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};