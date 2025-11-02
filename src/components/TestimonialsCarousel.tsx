"use client"

import * as React from "react"
import useEmblaCarousel from 'embla-carousel-react'
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const OPTIONS = { loop: true, align: 'start' as const }

const testimonials = [
  {
    quote: "What's exciting about the Negation Game is the contrast with how decisions are made today. Currently, DAO decision-making can easily become self-serving, often lacks community feedback, and rarely produces novel results. The Negation Game points toward frontier governance mechanisms where community feedback is incorporated in an impactful way and ultimately implemented.",
    name: "erin koen",
    role: "DAO Operator",
    initials: "EK",
  },
  {
    quote: "I love this. So much more sane than a normal social media thread.",
    name: "ccervone",
    role: "Delegate",
    initials: "CC",
  },
  {
    quote: "A great way to reflect about proposals, find other angles and the ways proposals can go ahead. I liked that I can share my rationale. I liked to endorse things and the point system to make it scarce.",
    name: "Humberto-Besso-Oberto",
    role: "Delegate",
    initials: "HB",
  },
  {
    quote: "I really enjoyed working with it, it made me think through the reasons why or why not and helped me fully look at the proposal rationally. Besides being like a game, it's pretty easy (once I understood what to do).",
    name: "coffee-crusher",
    role: "Delegate",
    initials: "CR",
  },
]


export function TestimonialsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel(OPTIONS)

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  return (
    <div className="relative w-full max-w-6xl mx-auto">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="flex-shrink-0 w-full p-4">
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 lg:p-10 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
                <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 lg:gap-8">
                  <div className="flex flex-col items-center sm:items-start flex-shrink-0 w-full sm:w-auto">
                    <Avatar className="h-12 w-12 sm:h-14 sm:w-14 lg:h-16 lg:w-16 mb-3">
                      <AvatarFallback className="bg-primary/10 text-primary text-lg sm:text-xl">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      <div className="font-semibold text-base sm:text-lg lg:text-xl dark:text-white">{testimonial.name}</div>
                      <div className="text-sm sm:text-base lg:text-lg text-muted-foreground dark:text-slate-400">{testimonial.role}</div>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-base sm:text-lg lg:text-2xl text-muted-foreground dark:text-slate-300 leading-relaxed italic">
                      &quot;{testimonial.quote}&quot;
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={scrollPrev} className="absolute top-1/2 left-0 sm:left-[-3rem] transform -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-lg">
        <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-slate-600 dark:text-slate-300" />
      </button>
      <button onClick={scrollNext} className="absolute top-1/2 right-0 sm:right-[-3rem] transform -translate-y-1/2 p-2 sm:p-3 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-lg">
        <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-slate-600 dark:text-slate-300" />
      </button>
    </div>
  )
}