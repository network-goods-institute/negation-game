'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { EditingPointAnimation } from './tutorial/animations/EditingPointAnimation';
import { SupportNegationAnimation } from './tutorial/animations/SupportNegationAnimation';
import { ConnectionModeAnimation } from './tutorial/animations/ConnectionModeAnimation';

interface TutorialPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: 'Making a Good Point',
    subtitle: 'Step 1 of 3',
    description: 'Create clear, specific claims that can be evaluated',
    animation: <EditingPointAnimation />,
    tips: [
      { label: 'Atomic', text: 'Make ONE claim per point - split complex ideas into separate points' },
      { label: 'Specific', text: 'Include numbers, facts, or concrete details - avoid vague language' },
      { label: 'Self-contained', text: 'Each point should make sense without reading other points or edges' },
    ],
    example: {
      badLabel: 'Vague',
      goodLabel: 'Specific',
      bad: 'Remote work is good',
      good: 'Remote workers report 25% fewer daily interruptions',
    },
  },
  {
    title: 'Support & Negation',
    subtitle: 'Step 2 of 3',
    description: 'Connect points to strengthen or challenge claims',
    animation: <SupportNegationAnimation />,
    tips: [
      { label: 'Support', text: 'Add evidence, examples, or data that strengthens the parent claim' },
      { label: 'Negation', text: 'Challenge a claim with contradicting evidence or identify limitations' },
      { label: 'Match edge type', text: 'Your point content must align with the edge type - switch the edge if your point contradicts instead of supports' },
    ],
    example: {
      badLabel: 'Mismatched',
      goodLabel: 'Aligned',
      bad: 'Support edge with irrelevant claim: "Some people don\'t like exercise"',
      good: 'Negation edge with specific counter-evidence: "Exercise can worsen injuries without proper guidance"',
    },
  },
  {
    title: 'Connection Mode',
    subtitle: 'Step 3 of 3',
    description: 'Link existing points to build argument structure',
    animation: <ConnectionModeAnimation />,
    tips: [
      { label: 'Activate', text: 'Click the Connect button in toolbar or press A to enter connection mode' },
      { label: 'Draw edge', text: 'Click source point first, then target point to create a relationship' },
      { label: 'Switch type', text: 'Hover over the edge label and click the toggle to change between support/negation' },
    ],
    example: {
      badLabel: 'Redundant',
      goodLabel: 'Efficient',
      bad: 'Creating new points when existing ones already cover the idea',
      good: 'Connecting "30-min exercise releases endorphins" to support "Exercise improves mental health"',
    },
  },
];

export const TutorialPanel: React.FC<TutorialPanelProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = TUTORIAL_STEPS[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden">
        <VisuallyHidden>
          <DialogTitle>Tutorial - {step.title}</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div className="relative flex items-center justify-between p-6 pb-4 border-b border-stone-200">
          <div>
            <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-1">
              {step.subtitle}
            </div>
            <h2 className="text-2xl font-semibold text-stone-900">{step.title}</h2>
            <p className="text-sm text-stone-600 mt-1">{step.description}</p>
          </div>
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-stone-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-stone-100 data-[state=open]:text-stone-500"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Animation */}
          <div style={{ minHeight: '256px', maxHeight: '256px', height: '256px' }}>
            {step.animation}
          </div>

          {/* Tips */}
          <div style={{ minHeight: '260px' }}>
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Key Points</h3>
            <div className="space-y-3">
              {step.tips.map((tip, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex-shrink-0 w-20">
                    <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {tip.label}
                    </span>
                  </div>
                  <p className="text-sm text-stone-600 leading-relaxed">{tip.text}</p>
                </div>
              ))}
            </div>

            {/* Example */}
            {step.example && (
              <div className="mt-4 pt-4 border-t border-stone-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-rose-600 mb-1">❌ {step.example.badLabel}</div>
                    <div className="text-sm text-stone-600 italic">"{step.example.bad}"</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-emerald-600 mb-1">✓ {step.example.goodLabel}</div>
                    <div className="text-sm text-stone-600 font-medium">"{step.example.good}"</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 pt-0">
          {/* Progress dots */}
          <div className="flex gap-2">
            {TUTORIAL_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStep
                    ? 'bg-blue-600 w-6'
                    : idx < currentStep
                    ? 'bg-blue-300 w-1.5'
                    : 'bg-stone-300 w-1.5'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={isFirst}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </Button>

            {isLast ? (
              <Button onClick={handleClose} className="bg-blue-600 hover:bg-blue-700">
                Get Started
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-1 bg-blue-600 hover:bg-blue-700">
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
