# Accessibility Baseline

> Target WCAG 2.2 AA for web interfaces. Mobile interfaces follow the same perceivable, operable, understandable, and robust principles using platform accessibility APIs.

## Semantic Structure

- Use native elements and controls before recreating behavior with generic containers.
- Give each page one descriptive primary heading and a logical heading hierarchy.
- Every control has an accessible name. Every form field has a persistent label and associated error/help text.
- Images need meaningful alternative text or an explicit decorative treatment.

## Keyboard and Focus

- All interactive behavior works from the keyboard without a trap.
- Focus order follows visual and reading order.
- Dialogs move focus inside, contain it while open, close with Escape when appropriate, and restore focus to the trigger.
- Route changes, validation failures, and asynchronous updates move or announce focus only when it helps the user understand the change.
- Visible focus indicators must not be removed or obscured.

## Visual and Motion

- Do not use color alone to communicate state.
- Meet WCAG contrast requirements for text, controls, states, and focus indicators.
- Layout must support zoom, text resizing, narrow screens, and content reflow without hiding essential actions.
- Respect `prefers-reduced-motion`; avoid flashing and unnecessary autoplay.
- Touch targets must be large enough and not depend on precision dragging alone.

## Forms and Authentication

- Identify errors in text, associate them with fields, and preserve entered values after failed validation.
- Allow password managers and paste. Do not block autocomplete or require users to transcribe credentials unnecessarily.
- Provide accessible alternatives to cognitive-function authentication tests where required by WCAG 2.2.
- Loading and disabled states remain perceivable to assistive technology.

## Accessibility Testing

- Prefer role, label, and visible-name queries in component and end-to-end tests.
- Add automated axe checks for common violations, but do not treat automation as complete coverage.
- Manually test keyboard navigation, focus, zoom/reflow, reduced motion, and at least one screen reader for critical flows.
- Include authentication, errors, dialogs, navigation, and the core user journey in manual coverage.

## Primary Reference

- WCAG 2.2: https://www.w3.org/TR/WCAG22/

