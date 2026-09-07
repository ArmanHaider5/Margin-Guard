# Design Guidelines: SME Diagnostic Tool

## Design Approach

**Selected Approach**: Design System - Utilitarian Focus

**Justification**: This is a productivity tool where clarity, efficiency, and trust are paramount. SME users need to focus on accurate problem diagnosis without visual distractions. The interface should feel professional yet approachable, reducing cognitive load during the diagnostic process.

**Core Principle**: Clear information hierarchy with minimal friction - every element serves the diagnostic workflow.

---

## Typography

**Font Family**:
- Primary: Inter (via Google Fonts CDN)
- Fallback: system-ui, -apple-system, sans-serif

**Type Scale**:
- Page Titles: text-2xl (24px), font-semibold
- Section Headers: text-xl (20px), font-semibold  
- Question Text: text-lg (18px), font-medium
- Body/Descriptions: text-base (16px), font-normal
- Helper Text: text-sm (14px), font-normal
- Labels: text-sm (14px), font-medium

**Line Height**: Use relaxed leading (leading-relaxed) for all question text and results to improve readability.

---

## Layout System

**Spacing Primitives**: Use Tailwind units of **2, 4, 6, and 8** consistently
- Component padding: p-4, p-6
- Section spacing: space-y-6, gap-6
- Card margins: m-4, mb-8
- Input spacing: space-y-4

**Container Strategy**:
- Max width: max-w-3xl for questionnaire flow (optimal reading/form width)
- Max width: max-w-5xl for results/dashboard views
- Center alignment: mx-auto for all main content containers
- Viewport padding: px-4 sm:px-6 lg:px-8

**Grid System**: 
- Single column for questionnaire flow
- Two-column grid (grid-cols-1 md:grid-cols-2) for results comparison or multiple recommendations

---

## Component Library

### Navigation
- Simple top bar with logo/app name on left
- User menu/settings on right
- No complex navigation - tool is single-purpose workflow

### Questionnaire Components
- **Progress Indicator**: Horizontal step indicator showing diagnostic flow (1. Symptom → 2. Analysis → 3. Results)
- **Question Cards**: Contained white cards with subtle border, rounded corners (rounded-lg), padding p-6
- **Radio/Checkbox Groups**: Large touch targets, clear labels, grouped with gap-3
- **Text Input Areas**: Full-width inputs with helper text below
- **Navigation Buttons**: "Previous" (secondary) and "Next/Submit" (primary) aligned right with gap-3

### Results Display
- **Root Cause Cards**: Ranked list (1, 2, 3) with priority indicators, expanded content
- **Recommendation Lists**: Numbered action items with checkboxes for tracking
- **5M Category Tags**: Small pills/badges indicating which of the 5Ms each issue relates to

### Supporting Elements
- **Empty States**: When no history exists - simple icon, short message, CTA
- **Loading States**: Simple spinner during AI analysis with "Analyzing patterns..." message
- **Success Confirmations**: Subtle checkmarks and success messages

---

## Icons

**Library**: Heroicons (via CDN)
- Use outline style for navigation and general UI
- Use solid style for status indicators and important actions
- Common icons needed: clipboard (diagnosis), lightbulb (solutions), chart (analysis), checkmark (completed)

---

## Animations

**Minimal Use**:
- Smooth transitions on card reveal (transition-all duration-300)
- Gentle fade-in for AI analysis results
- No decorative animations - focus on functional feedback

---

## Form Design Philosophy

**Key Principles**:
- One question per screen for focused input
- Clear labels above all inputs
- Helper text in muted style below inputs when needed
- Large, tappable radio buttons and checkboxes
- Visible focus states on all interactive elements
- Validation messages appear inline, near the relevant field

---

## Information Hierarchy

**Questionnaire Flow**:
1. Question number/progress (subtle, top)
2. Question text (prominent, large)
3. Helpful context (medium weight)
4. Input options (clear, spaced)
5. Navigation controls (bottom, right-aligned)

**Results Flow**:
1. Summary headline ("We identified 3 probable root causes")
2. Ranked root causes (cards, numbered)
3. Recommendations per cause (expandable lists)
4. Action buttons (save report, start new diagnosis)

---

## Critical UX Patterns

**Guided Experience**:
- Show progress at all times
- Allow backward navigation without data loss
- Provide "Skip" option for non-critical questions
- Auto-save responses as user progresses

**Plain Language**:
- No technical jargon or framework terminology
- Action-oriented button labels ("Analyze My Problem" not "Submit")
- Results in simple business terms SME owners understand

**Mobile-First**:
- All touch targets minimum 44x44px
- Stack all elements vertically on mobile
- Comfortable thumb-zone placement for primary actions

---

## Visual Treatment

**Aesthetic**: Clean, professional, trustworthy - like a business consultant's report, not a consumer app.

**Contrast Strategy**: High contrast for text and interactive elements, subtle contrast for containers and dividers.

**Spacing Philosophy**: Generous whitespace around questions and results to reduce overwhelm and improve focus.