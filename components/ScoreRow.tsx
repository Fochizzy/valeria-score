import { useEffect, useRef, useState } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native'
import * as Haptics from 'expo-haptics'
import { theme } from '../constants/theme'
import { scoreIcons } from '../data/scoreIcons'
import {
  RESOURCE_FORMULA_DIVIDER,
  RESOURCE_FORMULA_ICON_SIZE,
  RESOURCE_FORMULA_LEADING_SLOT_SIZE,
  getScoreRowAccentTone,
  getScoreRowLayout,
  type ScoreRowAccentTone,
} from '../lib/score-row-layout'

type Props = {
  label: string
  ruleText: string
  value: number
  onChange: (value: number) => void
  icon: ImageSourcePropType
  disabled?: boolean
}

const HOLD_START_DELAY = 350
const HOLD_REPEAT_MS = 85
const HOLD_STEP = 10

function getAccent(label: string) {
  return getAccentForTone(getScoreRowAccentTone(label))
}

function getAccentForTone(tone: ScoreRowAccentTone) {
  switch (tone) {
    case 'gold':
      return {
        ring: theme.colors.gold,
        tintBg: 'rgba(231, 199, 104, 0.14)',
      }
    case 'mana':
      return {
        ring: theme.colors.magic,
        tintBg: 'rgba(89, 183, 255, 0.14)',
      }
    case 'fight':
      return {
        ring: theme.colors.fight,
        tintBg: 'rgba(240, 138, 126, 0.14)',
      }
    case 'green':
      return {
        ring: theme.colors.success,
        tintBg: 'rgba(112, 215, 165, 0.14)',
      }
    case 'gray':
      return {
        ring: '#A3A9B8',
        tintBg: 'rgba(163, 169, 184, 0.14)',
      }
    case 'victory':
      return {
        ring: '#C084FC',
        tintBg: 'rgba(192, 132, 252, 0.14)',
      }
    case 'monster':
      return {
        ring: '#FF8D7A',
        tintBg: 'rgba(255, 141, 122, 0.14)',
      }
    case 'domain':
      return {
        ring: '#7CC5FF',
        tintBg: 'rgba(124, 197, 255, 0.14)',
      }
    default:
      return {
        ring: theme.colors.borderAccent ?? theme.colors.accent,
        tintBg: 'rgba(220, 203, 255, 0.10)',
      }
  }
}

export function ScoreRow({
  label,
  ruleText,
  value,
  onChange,
  icon,
  disabled = false,
}: Props) {
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const repeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const holdingRef = useRef(false)
  const inputRef = useRef<TextInput | null>(null)

  const accent = getAccent(label)
  const layout = getScoreRowLayout(label)
  const displayedRuleText = layout.plainRuleText
    ? ruleText.replace(/\s+/g, '')
    : ruleText
  const modifierText = ruleText.replace(/\D+/g, '') || ruleText.trim()

  const [editText, setEditText] = useState<string>(String(value))
  const [editing, setEditing] = useState<boolean>(false)

  useEffect(() => {
    if (!editing) setEditText(String(value))
  }, [value, editing])

  useEffect(() => {
    return () => {
      clearTimers()
    }
  }, [])

  function clearTimers() {
    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current)
      startTimeoutRef.current = null
    }

    if (repeatIntervalRef.current) {
      clearInterval(repeatIntervalRef.current)
      repeatIntervalRef.current = null
    }

    holdingRef.current = false
  }

  function clamp(nextValue: number) {
    return Math.max(0, Math.floor(nextValue))
  }

  async function bump(delta: number) {
    if (disabled) return
    onChange(clamp(value + delta))
    await Haptics.selectionAsync()
  }

  async function bumpHold(delta: number) {
    if (disabled) return
    onChange(clamp(value + delta))
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  }

  function handlePress(delta: number) {
    if (disabled) return
    if (holdingRef.current) return
    void bump(delta)
  }

  function startHold(delta: number) {
    if (disabled) return

    clearTimers()

    startTimeoutRef.current = setTimeout(() => {
      holdingRef.current = true
      void bumpHold(delta * HOLD_STEP)

      repeatIntervalRef.current = setInterval(() => {
        void bumpHold(delta * HOLD_STEP)
      }, HOLD_REPEAT_MS)
    }, HOLD_START_DELAY)
  }

  function endHold() {
    clearTimers()
  }

  function handleValueChangeText(next: string) {
    const sanitized = next.replace(/[^0-9]/g, '').slice(0, 4)
    setEditText(sanitized)
  }

  function commitValueEdit() {
    setEditing(false)

    if (editText === '') {
      onChange(0)
      setEditText('0')
      return
    }

    const parsed = Number(editText)

    if (Number.isFinite(parsed)) {
      onChange(clamp(parsed))
    } else {
      setEditText(String(value))
    }
  }

  function focusValueInput() {
    if (disabled) return

    setEditing(true)

    if (value === 0) {
      setEditText('')
    }

    requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  function renderResourceFormula() {
    return (
      <View
        style={[
          styles.formulaWrap,
          {
            borderColor: accent.ring,
            backgroundColor: accent.tintBg,
          },
        ]}
      >
        <View style={styles.formulaLeadingIconSlot}>
          <Image
            source={scoreIcons.gold}
            style={styles.formulaIcon}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.formulaSymbol}>+</Text>

        <Image
          source={scoreIcons.fight}
          style={styles.formulaIcon}
          resizeMode="contain"
        />

        <Text style={styles.formulaSymbol}>+</Text>

        <Image
          source={scoreIcons.magic}
          style={styles.formulaIcon}
          resizeMode="contain"
        />

        <Text style={styles.formulaDivider}>{RESOURCE_FORMULA_DIVIDER}</Text>

        <Text style={[styles.formulaModifier, { color: accent.ring }]}>
          {modifierText}
        </Text>
      </View>
    )
  }

  function renderStackedMultiplier() {
    return (
      <View style={styles.multiplierRow}>
        <View
          style={[
            styles.stackedMultiplier,
            {
              borderColor: accent.ring,
              backgroundColor: accent.tintBg,
            },
          ]}
        >
          <Text style={[styles.stackedMultiplierText, { color: accent.ring }]}>
            {displayedRuleText}
          </Text>
        </View>
      </View>
    )
  }

  const showStackedMultiplier = !layout.resourceFormula && !layout.plainRuleText

  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.left}>
        <View style={styles.iconWrap}>
          <Image source={icon} style={styles.icon} resizeMode="contain" />
        </View>

        <View style={[styles.meta, layout.hideLabel && styles.centeredMeta]}>
          {!layout.hideLabel ? (
            <View style={styles.labelBlock}>
              <View style={styles.labelRow}>
                <Text
                  style={styles.label}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                >
                  {label}
                </Text>
              </View>

              {showStackedMultiplier ? renderStackedMultiplier() : null}
            </View>
          ) : null}

          {layout.resourceFormula ? (
            renderResourceFormula()
          ) : layout.plainRuleText ? (
            <Text style={[styles.plainRule, { color: accent.ring }]}>
              {displayedRuleText}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={[styles.stepper, disabled && styles.disabledButton]}>
        <Pressable
          style={({ pressed }) => [styles.stepperCell, pressed && styles.pressed]}
          onPress={() => handlePress(-1)}
          onPressIn={() => startHold(-1)}
          onPressOut={endHold}
          onLongPress={() => {}}
          delayLongPress={HOLD_START_DELAY}
          disabled={disabled}
          hitSlop={4}
        >
          <Text style={styles.stepperGlyph}>−</Text>
        </Pressable>

        <View style={styles.stepperDivider} />

        <Pressable
          style={({ pressed }) => [
            styles.stepperValueCell,
            pressed && styles.pressed,
          ]}
          onPress={focusValueInput}
          disabled={disabled}
        >
          <TextInput
            ref={inputRef}
            value={editing ? editText : String(value)}
            onChangeText={handleValueChangeText}
            onFocus={focusValueInput}
            onBlur={commitValueEdit}
            onSubmitEditing={commitValueEdit}
            keyboardType="number-pad"
            inputMode="numeric"
            returnKeyType="done"
            selectTextOnFocus
            editable={!disabled}
            style={styles.stepperValueText}
            maxLength={4}
          />
        </Pressable>

        <View style={styles.stepperDivider} />

        <Pressable
          style={({ pressed }) => [styles.stepperCell, pressed && styles.pressed]}
          onPress={() => handlePress(1)}
          onPressIn={() => startHold(1)}
          onPressOut={endHold}
          onLongPress={() => {}}
          delayLongPress={HOLD_START_DELAY}
          disabled={disabled}
          hitSlop={4}
        >
          <Text style={styles.stepperGlyph}>+</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 86,
  },

  rowDisabled: {
    opacity: 0.58,
  },

  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    paddingRight: 10,
  },

  iconWrap: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  icon: {
    width: 48,
    height: 48,
  },

  meta: {
    flex: 1,
    minWidth: 0,
  },

  centeredMeta: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  labelBlock: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
  },

  labelRow: {
    width: '100%',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
    width: '100%',
    minWidth: 0,
    textAlign: 'center',
  },

  multiplierRow: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },

  stackedMultiplier: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stackedMultiplierText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
  },

  plainRule: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },

  formulaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
    borderRadius: 10,
    borderWidth: 1,
    paddingLeft: 8,
    paddingRight: 8,
    paddingVertical: 3,
  },

  formulaIcon: {
    width: RESOURCE_FORMULA_ICON_SIZE,
    height: RESOURCE_FORMULA_ICON_SIZE,
  },

  formulaLeadingIconSlot: {
    width: RESOURCE_FORMULA_LEADING_SLOT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 3,
  },

  formulaSymbol: {
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    marginHorizontal: 3,
  },

  formulaDivider: {
    color: theme.colors.textSecondary ?? theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
    marginLeft: 5,
    marginRight: 3,
  },

  formulaModifier: {
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 17,
  },

  stepper: {
    flexDirection: 'row',
    alignItems: 'stretch',
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.backgroundAlt,
    overflow: 'hidden',
  },

  stepperCell: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepperValueCell: {
    minWidth: 52,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },

  stepperDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
  },

  stepperGlyph: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: -1,
  },

  stepperValueText: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    minWidth: 36,
    padding: 0,
    margin: 0,
    height: 24,
  },

  disabledButton: {
    opacity: 0.5,
  },

  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.92,
  },
})