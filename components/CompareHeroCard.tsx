import { Pressable, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { theme } from '../constants/theme'
import { buildCompareHeroCopy } from '../lib/compare-dashboard-state'
import type { ComparePlayerCountChoice } from '../lib/compare-screen-state'
import { compareScreenStyles as styles } from './compare-screen-styles'

type Props = {
  isCreator: boolean
  livePulse: boolean
  canShare: boolean
  sharing: boolean
  canAddGuest: boolean
  canFinish: boolean
  finishing: boolean
  expectedPlayerCount: number
  savingPlayerTarget: boolean
  progressLabel: string
  guestParticipants: number
  statusLabel: string
  playerCountChoices: ComparePlayerCountChoice[]
  onShare: () => void
  onAddGuest: () => void
  onFinishGame: () => void
  onUpdateExpectedPlayerCount: (nextCount: number, minimumCount: number) => void
}

export default function CompareHeroCard({
  isCreator,
  livePulse,
  canShare,
  sharing,
  canAddGuest,
  canFinish,
  finishing,
  expectedPlayerCount: _expectedPlayerCount,
  savingPlayerTarget,
  progressLabel,
  guestParticipants,
  playerCountChoices,
  onShare,
  onAddGuest,
  onFinishGame,
  onUpdateExpectedPlayerCount,
}: Props) {
  // Hide ineligible action buttons entirely instead of greying them out so the
  // row only shows what's currently actionable.
  const showShare = canShare || sharing
  const showAddGuest = canAddGuest
  const showFinish = canFinish || finishing
  const hasAnyAction = showShare || showAddGuest || showFinish

  return (
    <View style={[styles.heroCard, livePulse && styles.heroCardLive]}>
      <View style={styles.heroTopRow}>
        <View style={styles.heroTextWrap}>
          <Text style={styles.heroTitle}>Current Table</Text>
          <Text style={styles.heroSubtitle}>{buildCompareHeroCopy({ isCreator })}</Text>
        </View>
      </View>

      {hasAnyAction ? (
        <View style={styles.quickActionsRow}>
          {showShare ? (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryHeroButton,
                styles.quickActionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onShare}
              disabled={!canShare || sharing}
            >
              <Text style={styles.secondaryHeroButtonText}>
                {sharing ? 'Sharing...' : 'Share'}
              </Text>
            </Pressable>
          ) : null}

          {showAddGuest ? (
            <Pressable
              style={({ pressed }) => [
                styles.secondaryHeroButton,
                styles.quickActionButton,
                styles.addGuestButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onAddGuest}
              disabled={!canAddGuest}
            >
              <MaterialCommunityIcons
                name="account-plus"
                size={16}
                color={theme.colors.text}
                style={styles.addGuestIcon}
              />
              <Text style={styles.secondaryHeroButtonText}>Add Guest</Text>
            </Pressable>
          ) : null}

          {showFinish ? (
            <Pressable
              style={({ pressed }) => [
                styles.heroButton,
                styles.quickActionButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={onFinishGame}
              disabled={!canFinish || finishing}
            >
              <Text style={styles.heroButtonText}>
                {finishing ? 'Finishing...' : isCreator ? 'Finish Game' : 'Host Finishes'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.playerTargetCard}>
        <View style={styles.playerTargetHeaderText}>
          <Text style={styles.playerTargetLabel}>Players at Table</Text>
        </View>

        {isCreator ? (
          <View style={styles.playerTargetControlStack}>
            <View style={styles.playerTargetStatus}>
              <Text style={styles.playerTargetStatusLabel}>Completed Scorings</Text>
              <Text style={styles.playerTargetStatusValue}>{progressLabel}</Text>
              <Text style={styles.playerTargetHint}>
                Saves stay locked until every expected player saves a score.
              </Text>
            </View>

            <View style={styles.playerTargetChoiceRow}>
              {playerCountChoices.map((choice) => (
                <Pressable
                  key={choice.value}
                  style={({ pressed }) => [
                    styles.playerTargetChoiceButton,
                    choice.selected && styles.playerTargetChoiceButtonSelected,
                    pressed && !choice.disabled && styles.buttonPressed,
                    choice.disabled && styles.ghostedButton,
                  ]}
                  onPress={() => onUpdateExpectedPlayerCount(choice.value, choice.value)}
                  disabled={choice.disabled}
                >
                  <Text
                    style={[
                      styles.playerTargetChoiceButtonText,
                      choice.selected && styles.playerTargetChoiceButtonTextSelected,
                      choice.disabled && styles.ghostedButtonText,
                    ]}
                  >
                    {choice.value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.playerTargetReadOnly}>
            <Text style={styles.playerTargetStatusLabel}>Completed Scorings</Text>
            <Text style={styles.playerTargetStatusValue}>{progressLabel}</Text>
            <Text style={styles.playerTargetHint}>
              The host controls the full table size, including guests.
            </Text>
          </View>
        )}

        <View style={styles.playerTargetFacts}>
          <View style={styles.playerTargetFact}>
            <Text style={styles.playerTargetFactLabel}>Guests</Text>
            <Text style={styles.playerTargetFactValue}>
              {savingPlayerTarget ? 'Saving...' : guestParticipants}
            </Text>
          </View>
        </View>
      </View>
    </View>
  )
}
