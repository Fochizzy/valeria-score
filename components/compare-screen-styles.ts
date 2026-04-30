import { StyleSheet } from 'react-native'
import { theme } from '../constants/theme'

export const compareScreenStyles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  pageBackgroundImage: {
    opacity: 1,
  },

  pageScrim: {
    flex: 1,
    backgroundColor: 'rgba(10, 15, 30, 0.74)',
  },

  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  content: {
    padding: 12,
    paddingBottom: 16,
  },

  heroCard: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
    padding: 16,
    marginBottom: 16,
    ...theme.shadow.card,
  },

  heroCardLive: {
    ...theme.shadow.glow,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },

  heroTextWrap: {
    flex: 1,
    minWidth: 0,
  },

  heroKicker: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },

  heroTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 4,
  },

  heroSubtitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  quickActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  playerTargetCard: {
    marginTop: 12,
    backgroundColor: 'rgba(12, 21, 37, 0.5)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    gap: 10,
  },

  playerTargetHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },

  playerTargetHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  playerTargetLabel: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },

  playerTargetHint: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },

  playerTargetValue: {
    color: theme.colors.accent,
    fontSize: 28,
    fontWeight: '900',
    minWidth: 34,
    textAlign: 'right',
  },

  playerTargetControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  playerTargetControlStack: {
    gap: 10,
  },

  playerTargetStepButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.border,
  },

  playerTargetStepButtonText: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 24,
  },

  playerTargetStatus: {
    flex: 1,
    minWidth: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },

  playerTargetChoiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  playerTargetChoiceButton: {
    minWidth: 42,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  playerTargetChoiceButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    ...theme.shadow.glow,
  },

  playerTargetChoiceButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  playerTargetChoiceButtonTextSelected: {
    color: theme.colors.text,
  },

  playerTargetReadOnly: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },

  playerTargetStatusLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  playerTargetStatusValue: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
  },

  playerTargetFacts: {
    flexDirection: 'row',
    gap: 8,
  },

  playerTargetFact: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  playerTargetFactLabel: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  playerTargetFactValue: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  quickActionButton: {
    flexGrow: 1,
  },

  addGuestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  addGuestIcon: {
    marginRight: 2,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  statsButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryHeroButton: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  secondaryHeroButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  heroButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.colors.borderAccent ?? theme.colors.accent,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    ...theme.shadow.glow,
  },

  heroButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  ghostedButton: {
    opacity: 0.45,
  },

  ghostedButtonText: {
    opacity: 0.7,
  },

  leaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    marginBottom: 12,
  },

  leaderBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  leaderBadgeText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: '900',
  },

  leaderStripMeta: {
    flex: 1,
    minWidth: 0,
  },

  leaderStripName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },

  leaderStripSub: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },

  noticeCard: {
    backgroundColor: 'rgba(228, 218, 255, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 16,
  },

  noticeTitle: {
    color: theme.colors.accent,
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 4,
  },

  noticeText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  inlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(228, 218, 255, 0.06)',
    marginBottom: 16,
  },

  inlineNoticeIcon: {
    flexShrink: 0,
  },

  inlineNoticeText: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },

  scoreId: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },

  scoreValueWrap: {
    minWidth: 46,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },

  errorCard: {
    backgroundColor: 'rgba(255, 126, 138, 0.1)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.error,
    padding: 14,
    marginBottom: 12,
  },

  errorTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },

  errorButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.error,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  errorButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '900',
  },

  scoresCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginBottom: 16,
    ...theme.shadow.card,
  },

  sectionTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 12,
  },

  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },

  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 12,
    marginBottom: 10,
  },

  rankWrap: {
    marginRight: 8,
  },

  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rankBadgeText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '900',
  },

  thumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundAlt,
    marginRight: 10,
  },

  thumb: {
    width: '100%',
    height: '100%',
  },

  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.10)',
  },

  thumbFallbackText: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },

  scoreMeta: {
    flex: 1,
    minWidth: 0,
  },

  scoreName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },

  scoreDuke: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },

  scoreStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },

  statusDotLocked: {
    backgroundColor: theme.colors.success,
  },

  statusDotOpen: {
    backgroundColor: theme.colors.error,
  },

  statusDotPending: {
    backgroundColor: theme.colors.textMuted,
  },

  scoreSubtext: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },

  scoreValue: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'right',
  },

  scoreValuePending: {
    color: theme.colors.textMuted,
  },

  buttonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },

  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    ...theme.shadow.card,
  },

  statusTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
  },

  statusText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
})
