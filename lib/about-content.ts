// Single source of truth for the About screen's copy. The credit, trademark,
// and "not affiliated" wording is the legal notice a fan-made companion app
// has to carry, so it lives in one place and is pinned by tests rather than
// being retyped (and quietly reworded) wherever it is shown.

export const ABOUT_TITLE = 'About'

export const ABOUT_INTRO =
  'Valeria Scoring is an unofficial companion app for Valeria: Card Kingdoms.'

export const ABOUT_CREDITS =
  'Valeria: Card Kingdoms was designed by Isaias Vallejo, illustrated by Mihajlo Dimitrievski, and is published by Daily Magic Games. Valeria, Valeria: Card Kingdoms and all related names, characters and imagery are trademarks of Daily Magic Games.'

export const ABOUT_DISCLAIMER =
  'This is a fan-made tool. It is not published, licensed or endorsed by Daily Magic Games, and no affiliation is claimed or implied. A copy of the game is required to use it.'

export const ABOUT_BYLINE = 'Built by Izzy (Elizabeth) Hodnett'

export const ABOUT_PARAGRAPHS = Object.freeze([
  ABOUT_INTRO,
  ABOUT_CREDITS,
  ABOUT_DISCLAIMER,
])
